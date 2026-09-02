/**
 * Zumpey.com: Advanced Pinterest Batch Extractor & Downloader
 * Content Script: Sequential Selection, Full Board/Account Auto-Harvesting & Floating HUD
 */

(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.PinFlowContentScriptLoaded) return;
  window.PinFlowContentScriptLoaded = true;

  // State Management
  const state = {
    selectedPins: [], // Array of ordered pin objects { element, data, index }
    settings: {
      showFloatingBar: true,
      autoRenumber: true,
      exportFormat: 'xlsx',
      downloadDelayMs: 300
    },
    isDownloading: false,
    isHarvesting: false,
    isHarvestPaused: false,
    harvestInterval: null,
    floatingBarMinimized: false
  };

  // SVGs for Icons
  const ICONS = {
    download: `<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    selectAll: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm-4 8H7v-2h6v2z"/></svg>`,
    harvest: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>`,
    clear: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
    minimize: `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
    info: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`
  };

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
      if (res && res.settings) {
        state.settings = { ...state.settings, ...res.settings };
      }
    } catch (e) {
      console.warn('[Zumpey.com] Could not reach background worker:', e);
    }
  }

  /**
   * Toast notification HUD
   */
  function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('pinflow-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pinflow-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pinflow-toast';

    let iconSvg = ICONS.info;
    if (type === 'success') iconSvg = ICONS.check;
    else if (type === 'error') iconSvg = ICONS.clear;

    toast.innerHTML = `
      <div class="pinflow-toast-icon ${type}">
        ${iconSvg}
      </div>
      <div class="pinflow-toast-message">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  /**
   * Synchronize visual badge and selected class on a pin element with state.selectedPins
   */
  function syncCardWithSelection(pinElement) {
    if (!pinElement || !window.PinFlowDOM) return;
    const pinData = window.PinFlowDOM.extractPinData(pinElement);
    if (!pinData) return;

    const existing = state.selectedPins.find((p) => {
      if (!p.data) return false;
      if (pinData.pinId && p.data.pinId && p.data.pinId === pinData.pinId) return true;
      if (pinData.originalImageUrl && p.data.originalImageUrl && p.data.originalImageUrl === pinData.originalImageUrl) return true;
      if (pinData.pinUrl && p.data.pinUrl && p.data.pinUrl === pinData.pinUrl) return true;
      return false;
    });

    const orderBadge = pinElement.querySelector('.pinflow-order-badge');
    if (existing) {
      existing.element = pinElement;
      pinElement.classList.add('pinflow-selected');
      if (orderBadge) {
        orderBadge.classList.add('active');
        orderBadge.textContent = `#${existing.index}`;
      }
    } else {
      pinElement.classList.remove('pinflow-selected');
      if (orderBadge) {
        orderBadge.classList.remove('active');
        orderBadge.textContent = '+';
      }
    }
  }

  /**
   * Setup interactive overlays on newly detected pin cards
   */
  function processPinCard(pinElement) {
    if (!pinElement) return;
    if (pinElement.dataset.pinflowAttached) {
      syncCardWithSelection(pinElement);
      return;
    }
    pinElement.dataset.pinflowAttached = 'true';
    pinElement.classList.add('pinflow-pin-container');

    // 1. Create Top-Left Order Badge Wrapper
    const badgeWrapper = document.createElement('div');
    badgeWrapper.className = 'pinflow-badge-wrapper';

    const orderBadge = document.createElement('div');
    orderBadge.className = 'pinflow-order-badge';
    orderBadge.textContent = '+';
    orderBadge.title = 'Click to select in sequence';

    badgeWrapper.appendChild(orderBadge);
    pinElement.appendChild(badgeWrapper);

    // If card is a video / reel, display video pill badge
    const pinData = window.PinFlowDOM ? window.PinFlowDOM.extractPinData(pinElement) : null;
    if (pinData && pinData.isVideo) {
      const videoPill = document.createElement('div');
      videoPill.className = 'pinflow-video-pill';
      videoPill.title = 'Pinterest Video / Reel (1080p MP4)';
      videoPill.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <span>1080p MP4</span>
      `;
      pinElement.appendChild(videoPill);
    }

    // 2. Create Top-Right Action Container
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'pinflow-pin-actions';

    // Quick Download Button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'pinflow-action-btn';
    downloadBtn.setAttribute('data-tooltip', pinData?.isVideo ? 'Download 1080p MP4 Video' : 'Download Original HD');
    downloadBtn.innerHTML = ICONS.download;
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleQuickDownload(pinElement);
    });

    // Copy Outbound Link Button
    const copyLinkBtn = document.createElement('button');
    copyLinkBtn.className = 'pinflow-action-btn';
    copyLinkBtn.setAttribute('data-tooltip', 'Copy Outbound Link');
    copyLinkBtn.innerHTML = ICONS.copy;
    copyLinkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleCopyOutboundLink(pinElement);
    });

    actionsWrapper.appendChild(downloadBtn);
    actionsWrapper.appendChild(copyLinkBtn);
    pinElement.appendChild(actionsWrapper);

    // 3. Selection Event Listener on Badge
    badgeWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      togglePinSelection(pinElement);
    });

    // 4. Synchronize selection state
    syncCardWithSelection(pinElement);
  }

  /**
   * Handle single quick download from card hover action
   */
  async function handleQuickDownload(pinElement) {
    if (!window.PinFlowDOM) return;
    const pinData = window.PinFlowDOM.extractPinData(pinElement);
    if (!pinData) {
      showToast('Could not extract pin information.', 'error');
      return;
    }

    if (pinData.isVideo && !pinData.videoUrl && pinData.pinId) {
      showToast('Resolving 1080p MP4 stream...', 'info', 1200);
      const vUrl = await window.PinFlowDOM.resolvePinVideoUrl(pinData.pinId);
      if (vUrl) {
        pinData.videoUrl = vUrl;
        pinData.originalImageUrl = vUrl;
      }
    }

    showToast(`Downloading: ${pinData.title.substring(0, 30)}...`, 'info', 2000);

    try {
      const res = await chrome.runtime.sendMessage({
        action: 'SINGLE_DOWNLOAD',
        pinData: {
          ...pinData,
          index: 1,
          element: undefined
        }
      });

      if (res && res.success) {
        showToast(pinData.isVideo ? 'Video MP4 download started!' : 'HD Image download started!', 'success');
      } else {
        showToast(`Download failed: ${res?.error || 'Unknown'}`, 'error');
      }
    } catch (err) {
      showToast('Error communicating with background downloader.', 'error');
    }
  }

  /**
   * Handle copy outbound / destination link to clipboard
   */
  async function handleCopyOutboundLink(pinElement) {
    if (!window.PinFlowDOM) return;
    const pinData = window.PinFlowDOM.extractPinData(pinElement);
    if (!pinData) return;

    let urlToCopy = pinData.outboundUrl || '';

    // If outbound link is not resolved to an external site yet, resolve it directly
    if (!urlToCopy || urlToCopy.includes('pinterest.com/pin/')) {
      showToast('Resolving external website link...', 'info', 1200);
      const resolved = await window.PinFlowDOM.resolvePinOutboundUrl(pinData.pinId);
      if (resolved) {
        urlToCopy = resolved;
        pinData.outboundUrl = resolved;
      } else {
        urlToCopy = pinData.pinUrl;
      }
    }

    try {
      await navigator.clipboard.writeText(urlToCopy);
      showToast(`Copied: ${urlToCopy.substring(0, 45)}...`, 'success', 3500);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = urlToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(`Copied external link!`, 'success', 3000);
    }
  }

  /**
   * Save current selected pins into chrome.storage.local for persistence across page refreshes
   */
  async function persistSelections() {
    try {
      const serializable = state.selectedPins.map((item, idx) => ({
        data: {
          pinId: item.data?.pinId,
          pinUrl: item.data?.pinUrl,
          title: item.data?.title,
          description: item.data?.description,
          originalImageUrl: item.data?.originalImageUrl,
          fallbackImageUrl: item.data?.fallbackImageUrl,
          thumbnailUrl: item.data?.thumbnailUrl,
          outboundUrl: item.data?.outboundUrl,
          isVideo: !!item.data?.isVideo,
          videoUrl: item.data?.videoUrl,
          boardName: item.data?.boardName,
          query: item.data?.query,
          dateExtracted: item.data?.dateExtracted
        },
        index: idx + 1
      }));
      await chrome.storage.local.set({ 'zumpey_persisted_selections': serializable });
    } catch (e) {
      console.warn('[Zumpey.com] Error persisting selections:', e);
    }
  }

  /**
   * Restore persistent selections from storage
   */
  async function restoreSavedSelections() {
    try {
      const res = await chrome.storage.local.get('zumpey_persisted_selections');
      const saved = res?.zumpey_persisted_selections;
      if (saved && Array.isArray(saved) && saved.length > 0) {
        state.selectedPins = saved.map((item) => ({
          element: null,
          data: item.data,
          index: item.index
        }));

        // Reconnect any already rendered DOM elements
        if (window.PinFlowDOM) {
          const allCards = window.PinFlowDOM.findPinCardElements();
          allCards.forEach((card) => {
            processPinCard(card);
          });
        }

        renumberSelectionBadges();
        updateFloatingBar();
      }
    } catch (e) {
      console.warn('[Zumpey.com] Error restoring saved selections:', e);
    }
  }

  /**
   * Toggle pin selection & maintain strict contiguous sequence order (#1, #2, ...)
   */
  function togglePinSelection(pinElement) {
    if (!window.PinFlowDOM) return;
    const existingIndex = state.selectedPins.findIndex((p) => p.element === pinElement);

    if (existingIndex > -1) {
      // Remove from selection
      state.selectedPins.splice(existingIndex, 1);
      pinElement.classList.remove('pinflow-selected');
      const badge = pinElement.querySelector('.pinflow-order-badge');
      if (badge) {
        badge.classList.remove('active');
        badge.textContent = '+';
      }
    } else {
      // Add to selection
      const pinData = window.PinFlowDOM.extractPinData(pinElement);
      if (pinData) {
        state.selectedPins.push({
          element: pinElement,
          data: pinData,
          index: state.selectedPins.length + 1
        });
        pinElement.classList.add('pinflow-selected');

        // Pre-resolve external link in background
        if (pinData.pinId && (!pinData.outboundUrl || pinData.outboundUrl.includes('pinterest.com/pin/'))) {
          window.PinFlowDOM.resolvePinOutboundUrl(pinData.pinId).then((res) => {
            if (res) pinData.outboundUrl = res;
          });
        }
      }
    }

    renumberSelectionBadges();
    updateFloatingBar();
    persistSelections();
  }

  /**
   * Recalculate badge numbers (1 to N)
   */
  function renumberSelectionBadges() {
    state.selectedPins.forEach((item, idx) => {
      const orderNum = idx + 1;
      item.index = orderNum;
      if (item.data) item.data.index = orderNum;

      if (item.element) {
        const badge = item.element.querySelector('.pinflow-order-badge');
        if (badge) {
          badge.classList.add('active');
          badge.textContent = `#${orderNum}`;
        }
      }
    });
  }

  /**
   * Select all visible pin cards currently in the viewport/DOM (with optional toast)
   */
  function selectAllVisible(showToastMsg = true) {
    if (!window.PinFlowDOM) return;
    const allCards = window.PinFlowDOM.findPinCardElements();
    let newlyAdded = 0;

    allCards.forEach((card) => {
      processPinCard(card);
      const isAlreadySelected = state.selectedPins.some((p) => p.element === card || (p.data?.pinId && p.data.pinId === card.dataset?.pinflowPinId));
      if (!isAlreadySelected) {
        const pinData = window.PinFlowDOM.extractPinData(card);
        if (pinData) {
          state.selectedPins.push({
            element: card,
            data: pinData,
            index: state.selectedPins.length + 1
          });
          card.classList.add('pinflow-selected');
          newlyAdded++;

          if (pinData.pinId && (!pinData.outboundUrl || pinData.outboundUrl.includes('pinterest.com/pin/'))) {
            window.PinFlowDOM.resolvePinOutboundUrl(pinData.pinId).then((res) => {
              if (res) pinData.outboundUrl = res;
            });
          }
        }
      }
    });

    renumberSelectionBadges();
    updateFloatingBar();
    persistSelections();
    if (showToastMsg) {
      showToast(`Selected ${state.selectedPins.length} pins.`, 'info');
    }
  }

  function selectAllVisibleSilently() {
    selectAllVisible(false);
  }

  /**
   * Clear all selected pins
   */
  async function clearSelection() {
    state.selectedPins.forEach((item) => {
      if (item.element) {
        item.element.classList.remove('pinflow-selected');
        const badge = item.element.querySelector('.pinflow-order-badge');
        if (badge) {
          badge.classList.remove('active');
          badge.textContent = '+';
        }
      }
    });

    state.selectedPins = [];
    try {
      await chrome.storage.local.remove('zumpey_persisted_selections');
    } catch (e) {}

    updateFloatingBar();
    showToast('Selection cleared.', 'info', 1500);
  }

  /**
   * Resolve any selected pins whose outbound URL or Video stream is still unresolved
   */
  async function resolveSelectedPinsLinks(selectedList) {
    if (!window.PinFlowDOM || !selectedList || selectedList.length === 0) return;

    await Promise.all(
      selectedList.map(async (p) => {
        const pinId = p.data?.pinId;
        if (!pinId) return;

        // 1. Resolve outbound destination link
        if (!p.data.outboundUrl || p.data.outboundUrl.includes('pinterest.com/pin/')) {
          if (window.PinFlowDOM.resolvePinOutboundUrl) {
            const resolved = await window.PinFlowDOM.resolvePinOutboundUrl(pinId);
            if (resolved) p.data.outboundUrl = resolved;
          }
        }

        // 2. Resolve 1080p MP4 Video stream if video pin
        if (p.data.isVideo && !p.data.videoUrl) {
          if (window.PinFlowDOM.resolvePinVideoUrl) {
            const vUrl = await window.PinFlowDOM.resolvePinVideoUrl(pinId);
            if (vUrl) {
              p.data.videoUrl = vUrl;
              p.data.originalImageUrl = vUrl;
            }
          }
        }
      })
    );
  }

  /**
   * Copy all selected outbound links to clipboard
   */
  async function copyAllSelectedLinks() {
    if (state.selectedPins.length === 0) {
      showToast('Select at least one pin first.', 'error');
      return;
    }

    showToast('Resolving external website links...', 'info', 1200);
    await resolveSelectedPinsLinks(state.selectedPins);

    const links = state.selectedPins
      .map((p, idx) => `${idx + 1}. ${p.data.outboundUrl || p.data.pinUrl}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(links);
      showToast(`Copied ${state.selectedPins.length} external website links!`, 'success', 3500);
    } catch (err) {
      showToast('Failed to copy links.', 'error');
    }
  }

  // =========================================================================
  // Live On-Screen Download Progress Modal & HUD
  // =========================================================================

  function showDownloadModal(totalCount, queryTitle) {
    let modal = document.getElementById('zumpey-download-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'zumpey-download-modal';
      modal.innerHTML = `
        <div class="download-modal-card">
          <div class="download-modal-header" id="zumpey-dl-header">
            <div class="download-spinner-ring" id="zumpey-dl-spinner">
              <span class="download-percent-text" id="zumpey-dl-percent">0%</span>
            </div>
            <div class="download-modal-title-wrap">
              <h4 id="zumpey-dl-title">Downloading Pins Batch...</h4>
              <span class="download-modal-subtitle" id="zumpey-dl-subtitle">Saving high-resolution images & links</span>
            </div>
          </div>

          <div class="download-progress-bar-container">
            <div class="download-progress-fill" id="zumpey-dl-fill" style="width: 0%;"></div>
          </div>

          <div class="download-modal-footer">
            <div class="download-counts">
              <span>Progress: <strong id="zumpey-dl-count">0 / ${totalCount}</strong></span>
            </div>
            <div class="download-modal-ctrl-btns">
              <button class="download-ctrl-btn pause" id="zumpey-dl-pause" title="Pause or Resume batch download">⏸ Pause</button>
              <button class="download-ctrl-btn cancel" id="zumpey-dl-cancel" title="Stop & Cancel download">⏹ Cancel</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const pauseBtn = document.getElementById('zumpey-dl-pause');
      pauseBtn.addEventListener('click', () => {
        if (!state.currentSessionId) return;
        state.isDownloadPaused = !state.isDownloadPaused;
        if (state.isDownloadPaused) {
          chrome.runtime.sendMessage({ action: 'PAUSE_BATCH', sessionId: state.currentSessionId });
          pauseBtn.textContent = '▶ Resume';
          pauseBtn.classList.add('resumed');
          const sub = document.getElementById('zumpey-dl-subtitle');
          if (sub) sub.textContent = '⏸ Download Paused';
          const spinner = document.getElementById('zumpey-dl-spinner');
          if (spinner) spinner.style.animationPlayState = 'paused';
          showToast('Download paused.', 'info', 1500);
        } else {
          chrome.runtime.sendMessage({ action: 'RESUME_BATCH', sessionId: state.currentSessionId });
          pauseBtn.textContent = '⏸ Pause';
          pauseBtn.classList.remove('resumed');
          const sub = document.getElementById('zumpey-dl-subtitle');
          if (sub) sub.textContent = 'Saving high-resolution images & links';
          const spinner = document.getElementById('zumpey-dl-spinner');
          if (spinner) spinner.style.animationPlayState = 'running';
          showToast('Download resumed.', 'info', 1500);
        }
      });

      document.getElementById('zumpey-dl-cancel').addEventListener('click', () => {
        if (state.currentSessionId) {
          chrome.runtime.sendMessage({ action: 'CANCEL_BATCH', sessionId: state.currentSessionId });
        }
        state.isDownloading = false;
        state.isDownloadPaused = false;
        hideDownloadModal();
        updateFloatingBar();
        showToast('Download stopped & cancelled.', 'info', 2500);
      });
    }

    state.isDownloadPaused = false;
    const titleElem = document.getElementById('zumpey-dl-title');
    const headerElem = document.getElementById('zumpey-dl-header');
    const fillElem = document.getElementById('zumpey-dl-fill');
    const percentElem = document.getElementById('zumpey-dl-percent');
    const countElem = document.getElementById('zumpey-dl-count');
    const subtitleElem = document.getElementById('zumpey-dl-subtitle');
    const pauseBtn = document.getElementById('zumpey-dl-pause');
    const spinner = document.getElementById('zumpey-dl-spinner');

    if (titleElem) titleElem.textContent = `Downloading ${queryTitle || 'Pins'}...`;
    if (subtitleElem) subtitleElem.textContent = 'Saving high-resolution images & links';
    if (headerElem) headerElem.classList.remove('completed');
    if (fillElem) {
      fillElem.classList.remove('completed');
      fillElem.style.width = '0%';
    }
    if (percentElem) percentElem.textContent = '0%';
    if (countElem) countElem.textContent = `0 / ${totalCount}`;
    if (pauseBtn) {
      pauseBtn.textContent = '⏸ Pause';
      pauseBtn.classList.remove('resumed');
      pauseBtn.style.display = 'inline-flex';
    }
    if (spinner) spinner.style.animationPlayState = 'running';

    modal.classList.add('active');
  }

  function updateDownloadModal(completed, total, percent) {
    const fillElem = document.getElementById('zumpey-dl-fill');
    const percentElem = document.getElementById('zumpey-dl-percent');
    const countElem = document.getElementById('zumpey-dl-count');

    if (fillElem) fillElem.style.width = `${percent}%`;
    if (percentElem) percentElem.textContent = `${percent}%`;
    if (countElem) countElem.textContent = `${completed} / ${total}`;
  }

  function completeDownloadModal(completed, folderName) {
    const titleElem = document.getElementById('zumpey-dl-title');
    const subtitleElem = document.getElementById('zumpey-dl-subtitle');
    const headerElem = document.getElementById('zumpey-dl-header');
    const fillElem = document.getElementById('zumpey-dl-fill');
    const percentElem = document.getElementById('zumpey-dl-percent');
    const pauseBtn = document.getElementById('zumpey-dl-pause');

    if (titleElem) titleElem.textContent = `🎉 Download Complete!`;
    if (subtitleElem) subtitleElem.textContent = `${completed} pins saved in ${folderName || 'Downloads'}`;
    if (headerElem) headerElem.classList.add('completed');
    if (fillElem) {
      fillElem.classList.add('completed');
      fillElem.style.width = '100%';
    }
    if (percentElem) percentElem.textContent = `✓`;
    if (pauseBtn) pauseBtn.style.display = 'none';

    setTimeout(() => {
      hideDownloadModal();
    }, 4500);
  }

  function hideDownloadModal() {
    const modal = document.getElementById('zumpey-download-modal');
    if (modal) modal.classList.remove('active');
  }

  /**
   * Trigger batch download through background service worker
   */
  async function startBatchDownload() {
    if (state.selectedPins.length === 0) {
      showToast('Please select pins before starting download.', 'error');
      return;
    }

    if (state.isDownloading) {
      showToast('A download is already in progress.', 'info');
      return;
    }

    state.isDownloading = true;
    updateFloatingBar();

    const context = window.PinFlowDOM ? window.PinFlowDOM.getPageContext() : {};
    const totalPins = state.selectedPins.length;
    const queryName = context.boardName || context.query || 'Pins';

    // Launch live progress modal
    showDownloadModal(totalPins, queryName);

    showToast(`Resolving outbound links for ${totalPins} pins...`, 'info', 1200);
    await resolveSelectedPinsLinks(state.selectedPins);

    const pinsPayload = state.selectedPins.map((p) => p.data);

    try {
      const res = await chrome.runtime.sendMessage({
        action: 'BATCH_DOWNLOAD',
        pins: pinsPayload,
        batchMetadata: {
          query: context.query || 'Pins',
          boardName: context.boardName || 'Board',
          totalCount: pinsPayload.length
        }
      });

      if (res && res.success) {
        state.currentSessionId = res.sessionId;
      } else {
        state.isDownloading = false;
        hideDownloadModal();
        updateFloatingBar();
        showToast(`Failed to start batch: ${res?.error || 'Unknown'}`, 'error');
      }
    } catch (err) {
      state.isDownloading = false;
      hideDownloadModal();
      updateFloatingBar();
      showToast('Error initiating batch download.', 'error');
    }
  }

  // =========================================================================
  // Full Board / Full Account Auto-Fetching & Continuous Scraper Engine
  // =========================================================================

  function togglePauseAutoHarvest() {
    if (!state.isHarvesting) return;

    const pauseBtn = document.getElementById('harvest-btn-pause');
    const spinner = document.getElementById('harvest-hud-spinner');
    const statusSpan = document.getElementById('harvest-hud-status');

    if (!state.isHarvestPaused) {
      state.isHarvestPaused = true;
      if (pauseBtn) {
        pauseBtn.className = 'harvest-btn resume';
        pauseBtn.innerHTML = '▶ Resume';
      }
      if (spinner) spinner.classList.add('paused');
      if (statusSpan) {
        statusSpan.innerHTML = `<span style="color: #fbbf24; font-weight: 700;">⏸ Auto-fetch Paused (${state.selectedPins.length} pins collected)</span>`;
      }
      showToast('Auto-fetching paused.', 'info', 2000);
    } else {
      state.isHarvestPaused = false;
      if (pauseBtn) {
        pauseBtn.className = 'harvest-btn pause';
        pauseBtn.innerHTML = '⏸ Pause';
      }
      if (spinner) spinner.classList.remove('paused');
      if (statusSpan) {
        statusSpan.innerHTML = `Auto-scrolling & fetching: <strong id="harvest-hud-count">${state.selectedPins.length} pins</strong>`;
      }
      showToast('Resuming auto-fetch...', 'info', 1500);
    }
  }

  function startAutoHarvest(customTitle = '') {
    if (state.isHarvesting) {
      stopAutoHarvest();
      return;
    }
    state.isHarvesting = true;
    state.isHarvestPaused = false;

    const context = window.PinFlowDOM ? window.PinFlowDOM.getPageContext() : {};
    let titleText = customTitle;
    if (!titleText) {
      if (context.pageType === 'board') {
        titleText = `Fetching Board: ${context.boardName || 'Board'}`;
      } else if (context.pageType && context.pageType.startsWith('profile')) {
        titleText = `Fetching Account: @${context.username || 'Account'}`;
      } else {
        titleText = 'Auto-Fetching All Pins...';
      }
    }

    createOrShowHarvestHUD(titleText);
    showToast(`Started auto-fetching pins. Scrolling through feed...`, 'info', 2500);

    let lastScrollY = window.scrollY;
    let lastPinCount = state.selectedPins.length;
    let staleCount = 0;
    const MAX_STALE_ATTEMPTS = 18; // 12-15 seconds of patient waiting for slow connections

    // Initial immediate collect
    selectAllVisibleSilently();
    updateHarvestHUD();

    state.harvestInterval = setInterval(() => {
      if (!state.isHarvesting) {
        clearInterval(state.harvestInterval);
        return;
      }

      // If user paused, skip scrolling and harvesting
      if (state.isHarvestPaused) {
        return;
      }

      // Collect all visible pins into selection
      selectAllVisibleSilently();
      const currentPinCount = state.selectedPins.length;
      updateHarvestHUD();

      // Check if new pins were discovered
      const hasNewPins = currentPinCount > lastPinCount;
      if (hasNewPins) {
        lastPinCount = currentPinCount;
        staleCount = 0;
        const statusSpan = document.getElementById('harvest-hud-status');
        if (statusSpan) {
          statusSpan.innerHTML = `Auto-scrolling & fetching: <strong id="harvest-hud-count">${currentPinCount} pins</strong>`;
        }
      }

      // Check scroll progress and bottom boundaries
      const currentScrollY = window.scrollY;
      const atBottom = window.innerHeight + window.scrollY >= (document.documentElement.scrollHeight - 120);
      const isScrollStuck = Math.abs(currentScrollY - lastScrollY) < 15;

      if (atBottom || isScrollStuck || !hasNewPins) {
        staleCount++;

        // Micro-jiggle scroll to trigger Pinterest's React Virtualized list & IntersectionObserver
        if (staleCount % 3 === 0) {
          window.scrollBy({ top: -140, behavior: 'smooth' });
          setTimeout(() => {
            if (state.isHarvesting && !state.isHarvestPaused) {
              window.scrollBy({ top: 900, behavior: 'smooth' });
              window.dispatchEvent(new Event('scroll'));
            }
          }, 200);
        } else {
          window.scrollBy({ top: 850, behavior: 'smooth' });
        }

        // Live network waiting status on HUD
        const statusSpan = document.getElementById('harvest-hud-status');
        if (statusSpan) {
          statusSpan.innerHTML = `<span style="color: #fbbf24;">⏳ Waiting for network stream... (${staleCount}/${MAX_STALE_ATTEMPTS})</span> | <strong id="harvest-hud-count">${currentPinCount} pins</strong>`;
        }

        // Only finish when all 18 attempts have yielded 0 new pins
        if (staleCount >= MAX_STALE_ATTEMPTS) {
          stopAutoHarvest();
        }
      } else {
        staleCount = 0;
        window.scrollBy({ top: 850, behavior: 'smooth' });
      }

      lastScrollY = window.scrollY;
    }, 700);
  }

  function stopAutoHarvest() {
    if (!state.isHarvesting) return;
    state.isHarvesting = false;
    state.isHarvestPaused = false;
    if (state.harvestInterval) {
      clearInterval(state.harvestInterval);
      state.harvestInterval = null;
    }

    const pauseBtn = document.getElementById('harvest-btn-pause');
    if (pauseBtn) {
      pauseBtn.className = 'harvest-btn pause';
      pauseBtn.innerHTML = '⏸ Pause';
    }

    const spinner = document.getElementById('harvest-hud-spinner');
    if (spinner) spinner.classList.remove('paused');

    hideHarvestHUD();
    selectAllVisibleSilently();
    updateFloatingBar();

    if (state.selectedPins.length > 0) {
      showToast(`Successfully fetched ${state.selectedPins.length} pins! Click "Download Batch" when ready.`, 'success', 5000);
    } else {
      showToast(`Fetching stopped with 0 pins collected.`, 'info', 2500);
    }
  }

  function createOrShowHarvestHUD(title) {
    let hud = document.getElementById('zumpey-harvest-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'zumpey-harvest-hud';
      hud.innerHTML = `
        <div class="harvest-header">
          <div class="harvest-spinner" id="harvest-hud-spinner"></div>
          <div class="harvest-info">
            <span class="harvest-title" id="harvest-hud-title">${escapeHtml(title)}</span>
            <span class="harvest-stats" id="harvest-hud-status">Auto-scrolling & fetching: <strong id="harvest-hud-count">0 pins</strong></span>
          </div>
        </div>
        <div class="harvest-actions">
          <button id="harvest-btn-pause" class="harvest-btn pause" title="Pause / Resume Auto-Scrolling">⏸ Pause</button>
          <button id="harvest-btn-stop" class="harvest-btn primary" title="Stop & Keep All Collected Pins">⏹ Stop & Keep (<span id="harvest-btn-count">0</span>)</button>
          <button id="harvest-btn-cancel" class="harvest-btn secondary" title="Cancel and Clear">✖ Cancel</button>
        </div>
      `;
      document.body.appendChild(hud);

      document.getElementById('harvest-btn-pause').addEventListener('click', togglePauseAutoHarvest);
      document.getElementById('harvest-btn-stop').addEventListener('click', () => {
        stopAutoHarvest();
      });
      document.getElementById('harvest-btn-cancel').addEventListener('click', () => {
        clearSelection();
        stopAutoHarvest();
      });
    }

    const titleElem = document.getElementById('harvest-hud-title');
    if (titleElem) titleElem.textContent = title;

    const pauseBtn = document.getElementById('harvest-btn-pause');
    if (pauseBtn) {
      pauseBtn.className = 'harvest-btn pause';
      pauseBtn.innerHTML = '⏸ Pause';
    }

    const spinner = document.getElementById('harvest-hud-spinner');
    if (spinner) spinner.classList.remove('paused');

    hud.classList.add('active');
    updateHarvestHUD();
  }

  function updateHarvestHUD() {
    const count = state.selectedPins.length;
    const countSpan = document.getElementById('harvest-hud-count');
    const btnCount = document.getElementById('harvest-btn-count');
    if (countSpan) countSpan.textContent = `${count} pins`;
    if (btnCount) btnCount.textContent = count;
  }

  function hideHarvestHUD() {
    const hud = document.getElementById('zumpey-harvest-hud');
    if (hud) hud.classList.remove('active');
  }

  /**
   * Build Floating Draggable Glassmorphic Control Bar
   */
  function createFloatingBar() {
    if (document.getElementById('pinflow-floating-bar')) return;

    const context = window.PinFlowDOM ? window.PinFlowDOM.getPageContext() : {};

    let harvestBtnText = 'Auto-Fetch All';
    if (context.pageType === 'board') {
      harvestBtnText = 'Fetch Full Board';
    } else if (context.pageType && context.pageType.startsWith('profile')) {
      harvestBtnText = 'Fetch Full Account';
    }

    const dock = document.createElement('div');
    dock.id = 'pinflow-floating-bar';

    dock.innerHTML = `
      <div class="pinflow-dock-progress" id="pinflow-dock-progress-wrap">
        <div class="pinflow-dock-progress-bar" id="pinflow-dock-progress-bar"></div>
      </div>
      <div class="pinflow-dock-brand">
        <div class="pinflow-brand-logo">Z</div>
        <span class="pinflow-brand-name">Zumpey.com</span>
      </div>
      <div class="pinflow-count-pill" id="pinflow-count-pill">
        <span class="pinflow-count-number" id="pinflow-count-num">0</span> Selected
      </div>
      <button class="pinflow-dock-btn pinflow-dock-btn-harvest" id="pinflow-btn-harvest" title="Auto-scroll and fetch all pins into selection">
        ${ICONS.harvest}
        <span id="pinflow-harvest-label">${harvestBtnText}</span>
      </button>
      <button class="pinflow-dock-btn" id="pinflow-btn-select-all" title="Select all visible pins">
        ${ICONS.selectAll}
        <span>Select Visible</span>
      </button>
      <button class="pinflow-dock-btn" id="pinflow-btn-clear" title="Clear selection">
        ${ICONS.clear}
        <span>Clear</span>
      </button>
      <button class="pinflow-dock-btn pinflow-dock-btn-primary" id="pinflow-btn-download">
        ${ICONS.download}
        <span id="pinflow-download-label">Download Batch (0)</span>
      </button>
      <button class="pinflow-dock-btn pinflow-dock-btn-accent" id="pinflow-btn-copy-all" title="Copy all outbound links">
        ${ICONS.copy}
        <span>Copy Links</span>
      </button>
      <button class="pinflow-dock-icon-btn" id="pinflow-btn-settings" title="Settings">
        ${ICONS.settings}
      </button>
      <button class="pinflow-dock-icon-btn" id="pinflow-btn-minimize" title="Minimize Toolbar">
        ${ICONS.minimize}
      </button>
    `;

    document.body.appendChild(dock);

    // Event Listeners for Dock
    document.getElementById('pinflow-btn-harvest').addEventListener('click', () => {
      startAutoHarvest();
    });
    document.getElementById('pinflow-btn-select-all').addEventListener('click', () => selectAllVisible(true));
    document.getElementById('pinflow-btn-clear').addEventListener('click', clearSelection);
    document.getElementById('pinflow-btn-download').addEventListener('click', startBatchDownload);
    document.getElementById('pinflow-btn-copy-all').addEventListener('click', copyAllSelectedLinks);
    document.getElementById('pinflow-btn-settings').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
    });

    const minBtn = document.getElementById('pinflow-btn-minimize');
    minBtn.addEventListener('click', () => {
      state.floatingBarMinimized = !state.floatingBarMinimized;
      dock.classList.toggle('minimized', state.floatingBarMinimized);
    });

    // Make Draggable
    setupDraggableDock(dock);
    updateFloatingBar();
  }

  /**
   * Update Floating Bar counts and button states
   */
  function updateFloatingBar() {
    const count = state.selectedPins.length;
    const countNum = document.getElementById('pinflow-count-num');
    const countPill = document.getElementById('pinflow-count-pill');
    const downloadBtn = document.getElementById('pinflow-btn-download');
    const downloadLabel = document.getElementById('pinflow-download-label');

    if (countNum) countNum.textContent = count;
    if (countPill) {
      if (count > 0) countPill.classList.add('active');
      else countPill.classList.remove('active');
    }

    if (downloadLabel) {
      downloadLabel.textContent = `Download Batch (${count})`;
    }

    if (downloadBtn) {
      if (count === 0 || state.isDownloading) {
        downloadBtn.disabled = true;
      } else {
        downloadBtn.disabled = false;
      }
    }

    updateHarvestHUD();
  }

  /**
   * Drag handle for floating toolbar
   */
  function setupDraggableDock(dock) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    const brandHeader = dock.querySelector('.pinflow-dock-brand');
    if (!brandHeader) return;
    brandHeader.style.cursor = 'grab';

    brandHeader.addEventListener('mousedown', (e) => {
      isDragging = true;
      brandHeader.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;
      const rect = dock.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      dock.style.transform = 'none';
      dock.style.left = `${initialLeft}px`;
      dock.style.top = `${initialTop}px`;
      dock.style.bottom = 'auto';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      dock.style.left = `${initialLeft + dx}px`;
      dock.style.top = `${initialTop + dy}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        brandHeader.style.cursor = 'grab';
      }
    });
  }

  /**
   * Listen to messages from background service worker & popup
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return false;

    switch (message.action) {
      case 'BATCH_PROGRESS': {
        const progressWrap = document.getElementById('pinflow-dock-progress-wrap');
        const progressBar = document.getElementById('pinflow-dock-progress-bar');
        if (progressWrap && progressBar) {
          progressWrap.style.display = 'block';
          progressBar.style.width = `${message.session.progressPercent}%`;
        }
        updateDownloadModal(
          message.session.completed,
          message.session.total,
          message.session.progressPercent
        );
        break;
      }

      case 'BATCH_COMPLETE': {
        state.isDownloading = false;
        updateFloatingBar();
        const progressWrap = document.getElementById('pinflow-dock-progress-wrap');
        if (progressWrap) progressWrap.style.display = 'none';
        completeDownloadModal(message.session.completed, message.session.folderName);
        showToast(
          `Batch complete! ${message.session.completed} saved in ${message.session.folderName}`,
          'success',
          5000
        );
        break;
      }

      case 'POPUP_GET_PAGE_DATA': {
        const totalCards = window.PinFlowDOM ? window.PinFlowDOM.findPinCardElements().length : 0;
        sendResponse({
          totalDetected: totalCards,
          selectedCount: state.selectedPins.length,
          pageContext: window.PinFlowDOM ? window.PinFlowDOM.getPageContext() : {},
          isHarvesting: state.isHarvesting
        });
        return true;
      }

      case 'POPUP_SELECT_ALL':
        selectAllVisible(true);
        sendResponse({ success: true, count: state.selectedPins.length });
        return true;

      case 'POPUP_START_HARVEST':
        startAutoHarvest(message.title || '');
        sendResponse({ success: true });
        return true;

      case 'POPUP_STOP_HARVEST':
        stopAutoHarvest(message.download !== false);
        sendResponse({ success: true });
        return true;

      case 'POPUP_CLEAR_SELECTION':
        clearSelection();
        sendResponse({ success: true });
        return true;

      case 'POPUP_DOWNLOAD_BATCH':
        startBatchDownload();
        sendResponse({ success: true });
        return true;

      default:
        break;
    }
    return false;
  });

  /**
   * Main Content Script Initialization
   */
  async function init() {
    await loadSettings();
    createFloatingBar();

    // 1. Restore persistent selections across page refreshes FIRST
    await restoreSavedSelections();

    // 2. Start Pinterest DOM Observation
    if (window.PinFlowDOM) {
      window.PinFlowDOM.initObserver((newCards) => {
        newCards.forEach((card) => processPinCard(card));
        if (state.isHarvesting) {
          selectAllVisibleSilently();
          updateHarvestHUD();
        }
      });
    }

    console.log('[Zumpey.com] Content script fully initialized with Persistent Selections & Robust Scraper.');
  }

  // Launch when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
