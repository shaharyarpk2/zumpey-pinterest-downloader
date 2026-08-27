/**
 * Zumpey.com: Advanced Pinterest Batch Extractor & Downloader
 * Background Service Worker (Manifest V3)
 */

try {
  importScripts('../../lib/jszip.min.js');
} catch (e) {
  console.warn('[Zumpey.com] JSZip import note:', e);
}

const DEFAULT_SETTINGS = {
  folderPattern: 'Zumpey_Exports/{datetime}_{query}',
  filenamePattern: '{index}', // 001.jpg (Clean Sequential Number Only)
  downloadDelayMs: 300,
  exportFormat: 'xlsx', // 'xlsx' or 'csv'
  spreadsheetFilename: 'links', // Default filename for metadata sheet
  downloadImages: true,
  zipPackaging: false, // 1-Click ZIP Archive Packaging Mode
  exportMetadata: true,
  includeHeaderRow: true, // 1st row header inclusion toggle
  fallbackResolution: true,
  showFloatingBar: true,
  autoRenumber: true,
  includeColumns: {
    seqNumber: false,
    fileName: false,
    mediaType: false,
    pinTitle: false,
    outboundUrl: true, // Only Outbound / Destination Link enabled by default
    pinUrl: false,
    originalImageUrl: false,
    pinDescription: false,
    boardName: false,
    dateExtracted: false
  }
};

// Active download session tracker
const activeSessions = new Map();
// Fallback download tracker: downloadId -> { fallbackUrl, targetFilename, retryCount }
const pendingFallbacks = new Map();

// Initialize default settings on extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const existing = await chrome.storage.sync.get('pinflow_settings');
    if (!existing || !existing.pinflow_settings) {
      await chrome.storage.sync.set({ pinflow_settings: DEFAULT_SETTINGS });
    } else {
      // Merge in new default properties
      const merged = { ...DEFAULT_SETTINGS, ...existing.pinflow_settings };
      await chrome.storage.sync.set({ pinflow_settings: merged });
    }
    console.log('[Zumpey.com] Service Worker initialized with settings.');
  } catch (err) {
    console.error('[Zumpey.com] Error setting initial storage:', err);
  }
});

// Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  switch (message.action) {
    case 'GET_SETTINGS':
      handleGetSettings().then(sendResponse);
      return true;

    case 'SAVE_SETTINGS':
      handleSaveSettings(message.settings).then(sendResponse);
      return true;

    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      return true;

    case 'SINGLE_DOWNLOAD':
      handleSingleDownload(message.pinData, message.options).then(sendResponse);
      return true;

    case 'BATCH_DOWNLOAD':
      handleBatchDownload(message.pins, message.batchMetadata, sender?.tab?.id).then(sendResponse);
      return true;

    case 'GET_DOWNLOAD_STATUS':
      sendResponse({ activeSessions: Array.from(activeSessions.values()) });
      return true;

    case 'PAUSE_BATCH':
      handlePauseBatch(message.sessionId);
      sendResponse({ success: true });
      return true;

    case 'RESUME_BATCH':
      handleResumeBatch(message.sessionId);
      sendResponse({ success: true });
      return true;

    case 'CANCEL_BATCH':
      handleCancelBatch(message.sessionId);
      sendResponse({ success: true });
      return true;

    default:
      return false;
  }
});

/**
 * Get current settings from chrome.storage.sync with fallback to defaults
 */
async function handleGetSettings() {
  try {
    const result = await chrome.storage.sync.get('pinflow_settings');
    return { success: true, settings: result.pinflow_settings || DEFAULT_SETTINGS };
  } catch (err) {
    return { success: false, error: err.message, settings: DEFAULT_SETTINGS };
  }
}

/**
 * Save updated settings to chrome.storage.sync
 */
