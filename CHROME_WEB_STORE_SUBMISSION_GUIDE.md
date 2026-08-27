# 🚀 Chrome Web Store Official Submission Kit & Step-by-Step Guide
**Product:** Zumpey.com — Pinterest Batch Downloader & Video Extractor  
**Package File to Upload:** `dist/zumpey-cws.zip`

---

## 📌 STEP 1: Uploading the Package

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click **"＋ New Item"** (top right button).
3. Drag & drop or browse to select your clean package:
   ```
   D:\Antigravity\PinFlow Pro Advanced Pinterest Batch Extractor & Downloader\dist\zumpey-cws.zip
   ```
4. Click **"Upload"**. (Google will process the manifest and create your draft item).

---

## 📝 STEP 2: Store Listing Information (Copy & Paste)

### 🏷️ 1. Extension Name
```text
Zumpey.com - Pinterest Batch Extractor & Downloader
```

### 📄 2. Summary Description (Under 132 characters)
```text
Extract 1080p MP4 videos, original HD images, destination links & export entire Pinterest boards/accounts to Excel with 1-click.
```

### 📖 3. Detailed Description (Formatted with Features)
```text
⚡ Zumpey.com is the ultimate high-speed Pinterest Batch Extractor, Video Downloader, and Metadata Spreadsheet Generator. 

Extract thousands of full-resolution original HD images, progressive 1080p MP4 videos/reels, deep outbound destination links, and export entire boards or profile feeds directly into structured Excel (.xlsx) / CSV spreadsheets in seconds.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 KEY FEATURES & CAPABILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 1080p MP4 Video & Reel Downloader:
• Automatically detects video pins and extracts progressive 1080p / 720p MP4 stream files with audio.
• Displays clean on-card video pills for instant 1-click single downloads.

⚡ 2-Step Smart Fetch & Harvest Engine:
• Smoothly auto-scrolls through user profiles, search queries, or boards.
• Harvests and sequences pins with dynamic visual badges (#1 to #N).
• Safe 2-step workflow: Index and verify first, download batch on your command.

🎮 Real-Time Download HUD Controls:
• Glassmorphic floating control dock with live percentage and count progress.
• Full interactive controls: ⏸ Pause, ▶ Resume, and ⏹ Cancel active downloads at any second.

📦 1-Click ZIP Archive Direct Download Mode:
• Package an entire batch of 100+ images, videos, and Excel links into one single clean .zip file to avoid browser popup clutter.

🖼️ True Original Resolution (/originals/):
• Bypasses compressed Pinterest CDN thumbnails and retrieves raw original source images with automated /736x/ 404 fallback.

🔗 Deep Outbound Website Link Extraction:
• Decodes and extracts the actual external destination website (e.g. stores, blogs, articles) into clean columns.

📊 Customizable Excel (.xlsx) & CSV Exports:
• Generates structured spreadsheets named "links.xlsx" with custom column toggles (Title, Outbound Link, Pin URL, Media Type, Date).

📁 Isolated Batch Folder Structuring:
• Automatically organizes files into dedicated timestamped subfolders with custom dynamic naming tokens ({datetime}, {query}, {board}, {index}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY & SECURITY FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zumpey.com operates 100% locally inside your browser. No user account required, no personal data tracking, and no external data storage.

Crafted with ❤️ by Zumpey.com
```

### 📂 4. Category & Language
* **Category:** `Productivity` (or `Photos`)
* **Primary Language:** `English`

---

## 🔒 STEP 3: Privacy & Permissions Justification (Crucial for 1st-Attempt Approval!)

Go to the **"Privacy"** tab on the left sidebar in the Developer Dashboard and fill in:

### 1. Single Purpose Description:
```text
The single purpose of this extension is to allow users to batch extract, organize, and download media files (images and 1080p MP4 videos) along with their metadata spreadsheets from Pinterest boards, search feeds, and profile pages.
```

### 2. Permissions Justification:

* **`downloads` permission:**
  ```text
  Required to download selected pin images, 1080p MP4 videos, generated ZIP archives, and exported Excel (.xlsx/CSV) metadata spreadsheets directly to the user's computer.
  ```

* **`storage` permission:**
  ```text
  Required to save the user's custom download preferences (such as filename patterns, folder naming tokens, export format, and stagger delay) across browser sessions.
  ```

* **`activeTab` permission:**
  ```text
  Required to interact with the currently active Pinterest tab to index visible pin elements and trigger batch selection upon the user's click.
  ```

* **`scripting` permission:**
  ```text
  Required to execute content observation routines on Pinterest pages to detect and index pin cards and progressive video streams.
  ```

* **`unlimitedStorage` permission:**
  ```text
  Required to temporarily buffer large batch arrays and high-resolution thumbnail metadata in memory during large 500+ pin extractions without exceeding browser quotas.
  ```

* **Host Permissions (`*://*.pinterest.com/*`, `*://*.pinimg.com/*`, etc.):**
  ```text
  Required to inspect Pinterest DOM structures for pin data and fetch original image files and 1080p video streams directly from Pinterest CDN domains.
  ```

### 3. Data Usage Checkboxes:
* Check: **"I do not sell or transfer user data to third parties"**.
* Check: **"I do not use or transfer user data for purposes unrelated to the extension's single purpose"**.
* Check: **"I do not use or transfer user data to determine creditworthiness or for lending purposes"**.

---

## 🖼️ STEP 4: Screenshots & Store Assets

Chrome Web Store requires at least **1 screenshot**:
* **Dimensions:** `1280 x 800 px` or `640 x 400 px` (PNG or JPEG).
* Take a high-quality screenshot of Pinterest with Zumpey's floating dock, numbered badges, and the options panel.

---

## 🚀 STEP 5: Submit for Review!

1. Check all tabs (Listing, Privacy, Distribution).
2. Click the blue button in the top right: **"Submit for Review"**.
3. Google typically approves new extensions in **24 to 48 hours**.
4. Once approved, your extension will be live for the entire world on the official Google Chrome Web Store! 🎉
