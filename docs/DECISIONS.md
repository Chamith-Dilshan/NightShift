# NightShift v0.2 — Decisions Log

Records deviations from the plan, audit findings, and design decisions.

---

## 2026-11-14: M0 Audit Findings

### v0.1.0 Tag Missing
The `v0.1.0` git tag does not exist locally (only `sidecar-prototype`). The current `main` branch is the v0.1 baseline. Proceeding without the tag; the owner will handle proper tagging and publishing.

### Audit: Real v0.1 Code vs Plan Assumptions

#### 1. Tool Enum (tools.rs)
**Finding:** `enum Tool { Ffmpeg, Ffprobe }` exists in `src-tauri/src/tools.rs`.
**Plan assumption:** Correct — the enum needs to be replaced with registry lookups.
**Decision:** Replace with tool-id + binary-id string-based lookups in M2.

#### 2. Progress Injection (jobs.rs)
**Finding:** Lines 141-149 in `jobs.rs` hardcode `-progress pipe:1` and `-nostats` injection only for `Tool::Ffmpeg`.
**Plan assumption:** Correct — progress config must come from the spec.
**Decision:** In M2, make progress injection spec-driven. The `ffmpeg-progress` parser stays, but is selected by spec data, not the Tool enum.

#### 3. JobSpec (jobs.rs)
**Finding:** `JobSpec` contains `tool: Tool` (the enum). Needs to become `tool_id: String, binary_id: String, command_id: String`.
**Plan assumption:** Correct.
**Decision:** Update JobSpec in M2 per section 6.1 of the plan.

#### 4. Tools Manifest (tools-manifest.json)
**Finding:** Schema v1, single tool (ffmpeg). Structure: `tools[id].platforms[platform].files[binary]` maps to archive paths. SHA-256 fields are empty strings.
**Plan assumption:** Plan says schema v2 with `artifacts` instead of `platforms`. The real v0.1 uses `platforms`.
**Decision:** Migrate to schema v2 in M2. The `platforms` key becomes `artifacts` per the plan. Keep the same download URLs for now.

#### 5. VideoSlice (videoSlice.ts)
**Finding:** FFmpeg-specific slice with categorized settings: `output`, `video`, `audio`, `trim`, `crop`, `filters`, `transforms`, `watermark`, `gif`. Public API: setters for each category, input file management, command mode (auto/manual).
**Plan assumption:** Correct — videoSlice stays as a builtin for FFmpeg.
**Decision:** In M3, `git mv` video code to `src/tools/ffmpeg/` and wrap with `WorkbenchAdapter`.

#### 6. Templates (templates/types.ts)
**Finding:** `VideoTemplate` is FFmpeg-specific: `settings: VideoSettings`. Schema version 1.
**Plan assumption:** Correct — templates need to become tool-agnostic.
**Decision:** In M4, migrate to `NightShiftTemplate` with `tool`, `command`, `mode`, `params`/`raw` fields.

#### 7. Storage (persistence/storage.ts)
**Finding:** Uses Tauri Store plugin for `templates.json` and `settings.json`. LocalStorage fallback for web. Templates exclude built-in ones from persistence.
**Plan assumption:** Plan mentions `templates.json` via store plugin — matches.
**Decision:** Keep the storage mechanism. Migrate the data format in M4.

#### 8. Routing (app/page.tsx)
**Finding:** Home page is FFmpeg-centric ("Desktop Media Processing Engine"). Links to `/video`, `/setup`, `/settings`. No `/tools` or `/templates` routes yet.
**Plan assumption:** Plan says home should be a tool catalog. `/video` redirects to `/tool?id=ffmpeg`.
**Decision:** In M5, rewrite home page and add new routes per section 10.1.

#### 9. Settings Storage
**Finding:** `settings.json` stores only `lastSettings` (VideoSettings) — the last UI state, not tool installation status. Tool status comes from the Rust backend.
**Plan assumption:** Plan mentions settings v2 with tool installation info.
**Decision:** The Rust `settings.rs` will manage tool installation settings. The frontend `settings.json` is just UI state.

### Owner Decisions Confirmed
- Template extensions: `.nightshift-template.json` and `.nightshift-pack.json`
- User specs: Allowed from local specs folder, no remote spec install
- FFmpeg builtin: Keep v0.1 video panels and videoSlice as builtin
- Project licence: Keep existing LICENSE

---

## 2026-11-14: M4 — libvips Manifest Decision (T-4.5)

### libvips Windows Download Source
**Decision:** Use **libvips/build-win64-mxe** (official) as the managed download source for Windows.
- URL: `https://github.com/libvips/build-win64-mxe/releases/download/v8.18.7/vips-dev-x64-web-8.18.7.zip`
- SHA-256: `3a122eb3d588690008216f786338e2f9329dba3c3c2768b5933cf7299d549241`
- Licence: LGPL-3.0 (same as libvips core)
- This is the official build system maintained by the libvips project
- kleisauke/libvips-packaging is a repackaging layer for pyvips/NetVips — we use the official source directly
- No macOS/Linux managed download — users install via Homebrew/apt with hints

### libvips Spec Authoring
**Fact verified:** libvips 8.18.7 is installed on this machine. The spec was authored from real `--help` output.
- `vips copy input output` — re-encode operation
- `vipsthumbnail input -s WIDTHxHEIGHT` — resize operation
- `vipsheader input` — metadata viewer
- Save options are appended to output filename in brackets (e.g., `out.jpg[Q=90,strip]`)

### Manifest Schema Migration
**Decision:** Migrate tools-manifest.json from schema v1 (`platforms`/`files`) to schema v2 (`artifacts`/`bins`) per the plan section 9.1.
