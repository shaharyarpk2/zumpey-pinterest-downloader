/**
 * PinFlow Pro: Pinterest DOM Scraping & Image Resolution Engine
 * Handles dynamic grid observation, high-res resolution conversion, and metadata scraping.
 */

(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.PinFlowDOM) return;

  const processedElements = new WeakSet();
  const resolvedOutboundCache = new Map(); // pinId -> outbound website URL
  let mutationObserver = null;
  let debounceTimer = null;
  const onNewPinsCallbacks = new Set();

  /**
   * Helper: Extract Pinterest page context (search query, board title, username, page type)
   */
  function getPageContext() {
    const url = new URL(window.location.href);
    const pathname = url.pathname;
    const parts = pathname.split('/').filter(Boolean);
    let query = '';
    let boardName = '';
    let username = '';
    let pageType = 'feed';

    if (pathname.includes('/search/pins/')) {
      query = url.searchParams.get('q') || 'Search';
      pageType = 'search';
    } else if (pathname.startsWith('/pin/')) {
      pageType = 'pin_detail';
      const heading = document.querySelector('h1, [data-test-id="pin-title"]');
      if (heading) query = heading.textContent.trim();
    } else if (parts.length === 1 && !['today', 'settings', 'ideas', 'business', 'messages'].includes(parts[0])) {
      // User Profile Home e.g. /username/
      username = parts[0];
      query = `Account_${username}`;
      pageType = 'profile';
      const nameElem = document.querySelector('h1, [data-test-id="profile-header-title"]');
      if (nameElem) boardName = nameElem.textContent.trim();
    } else if (parts.length === 2 && ['_created', '_saved'].includes(parts[1])) {
      // User Created / Saved pins e.g. /username/_created/
      username = parts[0];
      const section = parts[1] === '_created' ? 'Created' : 'Saved';
      query = `Account_${username}_${section}`;
      pageType = `profile_${parts[1].substring(1)}`;
      boardName = `${username} (${section})`;
    } else if (parts.length >= 2 && !['today', 'settings', 'ideas', 'business'].includes(parts[0])) {
      // Board e.g. /username/board-name/
      username = parts[0];
      const boardSlug = parts[1].replace(/[-_]/g, ' ');
      boardName = boardSlug;
      const boardHeader = document.querySelector('h1, [data-test-id="board-header-title"]');
      if (boardHeader && boardHeader.textContent.trim()) {
        boardName = boardHeader.textContent.trim();
      }
      query = `Board_${boardName.replace(/\s+/g, '_')}`;
      pageType = 'board';
    }

    return { query, boardName, username, pageType, currentUrl: window.location.href };
  }

  /**
   * Clean and decode outbound URLs (strips Pinterest offsite redirects)
   */
  function decodeOutboundUrl(rawUrl) {
    if (!rawUrl) return '';
    try {
      // Handle Pinterest offsite redirect
      if (rawUrl.includes('/offsite/') || rawUrl.includes('url=') || rawUrl.includes('url%3D')) {
        let parsed = null;
        try {
          parsed = new URL(rawUrl, window.location.origin);
        } catch (e) {
          // ignore
        }

        if (parsed && parsed.searchParams.has('url')) {
          const target = parsed.searchParams.get('url');
          if (target) {
            let decoded = decodeURIComponent(target);
            if (decoded.includes('%3A%2F%2F')) {
              decoded = decodeURIComponent(decoded);
            }
            return decoded;
          }
        }

        // Regex fallback for url parameter
        const match = rawUrl.match(/[?&]url=([^&]+)/i);
        if (match && match[1]) {
          let decoded = decodeURIComponent(match[1]);
          if (decoded.includes('%3A%2F%2F')) decoded = decodeURIComponent(decoded);
          return decoded;
        }
      }

      // Handle raw encoded http url embedded in string
      if (rawUrl.includes('http%3A%2F%2F') || rawUrl.includes('https%3A%2F%2F')) {
        const match = rawUrl.match(/(https?%3A%2F%2F[^\s&"']+)/i);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
      }
    } catch (e) {
      console.warn('[PinFlow Pro] URL decode error:', e);
    }
    return rawUrl;
  }

  /**
   * Deeply crawl React Fiber / React Props on DOM node to extract original pin metadata & external link
   */
  function extractFromReactFiber(element) {
    if (!element) return null;

    const nodesToCheck = [
      element,
      element.parentElement,
      element.closest('div[data-grid-item="true"]'),
      element.closest('div[data-test-id="pin"]')
    ].filter(Boolean);

    for (const node of nodesToCheck) {
      try {
        const fiberKey = Object.keys(node).find(
          (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$') || k.startsWith('__reactContainer$')
        );
        if (!fiberKey) continue;

        let fiber = node[fiberKey];
        let depth = 0;

        while (fiber && depth < 20) {
          const props = fiber.memoizedProps || fiber.pendingProps || fiber.props;
          if (props) {
            // Check for direct pin object or nested pin item
            const candidate =
              props.pin ||
              props.data ||
              props.item ||
              props.pinData ||
              props.pinItem ||
              (props.children && props.children.props && (props.children.props.pin || props.children.props.data));

            if (candidate && typeof candidate === 'object') {
              const res = parsePinDataObj(candidate);
              if (res && res.outboundUrl) return res;
            }

            // Direct property checks on props
            const directLink = props.link || props.trackedLink || props.destination_url || props.source_url || props.origin_url;
            if (directLink && typeof directLink === 'string' && directLink.startsWith('http') && !directLink.includes('pinterest.') && !directLink.includes('pinimg.com')) {
              return {
                outboundUrl: decodeOutboundUrl(directLink),
                title: props.title || '',
                originalImageUrl: props.image_large_url || props.images?.orig?.url || ''
              };
            }
          }
          fiber = fiber.return || fiber._debugOwner;
          depth++;
        }
      } catch (err) {
        // Continue if React crawler hits an edge case
      }
    }

    return null;
  }

  /**
   * Parse internal Pinterest pin object
   */
  function parsePinDataObj(pin) {
    if (!pin) return null;

    let outboundUrl = '';
    const possibleLinks = [
      pin.link,
      pin.trackedLink,
      pin.tracked_link,
      pin.destination_url,
      pin.destinationUrl,
      pin.source_url,
      pin.sourceUrl,
      pin.origin_url,
      pin.orig_link,
      pin.nativeCreator?.websiteUrl,
      pin.native_creator_link,
      pin.rich_summary?.site_name
    ];

    for (const link of possibleLinks) {
      if (link && typeof link === 'string' && link.startsWith('http') && !link.includes('pinterest.') && !link.includes('pinimg.com')) {
        outboundUrl = decodeOutboundUrl(link);
        break;
      }
    }

    let originalImageUrl = '';
    if (pin.images && pin.images.orig && pin.images.orig.url) {
      originalImageUrl = pin.images.orig.url;
    } else if (pin.images && pin.images['736x'] && pin.images['736x'].url) {
      originalImageUrl = getOriginalImageUrl(pin.images['736x'].url);
    } else if (pin.image_large_url) {
      originalImageUrl = getOriginalImageUrl(pin.image_large_url);
    }

    return {
      outboundUrl,
      title: pin.title || pin.grid_title || pin.rich_summary?.display_name || '',
      description: pin.description || pin.rich_summary?.display_description || '',
      pinId: pin.id ? String(pin.id) : null,
      originalImageUrl
    };
  }

  /**
   * Extract Outbound Link from DOM tree across card and parent grid item
   */
  function extractOutboundUrlFromDOM(pinElement) {
    if (!pinElement) return '';

    // Search scope covers the card and its outer grid-item container
    const searchScope = pinElement.closest('div[data-grid-item="true"]') || pinElement.parentElement || pinElement;

    // 1. Offsite router links (e.g. /offsite/?url=https%3A%2F%2Fexample.com...)
    const offsiteLinks = Array.from(
      searchScope.querySelectorAll('a[href*="/offsite/"], a[href*="url="], a[href*="url%3D"]')
    );
    for (const a of offsiteLinks) {
      const href = a.getAttribute('href');
      const decoded = decodeOutboundUrl(href);
      if (decoded && decoded.startsWith('http') && !decoded.includes('pinterest.') && !decoded.includes('pinimg.com')) {
        return decoded;
      }
    }

    // 2. Direct external links (target="_blank", rel="nofollow", CTA buttons, etc.)
    const allAnchors = Array.from(searchScope.querySelectorAll('a[href]'));
    for (const a of allAnchors) {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('http') && !href.includes('pinterest.') && !href.includes('pinimg.com')) {
        return decodeOutboundUrl(href);
      }
    }

    // 3. Look for explicit data-test-id outbound CTA elements
    const ctaSelectors = [
      '[data-test-id="pin-link-cta"]',
      '[data-test-id="official-user-attribution"]',
      '[data-test-id="pin-destination-link"]',
      '[data-test-id="source-link"]',
      '[data-test-id="rich-pin-link"]',
      '[data-test-id="pin-action-bar"] a'
    ];
    for (const sel of ctaSelectors) {
      const cta = searchScope.querySelector(sel);
      if (cta) {
        const link = cta.tagName === 'A' ? cta : cta.querySelector('a');
        if (link && link.getAttribute('href')) {
          const decoded = decodeOutboundUrl(link.getAttribute('href'));
          if (decoded && !decoded.includes('pinterest.') && !decoded.includes('pinimg.com')) {
            return decoded;
          }
        }
      }
    }

    // 4. Look for domain pill text (e.g. "boredpanda.com", "nytimes.com") in attribution spans
    const domainTextElems = searchScope.querySelectorAll('div, span, a');
    for (const el of domainTextElems) {
      const txt = (el.textContent || '').trim();
      if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,6}(\/[^\s]*)?$/.test(txt) && !txt.includes('pinterest') && !txt.includes('pinimg')) {
        return `https://${txt}`;
      }
    }

    return '';
  }

  /**
   * Asynchronously resolve exact external website link via direct pin lookup with memory caching
   */
  async function resolvePinOutboundUrl(pinId) {
    if (!pinId) return '';
    if (resolvedOutboundCache.has(pinId)) {
      return resolvedOutboundCache.get(pinId);
    }

    try {
      const resp = await fetch(`/pin/${pinId}/`, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
      const html = await resp.text();

      // Extract full destination URL from pin schema or PWS data
      const linkMatch = html.match(/"(?:link|trackedLink|destinationUrl|sourceUrl|origLink)":"(https?:[^\"]+)"/i);
      if (linkMatch && linkMatch[1]) {
        let clean = linkMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        clean = decodeOutboundUrl(clean);
        if (clean && !clean.includes('pinterest.') && !clean.includes('pinimg.com')) {
          resolvedOutboundCache.set(pinId, clean);
          return clean;
        }
      }

      // Check for domain in HTML if no deep link found
      const domainMatch = html.match(/"domain":"([^"\\]+)"/i);
      if (domainMatch && domainMatch[1] && !domainMatch[1].includes('pinterest') && !domainMatch[1].includes('pinimg')) {
        const domainUrl = `https://${domainMatch[1]}`;
        resolvedOutboundCache.set(pinId, domainUrl);
        return domainUrl;
      }
    } catch (err) {
      console.warn('[PinFlow Pro] Pin resolver error for', pinId, err);
    }

    return '';
  }

  /**
   * Transform Pinterest thumbnail image URL to maximum native resolution (/originals/)
   */
  function getOriginalImageUrl(srcUrl) {
    if (!srcUrl) return '';
    if (srcUrl.includes('pinimg.com')) {
      return srcUrl.replace(/\/(236x|474x|564x|736x|1200x)\//, '/originals/');
    }
    return srcUrl;
  }

  /**
   * Get 736x fallback URL if originals fail
   */
  function getFallbackImageUrl(srcUrl) {
    if (!srcUrl) return '';
    if (srcUrl.includes('pinimg.com')) {
      return srcUrl.replace(/\/(236x|474x|564x|originals|1200x)\//, '/736x/');
    }
    return srcUrl;
  }

  /**
   * Extract pin ID from element or link
   */
  function extractPinId(element) {
    if (element.getAttribute('data-test-pin-id')) {
      return element.getAttribute('data-test-pin-id');
    }

    const searchScope = element.closest('div[data-grid-item="true"]') || element;
    const pinLink = searchScope.querySelector('a[href*="/pin/"]');
    if (pinLink) {
      const match = pinLink.getAttribute('href').match(/\/pin\/(\d+)/);
      if (match && match[1]) return match[1];
    }

    if (element.tagName === 'A' && element.getAttribute('href')) {
      const match = element.getAttribute('href').match(/\/pin\/(\d+)/);
      if (match && match[1]) return match[1];
    }

    return null;
  }

  /**
   * Extract comprehensive metadata from a Pinterest pin card DOM element
   */
  function extractPinData(pinElement) {
    if (!pinElement) return null;

    const pinId = extractPinId(pinElement);
    const pinUrl = pinId ? `https://www.pinterest.com/pin/${pinId}/` : window.location.href;

    // Check cache first
    let outboundUrl = (pinId && resolvedOutboundCache.has(pinId)) ? resolvedOutboundCache.get(pinId) : '';

    // First try React Fiber crawl
    const reactData = extractFromReactFiber(pinElement);
    if (!outboundUrl && reactData?.outboundUrl) {
      outboundUrl = reactData.outboundUrl;
    }

    // Next try DOM search
    if (!outboundUrl) {
      outboundUrl = extractOutboundUrlFromDOM(pinElement);
    }

    // If outbound found, cache it
    if (pinId && outboundUrl && !outboundUrl.includes('pinterest.')) {
      resolvedOutboundCache.set(pinId, outboundUrl);
    }

    // If still empty, fallback to canonical Pinterest Pin URL
    if (!outboundUrl) {
      outboundUrl = pinUrl;
    }

    // Find the main image element
    const img = pinElement.querySelector('img');
    let rawImgSrc = '';
    let altText = '';

    if (img) {
      rawImgSrc = img.currentSrc || img.src || img.getAttribute('src') || '';
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const candidates = srcset.split(',').map((s) => s.trim().split(' '));
        if (candidates.length > 0) {
          const highest = candidates[candidates.length - 1][0];
          if (highest) rawImgSrc = highest;
        }
      }
      altText = img.getAttribute('alt') || '';
    }

    // Image URLs
    const originalImageUrl = reactData?.originalImageUrl || getOriginalImageUrl(rawImgSrc);
    const fallbackImageUrl = getFallbackImageUrl(rawImgSrc);

    // Extract Title & Description
    let title = reactData?.title || '';
    if (!title) {
      const titleElem = pinElement.querySelector('[data-test-id="pin-title"], h2, h3, [role="heading"]');
      if (titleElem && titleElem.textContent.trim()) {
        title = titleElem.textContent.trim();
      } else if (altText && altText.length > 0 && altText.length < 150) {
        title = altText;
      } else if (pinId) {
        title = `Pinterest Pin ${pinId}`;
      } else {
        title = 'Pinterest Image';
      }
    }

    let description = reactData?.description || '';
    if (!description) {
      const descElem = pinElement.querySelector(
        '[data-test-id="pin-description"], [data-test-id="rich-pin-desc"], [data-test-id="truncated-description"]'
      );
      if (descElem && descElem.textContent.trim()) {
        description = descElem.textContent.trim();
      } else if (altText && altText !== title) {
        description = altText;
      }
    }

    const context = getPageContext();

    return {
      pinId: pinId || reactData?.pinId || null,
      pinUrl,
      title: title.replace(/[\r\n\t]+/g, ' ').trim(),
      description: description.replace(/[\r\n\t]+/g, ' ').trim(),
      originalImageUrl,
      fallbackImageUrl,
      thumbnailUrl: rawImgSrc,
      outboundUrl,
      boardName: context.boardName || '',
      query: context.query || '',
      dateExtracted: new Date().toLocaleString(),
      element: pinElement
    };
  }

  /**
   * Locate all pin card elements in the current viewport/page
   */
  function findPinCardElements() {
    const cards = [];

    // 1. Prioritize direct pin cards
    const pinElements = document.querySelectorAll(
      'div[data-test-id="pin"], div[data-test-id="pin-wrapper"], div[data-test-id="pinrep-source"]'
    );
    pinElements.forEach((el) => {
      if (el.querySelector('img') && !cards.includes(el)) {
        cards.push(el);
      }
    });

    // 2. Also check grid items / list items and extract their inner pin card
    const gridItems = document.querySelectorAll('div[data-grid-item="true"], div[role="listitem"]');
    gridItems.forEach((gridItem) => {
      const innerCard =
        gridItem.querySelector('div[data-test-id="pin"], div[data-test-id="pin-wrapper"]') ||
        gridItem.querySelector('img')?.closest('div');
      if (innerCard && !cards.includes(innerCard)) {
        cards.push(innerCard);
      }
    });

    // 3. Fallback search if still empty
    if (cards.length === 0) {
      const allImgs = document.querySelectorAll('img[src*="pinimg.com"]');
      allImgs.forEach((img) => {
        const pinContainer = img.closest('div[data-test-id="pin"], div[role="listitem"], a[href*="/pin/"]');
        if (pinContainer && !cards.includes(pinContainer)) {
          cards.push(pinContainer);
        }
      });
    }

    return cards;
  }

  /**
   * Scan page and emit new pin cards to subscribers
   */
  function scanAndNotify() {
    const pinCards = findPinCardElements();
    const newCards = [];

    pinCards.forEach((card) => {
      if (!processedElements.has(card)) {
        processedElements.add(card);
        newCards.push(card);
      }
    });

    if (newCards.length > 0) {
      onNewPinsCallbacks.forEach((cb) => {
        try {
          cb(newCards);
        } catch (e) {
          console.error('[PinFlow Pro] Callback error:', e);
        }
      });
    }
  }

  /**
   * Initialize MutationObserver to monitor infinite scrolling and dynamic updates
   */
  function initObserver(onNewPinsCallback) {
    if (onNewPinsCallback) {
      onNewPinsCallbacks.add(onNewPinsCallback);
    }

    if (!mutationObserver) {
      mutationObserver = new MutationObserver((mutations) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          scanAndNotify();
        }, 150);
      });

      mutationObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });

      scanAndNotify();
    }

    return () => {
      if (onNewPinsCallback) {
        onNewPinsCallbacks.delete(onNewPinsCallback);
      }
    };
  }

  // Public API
  window.PinFlowDOM = {
    initObserver,
    extractPinData,
    findPinCardElements,
    getPageContext,
    decodeOutboundUrl,
    extractOutboundUrlFromDOM,
    extractFromReactFiber,
    resolvePinOutboundUrl,
    getOriginalImageUrl,
    getFallbackImageUrl
  };

  console.log('[PinFlow Pro] Pinterest DOM Observer initialized with Real Outbound Link Resolver.');
})();