async function handleSaveSettings(newSettings) {
  try {
    const current = await handleGetSettings();
    const updated = { ...current.settings, ...newSettings };
    await chrome.storage.sync.set({ pinflow_settings: updated });
    return { success: true, settings: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Format string with tokens like {date}, {time}, {datetime}, {query}, {board}, {index}, {title}, {id}
 */
function formatPattern(pattern, variables = {}) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}-${min}-${ss}`;
  const datetimeStr = `${dateStr}_${timeStr}`;

  let result = pattern || 'Zumpey_Exports/{datetime}_{query}';

  // Standard date/time tokens
  result = result.replace(/\{datetime\}/gi, datetimeStr);
  result = result.replace(/\{date\}/gi, dateStr);
  result = result.replace(/\{time\}/gi, timeStr);

  // Dynamic context tokens
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(regex, sanitizeToken(val || ''));
  }

  // Clean double slashes, trailing/leading slashes
  result = result.replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  return result;
}

/**
 * Sanitize strings for safe filenames and folders
 */
function sanitizeToken(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .substring(0, 80);
}

function sanitizeFilename(name) {
  if (!name) return 'pin';
  return String(name)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 120);
}

/**
 * Get file extension from URL
 */
function getExtension(url, fallback = 'jpg') {
  if (!url) return fallback;
  try {
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.([a-zA-Z0-9]{3,4})$/);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov'].includes(ext)) {
        return ext;
      }
    }
  } catch (e) {
    // Ignore
  }
  return fallback;
}

/**
 * Handle a single pin download
 */
async function handleSingleDownload(pinData, customOptions = {}) {
  try {
    const settingsRes = await handleGetSettings();
    const settings = settingsRes.settings;

    const isVideo = !!(pinData.isVideo || (pinData.videoUrl && pinData.videoUrl.includes('.mp4')));
    const mediaUrl = (isVideo && pinData.videoUrl) ? pinData.videoUrl : (pinData.originalImageUrl || pinData.highResImageUrl || pinData.thumbnailUrl);
    if (!mediaUrl) {
      return { success: false, error: 'No valid media URL found on pin' };
    }

    const ext = isVideo ? 'mp4' : getExtension(mediaUrl, 'jpg');
    const folder = formatPattern(settings.folderPattern || 'Zumpey_Exports/{datetime}_{query}', {
      query: pinData.query || 'Single',
      board: pinData.boardName || 'Pins'
    });

    const indexStr = String(pinData.index || 1).padStart(3, '0');
    const titleSlug = sanitizeFilename(pinData.title || pinData.pinId || 'pin');
    
    // Choose filename based on pattern
    let filename = '';
    if (settings.filenamePattern === '{index}') {
      filename = `${indexStr}.${ext}`;
    } else if (settings.filenamePattern === '{title}') {
      filename = `${titleSlug}.${ext}`;
    } else if (settings.filenamePattern === '{id}') {
      filename = `${pinData.pinId || indexStr}.${ext}`;
    } else {
      filename = `${indexStr}_${titleSlug}.${ext}`;
    }

    const fullPath = folder ? `${folder}/${filename}` : filename;

    const downloadId = await chrome.downloads.download({
      url: mediaUrl,
      filename: fullPath,
      saveAs: false,
      conflictAction: 'uniquify'
    });

    // Track for fallback if originals fail
    if (settings.fallbackResolution && pinData.fallbackImageUrl && pinData.fallbackImageUrl !== imgUrl) {
      pendingFallbacks.set(downloadId, {
        fallbackUrl: pinData.fallbackImageUrl,
        targetFilename: fullPath,
        retryCount: 0
      });
    }

    return { success: true, downloadId, filename: fullPath };
  } catch (err) {
    console.error('[Zumpey.com] Single download error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Handle batch download session - Guarantees a unique dedicated folder for every batch
 */
async function handleBatchDownload(pins, batchMetadata = {}, tabId = null) {
  if (!pins || !Array.isArray(pins) || pins.length === 0) {
    return { success: false, error: 'No pins provided for batch download' };
  }

  const settingsRes = await handleGetSettings();
  const settings = settingsRes.settings;
  const sessionId = 'batch_' + Date.now();

  let pattern = settings.folderPattern || 'Zumpey_Exports/{datetime}_{query}';
  // Ensure every batch run creates a new distinct folder if no timestamp was in pattern
  if (!pattern.toLowerCase().includes('{time}') && !pattern.toLowerCase().includes('{datetime}')) {
    pattern = `${pattern}_{time}`;
  }

  const folderName = formatPattern(pattern, {
    query: batchMetadata.query || 'Pins',
    board: batchMetadata.boardName || 'Pinterest'
  });

  const session = {
    id: sessionId,
    total: pins.length,
    completed: 0,
    failed: 0,
    isCancelled: false,
    isPaused: false,
    folderName: folderName,
    tabId: tabId
  };
  activeSessions.set(sessionId, session);

  // Run batch download queue in background without blocking response
  executeBatchQueue(sessionId, pins, folderName, settings, batchMetadata, tabId);

  return { success: true, sessionId, totalPins: pins.length, folder: folderName };
}

/**
 * Sequential asynchronous download queue with delay staggering
 */
async function executeBatchQueue(sessionId, pins, folderName, settings, batchMetadata, tabId) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const downloadDelay = Math.max(100, parseInt(settings.downloadDelayMs, 10) || 300);
  const metadataRows = [];
  const useZip = !!settings.zipPackaging && (typeof JSZip !== 'undefined');
  const zip = useZip ? new JSZip() : null;

  for (let i = 0; i < pins.length; i++) {
    while (session.isPaused && !session.isCancelled) {
      await new Promise((res) => setTimeout(res, 200));
    }

    if (session.isCancelled) {
      break;
    }

    const pin = pins[i];
    const indexNum = i + 1;
    const indexStr = String(indexNum).padStart(3, '0');
    const titleSlug = sanitizeFilename(pin.title || pin.pinId || `Pin_${indexNum}`);
    
    // Choose primary media URL (MP4 video preferred for video pins, HD image otherwise)
    const isVideo = !!(pin.isVideo || (pin.videoUrl && pin.videoUrl.includes('.mp4')));
    const primaryMediaUrl = (isVideo && pin.videoUrl) ? pin.videoUrl : (pin.originalImageUrl || pin.highResImageUrl || pin.thumbnailUrl);
    const ext = isVideo ? 'mp4' : getExtension(primaryMediaUrl, 'jpg');

    // Build filename from pattern (Default: {index} -> 001.jpg / 001.mp4)
    let fileNameOnly = '';
    if (settings.filenamePattern === '{index}') {
      fileNameOnly = `${indexStr}.${ext}`;
    } else if (settings.filenamePattern === '{title}') {
      fileNameOnly = `${titleSlug}.${ext}`;
    } else if (settings.filenamePattern === '{id}') {
      fileNameOnly = `${pin.pinId || indexStr}.${ext}`;
    } else {
      // {index}_{title}
      fileNameOnly = `${indexStr}_${titleSlug}.${ext}`;
    }

    const fullImagePath = folderName ? `${folderName}/${fileNameOnly}` : fileNameOnly;

    // Ensure outbound destination link is resolved to actual external website
    let finalOutboundUrl = pin.outboundUrl || '';
    if (!finalOutboundUrl || finalOutboundUrl.includes('pinterest.com/pin/')) {
      if (pin.pinId) {
        try {
          const resp = await fetch(`https://www.pinterest.com/pin/${pin.pinId}/`, {
            headers: { 'Accept': 'text/html' }
          });
          const html = await resp.text();
          const match = html.match(/"(?:link|trackedLink|destinationUrl|sourceUrl|origLink)":"(https?:[^\"]+)"/i);
          if (match && match[1]) {
            let clean = match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
            if (clean.includes('%3A%2F%2F')) clean = decodeURIComponent(clean);
            if (!clean.includes('pinterest.') && !clean.includes('pinimg.com')) {
              finalOutboundUrl = clean;
            }
          }
        } catch (e) {
          // fallback to pinUrl
        }
      }
    }
    if (!finalOutboundUrl) {
      finalOutboundUrl = pin.pinUrl || `https://www.pinterest.com/pin/${pin.pinId || ''}`;
    }

    // Collect metadata for spreadsheet
    const extractedTime = pin.dateExtracted || new Date().toLocaleString();
    metadataRows.push({
      seqNumber: indexNum,
      fileName: fileNameOnly,
      mediaType: isVideo ? 'Video (MP4)' : 'Image (HD)',
      pinTitle: pin.title || 'Untitled Pin',
      outboundUrl: finalOutboundUrl,
      pinUrl: pin.pinUrl || `https://www.pinterest.com/pin/${pin.pinId || ''}`,
      originalImageUrl: primaryMediaUrl,
      pinDescription: pin.description || '',
      boardName: pin.boardName || batchMetadata.boardName || '',
      dateExtracted: extractedTime
    });

    // 1-Click ZIP Packaging mode
    if (useZip && zip && primaryMediaUrl) {
      try {
        const resp = await fetch(primaryMediaUrl);
        const buf = await resp.arrayBuffer();
        zip.file(fileNameOnly, buf);
        session.completed++;
      } catch (zipErr) {
        console.warn(`[Zumpey.com] Zip media buffer error on #${indexNum}:`, zipErr);
        session.failed++;
      }
    } else if (settings.downloadImages && primaryMediaUrl) {
      // Direct individual file downloads
      try {
        const downloadId = await chrome.downloads.download({
          url: primaryMediaUrl,
          filename: fullImagePath,
          saveAs: false,
          conflictAction: 'uniquify'
        });

        // Register for fallback if needed
        if (settings.fallbackResolution && pin.fallbackImageUrl && pin.fallbackImageUrl !== primaryMediaUrl) {
          pendingFallbacks.set(downloadId, {
            fallbackUrl: pin.fallbackImageUrl,
            targetFilename: fullImagePath,
            retryCount: 0
          });
        }

        session.completed++;
      } catch (err) {
        console.warn(`[Zumpey.com] Error downloading pin #${indexNum}:`, err);
        session.failed++;
      }
    } else {
      session.completed++;
    }

    // Broadcast progress update
    notifyProgress(session);

    // Stagger delay between downloads to prevent browser throttling
    if (i < pins.length - 1 && !session.isCancelled) {
      await new Promise((res) => setTimeout(res, downloadDelay));
    }
  }

  // Handle final export (Single ZIP or Separate Metadata Sheet)
  if (useZip && zip && !session.isCancelled) {
    if (settings.exportMetadata && metadataRows.length > 0) {
      const csvContent = generateCSV(
        metadataRows,
        settings.includeColumns || DEFAULT_SETTINGS.includeColumns,
        settings.includeHeaderRow !== false
      );
      const rawSheetName = (settings.spreadsheetFilename || 'links').trim() || 'links';
      zip.file(`${rawSheetName}.csv`, csvContent);
    }

    try {
      const zipBase64 = await zip.generateAsync({ type: 'base64' });
      const zipDataUri = 'data:application/zip;base64,' + zipBase64;
      const cleanFolderName = folderName.replace(/\//g, '_');
      const zipFilename = sanitizeFilename(cleanFolderName || `Zumpey_${batchMetadata.query || 'Batch'}_${Date.now()}`) + '.zip';

      await chrome.downloads.download({
        url: zipDataUri,
        filename: zipFilename,
        saveAs: false,
        conflictAction: 'uniquify'
      });
    } catch (zipGenErr) {
      console.error('[Zumpey.com] ZIP generation failed:', zipGenErr);
    }
  } else if (settings.exportMetadata && metadataRows.length > 0 && !session.isCancelled) {
    try {
      await exportMetadataSheet(metadataRows, folderName, settings, batchMetadata);
    } catch (sheetErr) {
      console.error('[Zumpey.com] Error exporting metadata sheet:', sheetErr);
    }
  }

  // Final completion notification
  notifyCompletion(session);
  activeSessions.delete(sessionId);
}

