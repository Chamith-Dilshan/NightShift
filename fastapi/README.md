# NightShift 0.1.0

**NightShift** is a lightweight backend service for processing videos and images using **FFmpeg** and **WebP tools** — built with **FastAPI** and managed using the **uv** package manager.

Designed for performance, simplicity, and future desktop integration (Tauri).

For now, you have to download ffmpeg, cwebp, dwebp executable files and add to the directory.

---

## ✨ Features

- ⚡ FastAPI backend
- 🎥 Video processing via FFmpeg
- 🖼 Image encoding/decoding via WebP tools
- 🧰 Supports bundled or system-installed binaries(future)
- 📦 Dependency management with `uv` (no pip)
- 🖥 Ready for desktop packaging later(future)

---

## 📦 Tech Stack (Backend)

- **Python** ≥ 3.14
- **FastAPI**
- **Uvicorn**
- **python-multipart**
- **uv** package manager
- **FFmpeg**
- **WebP tools (cwebp / dwebp)**

---

## 📦 Tech Stack (Frontend)

- **NextJs 16**

---


## 🔧 Requirements

### 1. Install Python 3.14+
Download from [python.org/downloads](https://www.python.org/downloads/) [attached_file:1]

**Recommended:** Python 3.14.2 (Dec 5, 2025) - Support until 2030 [attached_file:1]

### 2. Install uv package manager
see official uv doc for more details - [uv official doc](https://docs.astral.sh/uv/getting-started/installation/)
```bash
# Option: pip
pip install uv
```

### 3. Create virtual environment
see official uv doc for more details - [uv official doc](https://docs.astral.sh/uv/pip/environments/#creating-a-virtual-environment)
```bash
uv venv
```

### 4. Activate:
```bash
# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate
```

### 5. Install dependencies
```bash
# From requirements.txt
uv add -r requirements.txt
```

### 2. Run server
see official FastAPI doc for more details - [FastAPI official doc](https://fastapi.tiangolo.com/tutorial/first-steps/)
```bash
# Option: pip
fastapi dev app/main.py
```


