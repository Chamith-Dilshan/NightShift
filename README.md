<div align="center">

<img src="public/app-icon.png" alt="NightShift Logo" width="240" height="240" onerror="this.src='https://raw.githubusercontent.com/akehito/NightShift/main/public/favicon.ico'; this.width=96; this.height=96;" />

# ⚡ NIGHTSHIFT

**The Ultimate Desktop Studio for CMD Tools**

*Engineered with Tauri v2, Next.js, Redux Toolkit, and a Native Rust Execution Engine.*

[![Release](https://img.shields.io/github/v/release/akehito/NightShift?color=black&label=release)](https://github.com/akehito/NightShift/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-black?logo=tauri)](https://v2.tauri.app)
[![Rust](https://img.shields.io/badge/Rust-black?logo=rust)](https://www.rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js_App_Router-black?logo=next.js)](https://nextjs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

<br />

[**Key Features**](#-key-features) •
[**Demo Video**](#-demo-preview) •
[**Architecture**](#-architecture--data-flow) •
[**Quick Start**](#-quick-start) •
[**Tool Manager**](#-zero-bloat-binary-manager) •
[**Contributing**](CONTRIBUTING.md) •
[**Security**](SECURITY.md)

</div>

---

## 🌌 Overview

**NightShift** is a high-performance desktop media processing studio designed to give creators, developers, and power users surgical precision over FFmpeg operations without fighting cryptic command-line flags. 

Built on a triple-layer stack combining **Tauri v2**, a **static Next.js 16 App Router UI**, and a **custom multithreaded Rust streaming runner**, NightShift delivers zero-sidecar bloat, instant launch times, unbuffered log streaming, and deterministic batch execution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             NIGHTSHIFT STUDIO                               │
│  [Input Media] ──> [Deterministic Redux Builder] ──> [Rust Async Engine]    │
│                           │                                  │              │
│                     Validated State                  Raw Unbuffered Pipe    │
│                           │                                  │              │
│                     Live FFmpeg Arg                 FFmpeg / FFprobe Spawn  │
│                           ▼                                  ▼              │
│                    [Studio Output] <─── [Real-Time Log & Progress Stream]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎬 Demo Preview

<div align="center">

<!-- DEMO VIDEO / GIF CONTAINER -->
<a href="https://github.com/akehito/NightShift/raw/main/.github/assets/demo.mp4">
  <img src=".github/assets/project_demo.gif" alt="NightShift Demo Video" width="850" onerror="this.src='https://placehold.co/850x480/0f172a/38bdf8?text=▶+Watch+NightShift+In+Action+(Click+to+Play+Demo)&font=Montserrat';" />
</a>

<p><em>Demo video to see it in action.</em></p>

</div>

> **💡 Video Asset Placement Note:** Demo videos should be placed in `.github/assets/demo.mp4` or hosted via [GitHub Release Assets](https://github.com/akehito/NightShift/releases) so that the raw video files are **never** bundled into the compiled Tauri application installer binaries!

---

## ✨ Key Features

### 🎛️ Precision Video Studio (`/video`)
- **Container Mastery:** Native presets and container validations for `MP4`, `WebM`, `GIF`, and custom file targets.
- **Microsecond Trimming:** Non-destructive duration trimming using input-seeking `-ss` and `-to` before `-i` for instantaneous cut points.
- **Canvas Cropping:** Interactive boundary and centering controls (`crop=w:h:x:y`) with strict validation against frame dimension overflows.
- **GOP & Keyframe Surgery:** Fine-tune GOP (Group of Pictures) keyframe intervals, including single-frame **All-Intra** (`-g 1`) mode for instantaneous web video scrub performance.
- **Web Optimization Pipeline:** Automated `+faststart` moov-atom placement, `yuv420p` pixel format normalization, and Apple QuickTime compatibility tags (`-tag:v hvc1`).
- **9-Point Watermark Grid:** Drag-and-drop image overlay with margin calibration, opacity sliders, and position anchoring.
- **Hardware Acceleration:** Auto-probes local GPU encoders (`libx264`, `libx265`, `libvpx-vp9`, `libaom-av1`, `aac`, `opus`, `flac`) and disables incompatible codecs on the fly.

### ⚡ Deterministic Command Generation
- **Pure Function State Builders:** CLI argument arrays are constructed purely and deterministically from Redux state without UI side-effects.
- **Interactive Syntax Mirror:** Real-time editable and copyable terminal command preview to inspect generated arguments before execution.
- **Live Stream Logs:** Unbuffered UTF-8 and carriage-return line splitting (`line_splitter.rs`) captures frame rates, speed factors, bitrates, and timecodes.

### 📦 Batch Processing Queue
- **Sequential Pipeline:** Queue dozens of files with independent encoding profiles.
- **Active Task Monitoring:** Real-time log inspector, cancellation triggers, error retries, and instant OS folder reveal (`explorer` / `Finder` / `xdg-open`).
- **Disk-Backed Template Manager:** Save, load, rename, import, and export reusable parameter configurations stored safely on the local filesystem.

---

## 📊 Comparison Matrix

| Feature / Metric | **NightShift** ⚡ | HandBrake 🐢 | Electron Wrappers 🐌 | Raw CLI 💻 |
| :--- | :---: | :---: | :---: | :---: |
| **Engine Architecture** | **Native Rust (Tauri v2)** | C / GTK / WX | Node.js + Chromium | Pure Shell |
| **RAM Footprint (Idle)** | **< 20 MB** | ~180 MB | > 450 MB | 0 MB |
| **Installer Size** | **< 15 MB** | ~40 MB | > 120 MB | N/A |
| **Sidecar / Python Bloat** | **Zero (Native Rust)** | None | Heavy | None |
| **Live Unbuffered Logs** | ✅ **Real-Time Stream** | ⚠️ Text Log | ⚠️ Polled Buffer | ✅ Direct stdout |
| **Web Scrubbing (All-Intra)**| ✅ **1-Click GOP Preset** | ❌ Manual Flags | ❌ Rare | ⚠️ Complex `-g` args |
| **Interactive Crop & Grid**| ✅ **Visual Overlay** | ⚠️ Basic Box | ⚠️ Partial | ❌ Math calculation |
| **Binary Freedom** | ✅ **System or On-Demand** | Bundled | Bundled | User-installed |

---

## 🛠️ Architecture & Data Flow

NightShift strictly decouples UI presentation, deterministic command compilation, and host process orchestration:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 16)                             │
│                                                                             │
│  ┌───────────────────────┐          ┌────────────────────────────────────┐  │
│  │   UI Components       │          │   Redux Toolkit Store              │  │
│  │   (Panels, Sliders)   │ ───────> │   • videoSlice   • jobsSlice       │  │
│  └───────────────────────┘          │   • toolsSlice   • templatesSlice  │  │
│                                     └─────────────────┬──────────────────┘  │
│                                                       │                     │
│                                     ┌─────────────────▼──────────────────┐  │
│                                     │   Pure Command Builder             │  │
│                                     │   (commandBuilder.ts)              │  │
│                                     └─────────────────┬──────────────────┘  │
└───────────────────────────────────────────────────────┼─────────────────────┘
                                                        │ JSON IPC
┌───────────────────────────────────────────────────────▼─────────────────────┐
│                        NATIVE BACKEND (Tauri v2 / Rust)                     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   Job Runner Engine (jobs.rs)                                         │  │
│  │   • Spawns async tokio process with unbuffered stdout / stderr pipes   │  │
│  │   • Splits lines by \n and \r for carriage-return progress updates    │  │
│  │   • Emits structured job-log and job-progress events via Tauri IPC    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                       │                                     │
│                                       ▼                                     │
│                     ┌───────────────────────────────────┐                   │
│                     │       Host FFmpeg / FFprobe       │                   │
│                     └───────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Download Pre-Built Installers

Official desktop release packages are published on [GitHub Releases](https://github.com/akehito/NightShift/releases):

| Operating System | Package Format | Download Link |
| :--- | :--- | :--- |
| **Windows** | NSIS Installer (`.exe`) | [Download for Windows](https://github.com/akehito/NightShift/releases/latest) |
| **macOS** | Universal Disk Image (`.dmg`) | [Download for macOS](https://github.com/akehito/NightShift/releases/latest) |
| **Linux** | AppImage / Debian (`.deb`) | [Download for Linux](https://github.com/akehito/NightShift/releases/latest) |

<details>
<summary><strong>🔓 Opening Unsigned Builds</strong></summary>

v0.1 builds are currently unsigned:
- **Windows:** Click **More info** → **Run anyway** if Windows SmartScreen appears.
- **macOS:** Right-click `NightShift.app` and choose **Open**, or run:
  ```bash
  xattr -cr /Applications/NightShift.app
  ```
- **Linux:** Make AppImage executable: `chmod +x NightShift-*.AppImage`
</details>

---

### 2. Building from Source

#### Prerequisites
- **Node.js** `v22+` & **pnpm** `v10+`
- **Rust** `stable` (`rustup update stable`)
- C++ Build Tools (VS 2022 on Windows, Xcode CLI on macOS, standard WebKitGTK on Linux)

#### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/akehito/NightShift.git
cd NightShift

# 2. Install dependencies
pnpm install

# 3. Run desktop application in development mode
pnpm tauri dev

# 4. (Optional) Run frontend in browser mock mode
pnpm dev
```

#### Verification & Test Suites

```bash
# Run complete verification suite
pnpm lint
pnpm typecheck
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## 🧰 Zero-Bloat Binary Manager

NightShift does **not** bundle heavy multi-hundred megabyte FFmpeg binaries inside its desktop installer. 

Upon first launch, the **First-Run Setup Wizard (`/setup`)**:
1. 🔍 **Scans System PATH:** Automatically locates existing FFmpeg & FFprobe installations.
2. 📥 **Verified On-Demand Downloads:** If not found, downloads official verified static builds for your architecture directly into secure user app data (`AppData/Local` / `Application Support` / `~/.local/share`).
3. 🔒 **Integrity Checked:** Every binary is validated against cryptographic SHA-256 hashes defined in `tools-manifest.json`.

---

## 🗺️ Roadmap

- [x] Native Rust streaming runner & Tauri v2 migration.
- [x] Redux-driven pure command compilation & live terminal logs.
- [x] Trimming, canvas cropping, watermark grid, and web GOP presets.
- [x] Sequential batch processing queue with folder reveal.
- [ ] Two-Pass VBR encoding pipeline with automated bitrate calculators.
- [ ] Audio spectrum visualizer & multi-track audio extraction.
- [ ] HDR to SDR color-space tone mapping (`tonemap_zscale`).
- [ ] Hardware-accelerated hardware decoders (`nvenc`, `qsv`, `vaapi`, `videotoolbox`).

---

## 🤝 Contributing

Contributions make the open-source community thrive! Please read our [**Contributing Guide (CONTRIBUTING.md)**](CONTRIBUTING.md) for full details on branch conventions, coding guidelines, and pull request procedures.

---

## 🔒 Security

For vulnerability disclosures and details on our local-first threat model, please review our [**Security Policy (SECURITY.md)**](SECURITY.md).

---

## 📄 License & Third-Party Notices

NightShift is released under the [MIT License](LICENSE).  
FFmpeg and other third-party tools are subject to their respective licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

<br />

<div align="center">
  <sub>Crafted with ⚡ for creators and developers who demand complete control over their media.</sub>
</div>