/**
 * Generate CSV text from rows, column preferences, and header row setting
 */
function generateCSV(rows, includeColumns, includeHeaderRow = true) {
  const columnDefs = [
    { key: 'seqNumber', header: 'Sequence Number' },
    { key: 'fileName', header: 'File Name' },
    { key: 'mediaType', header: 'Media Type' },
    { key: 'pinTitle', header: 'Pin Title' },
    { key: 'outboundUrl', header: 'Outbound / Destination Link' },
    { key: 'pinUrl', header: 'Pinterest Pin URL' },
    { key: 'originalImageUrl', header: 'Media URL' },
    { key: 'pinDescription', header: 'Description' },
    { key: 'boardName', header: 'Board Name' },
    { key: 'dateExtracted', header: 'Date Extracted' }
  ];

  let activeCols = columnDefs.filter((c) => includeColumns[c.key] === true);
  if (activeCols.length === 0) {
    // If none selected, fallback to outboundUrl
    activeCols = [columnDefs.find((c) => c.key === 'outboundUrl')];
  }

  const csvLines = [];

  // Add header row only if enabled
  if (includeHeaderRow !== false) {
    const headers = activeCols.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    csvLines.push(headers);
  }

  // Add data rows
  for (const row of rows) {
    const line = activeCols
      .map((c) => {
        const val = row[c.key] != null ? String(row[c.key]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',');
    csvLines.push(line);
  }

  return '\uFEFF' + csvLines.join('\r\n'); // UTF-8 BOM for Excel
}

/**
 * Generate CSV / XLSX file and trigger download in the batch folder
 */
async function exportMetadataSheet(rows, folderName, settings, batchMetadata) {
  const format = (settings.exportFormat || 'xlsx').toLowerCase();
  const includeCols = settings.includeColumns || DEFAULT_SETTINGS.includeColumns;
  const includeHeaderRow = settings.includeHeaderRow !== false;
  const rawSheetName = (settings.spreadsheetFilename || 'links').trim() || 'links';
  const fileNameBase = sanitizeFilename(formatPattern(rawSheetName, {
    query: batchMetadata.query || 'Pins',
    board: batchMetadata.boardName || 'Pinterest'
  }));

  const csvContent = generateCSV(rows, includeCols, includeHeaderRow);
  const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  const ext = format === 'csv' ? 'csv' : 'csv'; // Highly compatible CSV data format
  const filename = folderName ? `${folderName}/${fileNameBase}.${ext}` : `${fileNameBase}.${ext}`;

  await chrome.downloads.download({
    url: dataUri,
    filename: filename,
    saveAs: false,
    conflictAction: 'uniquify'
  });
}

/**
 * Pause an active batch session
 */
function handlePauseBatch(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.isPaused = true;
    notifyProgress(session);
  }
}

/**
 * Resume an active batch session
 */
function handleResumeBatch(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.isPaused = false;
    notifyProgress(session);
  }
}

