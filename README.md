# Olla Music 🎧

Olla Music is a premium, beautifully designed offline Progressive Web Application (PWA) that allows you to store and play your music library entirely within your browser. 

No internet connection? No problem. Olla Music uses modern web APIs to ensure your audio files are stored securely on your device and are accessible even when you're completely offline.

## ✨ Features

- **True Offline Capability:** Powered by a Service Worker to cache the application shell and assets.
- **Local Storage:** Utilizes the `IndexedDB` API to store audio files directly in your browser.
- **Premium Interface:** A sleek, dark-mode, glassmorphic design featuring fluid micro-animations and glowing accents.
- **Auto-Metadata Extraction:** Automatically attempts to parse track titles and artists from uploaded file names.
- **Custom Player:** Complete control with play, pause, next/prev tracking, timeline scrubbing, and volume adjustment.
- **Responsive Layout:** Adaptive design that looks great on both desktop and mobile devices.

## 🛠️ Technology Stack

- **HTML5** & **CSS3** (with CSS Variables for easy theming)
- **Vanilla JavaScript** (No complex frameworks or build steps required)
- **IndexedDB API** for managing large audio file storage
- **Service Worker API** for enabling offline caching

## 🚀 Getting Started

Because the application relies on Service Workers and IndexedDB, it must be served over `http://` or `https://`. Opening the `index.html` file directly (`file://`) will prevent the offline features from functioning properly.

### Running locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gojosatorou999/olla-music.git
   cd olla-music
   ```

2. **Start a local development server:**
   
   If you have Node.js installed:
   ```bash
   npx serve .
   ```
   
   Or using Python 3:
   ```bash
   python -m http.server 8000
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:3000` (or `8000`) and start adding your `.mp3` or `.wav` files!

## 📸 Usage

1. Click **"Add Music"** to upload audio tracks from your device.
2. Your uploaded tracks will be permanently stored in the browser's database and listed in "Your Library".
3. Disconnect from the internet, reload the page, and continue to listen to your music uninterrupted!

---
*Built as a showcase for modern web capabilities and offline-first design.*
