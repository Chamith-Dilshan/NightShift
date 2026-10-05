# NightShift 🌘

NightShift is a desktop media processing utility built with **Tauri v2**, **Next.js** (static export), and **Redux Toolkit**. It provides a reactive cyberpunk visual studio for FFmpeg, executing processes directly via a native Rust subprocess runner with live logs, structured progress, and zero sidecar bloat.

---

## Features

- **Video Studio (`/video`):** Full parameter controls for MP4, WebM, GIF, and custom containers.
- **Pure Command Generator:** Generates validated FFmpeg argument arrays directly from Redux state.
- **Batch Processing Queue:** Sequential batch encoding with individual progress tracking, log inspection, retry, and folder revealing.
- **Advanced Processing Controls:**
  - Video Trimming with duration hints (`-ss`, `-to` before `-i`).
  - Canvas Cropping with centering support and boundary validation.
  - Rate Control (CRF quality vs target bitrate).
  - Encoder Speed / Presets and CPU usage limits (`cpu-used`).
  - Keyframe interval (GOP) adjustment, including 1-frame All-Intra mode for web scrubbing.
  - Web Optimization (`yuv420p`, `+faststart` moov placement, Apple `hvc1` tags).
  - 9-Point Watermark overlay grid with margin and opacity controls.
  - Visual filters (grayscale, blur, sharpen, saturation).
  - Geometric transformations (rotation, horizontal and vertical flips).
- **First-Run Tool Manager (`/setup`):** Automatically detects existing system FFmpeg binaries or downloads verified static builds into application data. **No binaries are bundled in the installer.**
- **Hardware Capability Detection:** Automatically queries encoder availability (`libx264`, `libx265`, `libvpx-vp9`, `libaom-av1`, `aac`, `opus`, `flac`) and disables unavailable codecs.
- **Disk-Based Template Persistence:** Saves, loads, renames, imports, and exports presets using native filesystem storage with automatic migration.

---

## Installation & Running

### Desktop Installers

Pre-built binaries are available on [GitHub Releases](https://github.com/akehito/NightShift/releases):

- **Windows:** NSIS Installer (`.exe`)
- **macOS:** Universal Apple Silicon / Intel Disk Image (`.dmg`)
- **Linux:** AppImage and `.deb` packages

#### Unsigned App Instructions

v0.1 releases are currently unsigned:
- **Windows:** If Windows SmartScreen appears, click **More info** → **Run anyway**.
- **macOS:** Right-click `NightShift.app` and choose **Open**, or go to **System Settings** → **Privacy & Security** → click **Open Anyway**. Alternatively, run in terminal:
  ```bash
  xattr -cr /Applications/NightShift.app
  ```

---

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org) (v22+)
- [pnpm](https://pnpm.io) (v12+)
- [Rust](https://rustup.rs) (stable)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akehito/NightShift.git
   cd NightShift
   ```

2. **Install Node dependencies:**
   ```bash
   pnpm install
   ```

3. **Run desktop app in development mode:**
   ```bash
   pnpm tauri dev
   ```

4. **Run in browser mode (with MockExecutor):**
   ```bash
   pnpm dev
   ```

5. **Run test suites and linters:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   cargo test --manifest-path src-tauri/Cargo.toml
   cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
   ```

---

## License

NightShift is licensed under the [MIT License](LICENSE).
FFmpeg and other third-party utilities are subject to their respective licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.
