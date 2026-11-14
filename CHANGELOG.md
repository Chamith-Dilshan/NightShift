# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-14

### Added
- **Spec Engine (pure TypeScript):** Declarative ToolSpec format describing tools via JSON — binaries, install/detect, commands, parameters, validation rules, argument templates, input/output ports, and progress parsers. Zod validation, expression evaluator, deterministic argument builder, version comparison utilities.
- **Tool Catalog (`/tools`):** Browse all available tools with status badges (installed, missing, custom), install/detect/custom-path actions, and an "Add your own tool" entry for custom executables.
- **libvips as the second tool:** Image processing via `vipsthumbnail` and `vips` — thumbnail, convert, and info commands. Added with **zero changes** to `src/core` or `src-tauri/src`, proving the platform is real.
- **Generic Workbench (`/tool?id=<id>`):** Per-tool workbench page with auto-generated forms from spec parameters, live command preview, and raw command mode with variables.
- **Templates (shareable format):** NightShiftTemplate format (`.nightshift-template.json` single, `.nightshift-pack.json` packs) with graph-ready structure. Save, duplicate, rename, tag, delete, apply, export, and import configurations. Built-in presets migrated from v0.1.
- **Template Import Security:** Review screen before saving — shows tools required, mode badge, resolved command preview, content hash, and warnings for raw mode, URL schemes, absolute paths, missing tools, and multi-node graphs. File size limits (1 MB), pack limits (200 templates), argv token limits (10,000). Path parameters are stripped on export and recorded in `portableGaps`.
- **Batch Processing:** Folder/file input selection, output options (directory, flat/mirror structure, name pattern with tokens, conflict policy: rename/overwrite/skip), dry-run plan table with summary, concurrent execution (default 1, max = logical cores), failure policy (continue/stop-on-first), and completion summary with before/after sizes.
- **Workflow Design Document:** `docs/WORKFLOWS_DESIGN.md` — 14-section design for v0.3 multi-node workflows covering data model, execution model, caching, failure semantics, sub-workflows, headless runner, triggers, and security.
- **Graph Validation:** `validateGraph()` rejects multi-node graphs, non-empty edges, and non-`$input` references with specific error messages, ensuring v0.2 templates remain single-node.
- **Rust Backend Generalization:** `ToolManager` refactored from hardcoded `Tool` enum to string-based `ToolId`, enabling any spec-defined tool to be discovered and executed.
- **flexsearch:** Full-text search library installed for template and tool catalog search.

### Changed
- **Platform Positioning:** NightShift is now "a platform for CLI tools" — FFmpeg is the first tool, not the identity of the product. Home page, README, and all public copy reflect this.
- **Tool Manager:** Generalized from FFmpeg-only to support any tool via specs. `ffprobe` is now a helper binary of the `ffmpeg` tool, not a separate tool.
- **Settings v2:** Per-tool settings schema with managed/system/custom source tracking.
- **Templates Library (`/templates`):** Full library UI with search, tool filter, import review modal, export (single/all), duplicate, and delete.
- **Routing:** `/video` redirects to `/tool?id=ffmpeg`. Static-export-safe routes: `/`, `/tools`, `/tool?id=<id>`, `/templates`, `/settings`.
- **tools-manifest.json:** Migrated from schema v1 to v2 (`platforms`→`artifacts`, `files`→`bins`). Added libvips entry using official `libvips/build-win64-mxe` Windows binaries.
- **Test Structure:** All test files moved to `tests/` directory with proper subdirectories for future Playwright compatibility.
- **Theme Consistency:** Replaced hardcoded colors (e.g., `text-red-400`) with CSS theme tokens (`text-destructive`, `text-primary`, etc.) across all new components.

### Removed
- **v0.1 Migration Code:** Removed `migrations.ts`, `migrate.ts`, and `VideoTemplate` interface. Templates now use only `NightShiftTemplate` format.
- **Hardcoded Tool Types:** Removed `enum Tool { Ffmpeg, Ffprobe }` from shared Rust code. Tool discovery is now registry-based.

### Fixed
- `compareVersions` now handles unparseable version strings gracefully by disabling range checks with a warning instead of crashing.

---

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
