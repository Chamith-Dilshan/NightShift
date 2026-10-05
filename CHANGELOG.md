# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-04

### Added
- **Native Rust Execution Engine:** Subprocess management directly from Tauri v2 with line splitting, structured `-progress pipe:1` parsing, live log streaming, and graceful job cancellation.
- **Video Studio (`/video`):** Full parameter controls for MP4, WebM, GIF, and custom container formats with pure command generation.
- **Video Features:**
  - Video Trimming (`-ss`, `-to` before `-i`) with duration probing.
  - Video Cropping with centering options and dimension checks.
  - Rate Control options (CRF vs Target Bitrate).
  - Encoder Speed / Preset selector and AV1/VP9 CPU levels (`cpu-used`).
  - Keyframe interval (GOP) controls including 1-frame All-Intra mode for web scrubbing.
  - Web Optimization (yuv420p chroma subsampling, `+faststart` moov placement, Apple `hvc1` tags).
  - Image Watermark overlay with 9-point grid alignment, margin, and opacity.
  - Visual filters (grayscale, blur, sharpen, saturation).
  - Geometric transforms (rotation, horizontal flip, vertical flip).
- **Batch Processing Queue:** Sequential batch job queue with per-job progress tracking, log inspection, retry, and "Reveal in Folder" support.
- **Dynamic Codec Resolution:** Pure codec compatibility normalization that adapts selections to container rules and restores original choices on switch back.
- **Rule Validation Engine:** 17 validation rules (V1-V17) ensuring command safety and blocking conflicting configurations before execution.
- **First-Run Setup Wizard (`/setup`):** Tool manager that detects local system binaries or downloads verified static FFmpeg builds into application data.
- **Settings Page (`/settings`):** Hardware codec capability detection, custom path configuration, and auto-updater integration.
- **Disk Template Persistence:** Stored templates and last-used settings on disk with migration support for legacy configurations.
- **CI/CD Workflows:** Automated testing, linting, typechecking, and multi-platform packaging for Windows, macOS, and Linux.

### Removed
- Removed FastAPI Python execution sidecar and port 8000 dependencies in favor of native Rust execution.
- Removed bundled FFmpeg binaries to ensure minimal installer footprints.