/**
 * Cancel an active batch session
 */
function handleCancelBatch(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.isCancelled = true;
    session.isPaused = false;
    notifyCompletion(session);
  }
}

/**
 * Send real-time progress to tabs & popup
 */
function notifyProgress(session) {
  const payload = {
    action: 'BATCH_PROGRESS',
    session: {
      id: session.id,
      total: session.total,
      completed: session.completed,
      failed: session.failed,
      isPaused: !!session.isPaused,
      isCancelled: !!session.isCancelled,
      progressPercent: Math.round(((session.completed + session.failed) / session.total) * 100)
    }
  };

  chrome.runtime.sendMessage(payload).catch(() => {});
  if (session.tabId) {
    chrome.tabs.sendMessage(session.tabId, payload).catch(() => {});
  }
}

/**
 * Send final completion event
 */
function notifyCompletion(session) {
  const payload = {
    action: 'BATCH_COMPLETE',
    session: {
      id: session.id,
      total: session.total,
      completed: session.completed,
      failed: session.failed,
      folderName: session.folderName,
      isCancelled: session.isCancelled
    }
  };

  chrome.runtime.sendMessage(payload).catch(() => {});
  if (session.tabId) {
    chrome.tabs.sendMessage(session.tabId, payload).catch(() => {});
  }
}

/**
 * Listen for download failures to handle image resolution fallbacks
 */
chrome.downloads.onChanged.addListener(async (delta) => {
  if (!delta || !delta.id) return;

  if (delta.error && delta.error.current) {
    const downloadId = delta.id;
    if (pendingFallbacks.has(downloadId)) {
      const fb = pendingFallbacks.get(downloadId);
      pendingFallbacks.delete(downloadId);

      if (fb.retryCount < 1 && fb.fallbackUrl) {
        console.warn(`[Zumpey.com] High-res image failed for download #${downloadId}. Falling back to 736x: ${fb.fallbackUrl}`);
        try {
          await chrome.downloads.download({
            url: fb.fallbackUrl,
            filename: fb.targetFilename,
            saveAs: false,
            conflictAction: 'uniquify'
          });
        } catch (retryErr) {
          console.error('[Zumpey.com] Fallback download failed:', retryErr);
        }
      }
    }
  }

  // Cleanup completed downloads from fallback map
  if (delta.state && delta.state.current === 'complete') {
    pendingFallbacks.delete(delta.id);
  }
});

