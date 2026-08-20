# Zumpey.com: Advanced Pinterest Batch Extractor & Downloader

> ⚡ **Extract Full HD Original Images, Deep Destination Outbound Links, and Download Entire Pinterest Accounts & Boards with 1-Click.**

---

## 🌟 Key Features

* **⚡ 1-Click Complete Account & Board Downloader:** Smoothly auto-scrolls through user profiles or boards, harvests every pin, and batch downloads them.
* **🖼️ Full HD / Originals Resolution Transformation:** Automatically retrieves raw `/originals/` images with automated `/736x/` 404 fallback.
* **🔗 Deep Outbound Website Link Extraction:** Deeply resolves and extracts direct target websites (e.g. `boredpanda.com`, blogs, shops) rather than internal pin URLs.
* **📊 Excel (.xlsx) & CSV Metadata Export:** Generates clean spreadsheets with optional 1st row headers and custom column filters.
* **📁 Dedicated Batch Subfolder Isolation:** Saves each batch in a dedicated timestamped folder (`Zumpey_Exports/{datetime}_{query}`).
* **🔄 Automatic Updates via GitHub:** Built-in auto-update system that syncs new features and bug fixes across all devices.

---

## 📦 How to Install (For Users)

1. Download the latest **`zumpey.zip`** from the [Releases](https://github.com/zumpey/zumpey-pinterest-downloader/releases) section.
2. Unzip the folder to your computer (e.g. `Desktop/zumpey-extension`).
3. Open Google Chrome and go to `chrome://extensions/`.
4. Turn ON **"Developer mode"** in the top right corner.
5. Click **"Load unpacked"** and select the unzipped `zumpey-extension` folder.
6. Open [Pinterest.com](https://www.pinterest.com/) and start extracting!

---

## 🔄 How Auto-Updates Work

When a new update is released on GitHub:
* Chrome connects to `updates.xml` and checks for updates automatically.
* The in-app checker in the extension popup will notify users: **"New Update Available"**.
* Click **Update** in `chrome://extensions/` or the popup to refresh to the latest version immediately!

---

## 💻 Developer Guide: How to Push an Update

1. Update your code files in `src/`.
2. Increase the version number in `manifest.json` (e.g. `"version": "1.0.1"`).
3. Run the release packager:
   ```bash
   python scripts/build_release.py
   ```
4. Commit and push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Release v1.0.1: Added new features"
   git tag v1.0.1
   git push origin main --tags
   ```
GitHub Actions will automatically build the release and distribute it to all users!
