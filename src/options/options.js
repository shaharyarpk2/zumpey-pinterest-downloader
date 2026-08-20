/**
 * Zumpey.com: Options Page Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const folderPatternInput = document.getElementById('folder-pattern');
  const filenamePatternSelect = document.getElementById('filename-pattern');
  const folderPreview = document.getElementById('folder-preview');
  const filePreview = document.getElementById('file-preview');
  const downloadDelayRange = document.getElementById('download-delay');
  const delayValueBadge = document.getElementById('delay-value');

  const optDownloadImages = document.getElementById('opt-download-images');
  const optFallbackResolution = document.getElementById('opt-fallback-resolution');
  const optExportMetadata = document.getElementById('opt-export-metadata');
  const optIncludeHeaderRow = document.getElementById('opt-include-header-row');
  const optExportFormat = document.getElementById('opt-export-format');
  const optSheetFilename = document.getElementById('opt-sheet-filename');
  const optShowFloatingBar = document.getElementById('opt-show-floating-bar');
  const optAutoRenumber = document.getElementById('opt-auto-renumber');

  const btnSaveTop = document.getElementById('btn-save-settings');
  const btnSaveBottom = document.getElementById('btn-save-bottom');
  const btnReset = document.getElementById('btn-reset-defaults');
  const saveToast = document.getElementById('save-toast');

  const columnKeys = [
    'seqNumber',
    'fileName',
    'pinTitle',
    'outboundUrl',
    'pinUrl',
    'originalImageUrl',
    'pinDescription',
    'boardName',
    'dateExtracted'
  ];

  const DEFAULT_SETTINGS = {
    folderPattern: 'Zumpey_Exports/{datetime}_{query}',
    filenamePattern: '{index}',
    downloadDelayMs: 300,
    exportFormat: 'xlsx',
    spreadsheetFilename: 'links',
    downloadImages: true,
    exportMetadata: true,
    includeHeaderRow: true,
    fallbackResolution: true,
    showFloatingBar: true,
    autoRenumber: true,
    includeColumns: {
      seqNumber: false,
      fileName: false,
      pinTitle: false,
      outboundUrl: true,
      pinUrl: false,
      originalImageUrl: false,
      pinDescription: false,
      boardName: false,
      dateExtracted: false
    }
  };

  // 1. Load Current Settings
  async function loadSettings() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
      if (res && res.settings) {
        populateForm(res.settings);
      } else {
        populateForm(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      populateForm(DEFAULT_SETTINGS);
    }
  }

  function populateForm(settings) {
    folderPatternInput.value = settings.folderPattern || DEFAULT_SETTINGS.folderPattern;
    filenamePatternSelect.value = settings.filenamePattern || DEFAULT_SETTINGS.filenamePattern;
    downloadDelayRange.value = settings.downloadDelayMs || 300;
    delayValueBadge.textContent = `${downloadDelayRange.value} ms`;

    optDownloadImages.checked = settings.downloadImages !== false;
    optFallbackResolution.checked = settings.fallbackResolution !== false;
    optExportMetadata.checked = settings.exportMetadata !== false;
    if (optIncludeHeaderRow) {
      optIncludeHeaderRow.checked = settings.includeHeaderRow !== false;
    }
    optExportFormat.value = settings.exportFormat || 'xlsx';
    if (optSheetFilename) {
      optSheetFilename.value = settings.spreadsheetFilename || 'links';
    }
    optShowFloatingBar.checked = settings.showFloatingBar !== false;
    optAutoRenumber.checked = settings.autoRenumber !== false;

    // Columns
    const cols = settings.includeColumns || DEFAULT_SETTINGS.includeColumns;
    columnKeys.forEach((key) => {
      const checkbox = document.getElementById(`col-${key}`);
      if (checkbox) {
        checkbox.checked = cols[key] === true;
      }
    });

    updatePreviews();
  }

  // 2. Previews Calculation
  function updatePreviews() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const timeStr = '14-30-00';
    const datetimeStr = `${dateStr}_${timeStr}`;

    let pattern = folderPatternInput.value || DEFAULT_SETTINGS.folderPattern;
    pattern = pattern
      .replace(/\{datetime\}/gi, datetimeStr)
      .replace(/\{date\}/gi, dateStr)
      .replace(/\{time\}/gi, timeStr)
      .replace(/\{query\}/gi, 'fashion_trends')
      .replace(/\{board\}/gi, 'style_inspiration')
      .replace(/\/+/g, '/');

    if (!pattern.endsWith('/')) pattern += '/';
    folderPreview.textContent = pattern;

    // Filename Preview
    const fnPattern = filenamePatternSelect.value;
    if (fnPattern === '{index}') {
      filePreview.textContent = '001.jpg';
    } else if (fnPattern === '{title}') {
      filePreview.textContent = 'Modern-Living-Room-Aesthetic.jpg';
    } else if (fnPattern === '{id}') {
      filePreview.textContent = '1085790097654321.jpg';
    } else {
      filePreview.textContent = '001_Modern-Living-Room-Aesthetic.jpg';
    }
  }

  // 3. Dynamic Variable Buttons
  document.querySelectorAll('.token-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const token = btn.getAttribute('data-token');
      const start = folderPatternInput.selectionStart;
      const end = folderPatternInput.selectionEnd;
      const text = folderPatternInput.value;
      folderPatternInput.value = text.substring(0, start) + token + text.substring(end);
      folderPatternInput.focus();
      folderPatternInput.selectionStart = folderPatternInput.selectionEnd = start + token.length;
      updatePreviews();
    });
  });

  // Event Listeners for Live Previews
  folderPatternInput.addEventListener('input', updatePreviews);
  filenamePatternSelect.addEventListener('change', updatePreviews);

  downloadDelayRange.addEventListener('input', (e) => {
    delayValueBadge.textContent = `${e.target.value} ms`;
  });

  // 4. Save Settings Handler
  async function saveSettings() {
    const cols = {};
    columnKeys.forEach((key) => {
      const checkbox = document.getElementById(`col-${key}`);
      cols[key] = checkbox ? checkbox.checked : false;
    });

    const newSettings = {
      folderPattern: folderPatternInput.value.trim() || DEFAULT_SETTINGS.folderPattern,
      filenamePattern: filenamePatternSelect.value,
      downloadDelayMs: parseInt(downloadDelayRange.value, 10) || 300,
      downloadImages: optDownloadImages.checked,
      fallbackResolution: optFallbackResolution.checked,
      exportMetadata: optExportMetadata.checked,
      includeHeaderRow: optIncludeHeaderRow ? optIncludeHeaderRow.checked : true,
      exportFormat: optExportFormat.value,
      spreadsheetFilename: optSheetFilename ? (optSheetFilename.value.trim() || 'links') : 'links',
      showFloatingBar: optShowFloatingBar.checked,
      autoRenumber: optAutoRenumber.checked,
      includeColumns: cols
    };

    try {
      const res = await chrome.runtime.sendMessage({ action: 'SAVE_SETTINGS', settings: newSettings });
      if (res && res.success) {
        showSaveToast('Settings saved successfully!');
      } else {
        alert('Failed to save settings: ' + (res?.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Save error:', e);
      alert('Error communicating with background worker.');
    }
  }

  function showSaveToast(msg) {
    saveToast.textContent = msg;
    saveToast.classList.add('show');
    setTimeout(() => {
      saveToast.classList.remove('show');
    }, 3000);
  }

  btnSaveTop.addEventListener('click', saveSettings);
  btnSaveBottom.addEventListener('click', saveSettings);

  // 5. Reset to Defaults Handler
  btnReset.addEventListener('click', () => {
    if (confirm('Reset all settings to default configurations?')) {
      populateForm(DEFAULT_SETTINGS);
      saveSettings();
    }
  });

  // 6. Smooth Scrolling for Sidebar Nav
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElem = document.getElementById(targetId);
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        navItems.forEach((n) => n.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  // 7. Version & Update Center Logic
  const installedVersionVal = document.getElementById('installed-version-val');
  const cloudVersionVal = document.getElementById('cloud-version-val');
  const cloudVersionBadge = document.getElementById('cloud-version-badge');
  const updateAlertBox = document.getElementById('update-alert-box');
  const updateNotesContent = document.getElementById('update-notes-content');
  const btnDownloadUpdateZip = document.getElementById('btn-download-update-zip');
  const btnReloadRuntime = document.getElementById('btn-reload-runtime');
  const btnCheckUpdatesNow = document.getElementById('btn-check-updates-now');

  async function checkUpdates(isManual = false) {
    if (btnCheckUpdatesNow) {
      btnCheckUpdatesNow.disabled = true;
      btnCheckUpdatesNow.innerHTML = `<span>Checking GitHub Cloud...</span>`;
    }

    try {
      const manifest = chrome.runtime.getManifest ? chrome.runtime.getManifest() : { version: '1.0.1' };
      const currentVer = manifest.version || '1.0.1';
      if (installedVersionVal) installedVersionVal.textContent = `v${currentVer}`;

      const res = await chrome.runtime.sendMessage({ action: 'CHECK_UPDATE' });
      if (res && res.success) {
        const latestVer = res.latestVersion || currentVer;
        if (cloudVersionVal) cloudVersionVal.textContent = `v${latestVer}`;

        if (res.hasUpdate) {
          if (cloudVersionBadge) {
            cloudVersionBadge.className = 'v-badge update-ready';
            cloudVersionBadge.textContent = 'Update Ready';
          }
          if (updateAlertBox) updateAlertBox.style.display = 'flex';
          if (updateNotesContent) {
            updateNotesContent.textContent = res.releaseNotes || 'New features and performance updates available!';
          }
          if (btnDownloadUpdateZip) {
            btnDownloadUpdateZip.href = res.releaseUrl || `https://github.com/shaharyarpk2/zumpey-pinterest-downloader/releases`;
          }
          if (isManual) showSaveToast(`🔥 New Update (v${latestVer}) is available!`);
        } else {
          if (cloudVersionBadge) {
            cloudVersionBadge.className = 'v-badge up-to-date';
            cloudVersionBadge.textContent = 'Up to date';
          }
          if (updateAlertBox) updateAlertBox.style.display = 'none';
          if (isManual) showSaveToast('Your extension is fully up to date!');
        }
      }
    } catch (err) {
      console.warn('Update check failed:', err);
    } finally {
      if (btnCheckUpdatesNow) {
        btnCheckUpdatesNow.disabled = false;
        btnCheckUpdatesNow.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
          Check for Updates Now
        `;
      }
    }
  }

  if (btnCheckUpdatesNow) {
    btnCheckUpdatesNow.addEventListener('click', () => checkUpdates(true));
  }

  if (btnReloadRuntime) {
    btnReloadRuntime.addEventListener('click', () => {
      chrome.runtime.reload();
    });
  }

  // Initialize
  await loadSettings();
  checkUpdates(false);
});

