/**
 * PinFlow Pro: Extension Action Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // UI Elements
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const metricDetected = document.getElementById('metric-detected');
  const metricSelected = document.getElementById('metric-selected');
  const contextLabel = document.getElementById('context-label');
  const btnDownload = document.getElementById('btn-popup-download');
  const downloadText = document.getElementById('popup-download-text');
  const btnSelectAll = document.getElementById('btn-popup-select-all');
  const btnClear = document.getElementById('btn-popup-clear');
  const btnOpenOptions = document.getElementById('btn-open-options');
  const linkOptions = document.getElementById('link-options');
  const toggleHd = document.getElementById('toggle-hd-images');
  const toggleExport = document.getElementById('toggle-export-metadata');
  const selectFormat = document.getElementById('select-export-format');

  let currentTabId = null;

  // 1. Load Settings into Toggles
  try {
    const settingsRes = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
    if (settingsRes && settingsRes.settings) {
      const s = settingsRes.settings;
      if (toggleHd) toggleHd.checked = s.downloadImages !== false;
      if (toggleExport) toggleExport.checked = s.exportMetadata !== false;
      if (selectFormat) selectFormat.value = s.exportFormat || 'xlsx';
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }

  // 2. Query Active Tab
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url && activeTab.url.includes('pinterest.')) {
      currentTabId = activeTab.id;
      statusDot.className = 'status-dot online';
      statusText.textContent = 'Active on Pinterest';

      // Fetch live data from Content Script
      chrome.tabs.sendMessage(currentTabId, { action: 'POPUP_GET_PAGE_DATA' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          statusDot.className = 'status-dot online';
          statusText.textContent = 'Pinterest feed ready (refresh if needed)';
          return;
        }

        const { totalDetected, selectedCount, pageContext } = response;
        metricDetected.textContent = totalDetected || 0;
        metricSelected.textContent = selectedCount || 0;

        if (pageContext) {
          const harvestBtn = document.getElementById('btn-popup-harvest');
          const harvestLabel = document.getElementById('popup-harvest-label');

          if (pageContext.pageType === 'board') {
            contextLabel.textContent = `Board: ${pageContext.boardName || 'Board'}`;
            if (harvestLabel) harvestLabel.textContent = '📥 Download Entire Board';
          } else if (pageContext.pageType && pageContext.pageType.startsWith('profile')) {
            contextLabel.textContent = `Account: @${pageContext.username || 'User'}`;
            if (harvestLabel) harvestLabel.textContent = '📥 Download Full Account';
          } else if (pageContext.query) {
            contextLabel.textContent = `Search: "${pageContext.query}"`;
            if (harvestLabel) harvestLabel.textContent = '⚡ Auto-Scroll & Download All';
          } else {
            contextLabel.textContent = `Page: Feed`;
            if (harvestLabel) harvestLabel.textContent = '⚡ Auto-Scroll & Download All';
          }
        }

        updateDownloadButton(selectedCount || 0);
      });
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Not a Pinterest page';
      contextLabel.textContent = 'Open Pinterest to start';
      btnSelectAll.disabled = true;
      btnClear.disabled = true;
      btnDownload.disabled = true;
      const harvestBtn = document.getElementById('btn-popup-harvest');
      if (harvestBtn) harvestBtn.disabled = true;
    }
  } catch (err) {
    console.error('Tab query error:', err);
  }

  function updateDownloadButton(count) {
    downloadText.textContent = `Download Selected (${count})`;
    if (count > 0) {
      btnDownload.disabled = false;
    } else {
      btnDownload.disabled = true;
    }
  }

  // 3. Action Button Handlers
  const btnHarvest = document.getElementById('btn-popup-harvest');
  if (btnHarvest) {
    btnHarvest.addEventListener('click', () => {
      if (!currentTabId) return;
      chrome.tabs.sendMessage(currentTabId, { action: 'POPUP_START_HARVEST' }, () => {
        window.close();
      });
    });
  }

  btnSelectAll.addEventListener('click', () => {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(currentTabId, { action: 'POPUP_SELECT_ALL' }, (res) => {
      if (res && res.count != null) {
        metricSelected.textContent = res.count;
        updateDownloadButton(res.count);
      }
    });
  });

  btnClear.addEventListener('click', () => {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(currentTabId, { action: 'POPUP_CLEAR_SELECTION' }, () => {
      metricSelected.textContent = '0';
      updateDownloadButton(0);
    });
  });

  btnDownload.addEventListener('click', () => {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(currentTabId, { action: 'POPUP_DOWNLOAD_BATCH' }, () => {
      window.close();
    });
  });

  // 4. Quick Settings Change Handlers
  async function updateSetting(patch) {
    try {
      await chrome.runtime.sendMessage({ action: 'SAVE_SETTINGS', settings: patch });
    } catch (e) {
      console.error('Error saving setting:', e);
    }
  }

  toggleHd.addEventListener('change', (e) => {
    updateSetting({ downloadImages: e.target.checked });
  });

  toggleExport.addEventListener('change', (e) => {
    updateSetting({ exportMetadata: e.target.checked });
  });

  selectFormat.addEventListener('change', (e) => {
    updateSetting({ exportFormat: e.target.value });
  });

  // 5. Open Options Page
  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  btnOpenOptions.addEventListener('click', openOptions);
  linkOptions.addEventListener('click', (e) => {
    e.preventDefault();
    openOptions();
  });
});
