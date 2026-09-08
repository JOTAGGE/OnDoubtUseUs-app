# :) On Doubt, Use Us — Software by Blue Lab

> **Forever free. Unlimited. No ads. No nonsense.**  
> A clean and simple media downloader built for people who just want things to work.

---

## ⚡ The Philosophy

A utility should be useful. It shouldn’t fight the user, sell their attention or intentionally make simple things complicated.

- **Free forever:** No premium tier required to unlock the actual tool.
- **No artificial limits:** Use the software when you need it without daily quotas.
- **No ads:** The interface belongs to the product, not advertisers.
- **No shady installers:** No bundled junk, fake buttons or intentionally confusing flows.
- **Local-first:** Whenever possible, the work happens directly on your machine.
- **Simple by design:** Paste. Choose. Download.

---

## ✨ Features

- **📺 Video & Audio Engine:** Download resolutions up to 4K (2160p, 1080p, 720p in MP4/WEBM) and studio audio (MP3 320 kbps, M4A AAC 256 kbps, Lossless FLAC).
- **📑 Full Playlist Support:** Analyze and download entire playlists with individual item selection.
- **📁 Organized Output:** Files are saved automatically to `Downloads/On Doubt Use Us`, organized into `Channel / Playlist` subfolders.
- **⚡ Real-time NDJSON Progress:** Instant feedback per item and total download progress.
- **🛑 Clean Cancellation:** Instant process termination on demand (`child.kill('SIGTERM')`) without zombie background processes.
- **🌐 Browser Direct Stream:** Built-in stream endpoint (`/api/stream`) for direct browser downloads.
- **🎨 Blue Lab Design System:** High-contrast brutalist/minimalist aesthetic with Dark/Light mode toggle and real-time bilingual translation (PT/EN).

---

## 📋 Requirements

- **Node.js:** 22 or higher
- **OS:** Windows 10/11, macOS, Linux

---

## 🚀 Quick Start (Local Run)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JOTAGGE/OnDoubtUseUs-.git
   cd OnDoubtUseUs-
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development mode:**
   ```bash
   npm run dev
   ```
   *Runs the Next.js / Vinext interface at `http://localhost:3000` and the local download service at `http://127.0.0.1:8787`.*

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` or `.env.local` to customize settings:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8787` | Download engine HTTP port |
| `HOST` | `127.0.0.1` | Host address |
| `DOWNLOAD_DIR` | `~/Downloads/On Doubt Use Us` | Folder where downloaded media is saved |
| `CORS_ORIGIN` | `http://localhost:3000,http://127.0.0.1:3000` | Allowed origins (or `*`) |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8787` | API address consumed by the frontend |

---

## 🐳 Docker Container Deploy

Deploy the backend to Railway, Render, Fly.io, or any VPS:

```bash
docker build -t on-doubt-use-us .
docker run -d -p 8787:8787 -v ~/downloads:/app/downloads --name oduu on-doubt-use-us
```

---

## 📜 Legal Disclaimer & License

Distributed under the **MIT License**.

> **⚠️ Disclaimer:** On Doubt, Use Us is designed for downloading content you own, have permission to download, or that is otherwise available for lawful offline use. Please respect creators, platforms, and applicable rights.

---

**On Doubt, Use Us :)**  
*Software by [Blue Lab](https://bluelabhub.vercel.app) — Explore → Build → Test → Learn → Ship.*
