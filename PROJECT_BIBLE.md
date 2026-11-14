# NightShift Project Bible

> The long-lived reference for **what NightShift is, why it exists, how it is built, and where it is going.**
> Version plans (`NIGHTSHIFT_V0_x_PLAN.md`) own the details of a single release. This document owns the direction. If a release plan contradicts this document, resolve it explicitly and record the outcome in `docs/DECISIONS.md` and in the "Decision log" below.
> Last updated: v0.2 planning (October 2026). Update it whenever a decision changes, not only at release time.

---

## 1. Vision

**NightShift is a central desktop platform for powerful command-line tools.**

Command-line tools are the most capable software most people never fully use, because their options are scattered, hard to remember and awkward to reuse. NightShift gives them one home:

1. **Pick** the tools you want; NightShift helps you install or locate them.
2. **Use** them through visual forms *or* raw commands, with the exact command always visible and editable.
3. **Save** what you did as a reusable **template**; **share** templates as files.
4. **Batch** a template over files and folders.
5. Later: **combine** tools into **workflows** (think ComfyUI, but for CLI tools), run them headless, trigger them automatically.

FFmpeg was the first tool. It is **an example, not the identity** of the product.

### Origin (for context, not for marketing)
Built first for the maintainer's own need: small post-production jobs on project assets (convert, compress, crop, strip audio, fix keyframes for scroll-driven video) done with FFmpeg and ImageMagick, with commands scattered across projects and constantly forgotten. The idea is open source because others likely share the problem.

## 2. Positioning and messaging

- **Is:** a platform for CLI tools; a command workbench; a reusable-templates and batch system.
- **Is not:** an FFmpeg wrapper; a video/image/audio editor; a Photoshop/After Effects alternative; a media player; a terminal replacement (an interactive terminal may come later as an addition).
- **Tone:** practical, developer-friendly, honest about limits. Never claim a feature that is parked.
- **Do not** describe the product by its first tool. Lead with "tools, templates, batch".
- **Honesty rules:** tools are never bundled (downloaded or detected on the user's machine); shared templates are scripts and are reviewed before use; unsigned builds are explained in the README.
- **Audience:** developers and technical creators who run small, repeatable jobs: web developers handling assets, people automating media tasks, and, later, people doing analysis and forensics.

## 3. Principles (decision filters)

1. **Platform over product.** No shared code may know about a specific tool. Tool knowledge lives in specs (data) or in a tool's own folder.
2. **The command is the truth.** The UI builds a command; the user can always see it, copy it, edit it.
3. **Data, not code, for anything shareable.** Specs and templates are JSON. No script execution, no `eval`.
4. **No shell, ever.** Argv arrays only. The frontend never supplies an executable path.
5. **Never bundle tool binaries.** Avoids licence entanglement and bloat. Tools are installed on request, detected, or user-pointed; downloads are verified by SHA-256.
6. **Native first.** Prefer Rust/Tauri. Introduce Python only where a feature genuinely needs it, and then as an on-demand, authenticated runtime, not an always-on server.
7. **Pure core.** The logic that builds, validates and plans commands is pure TypeScript with no UI or Tauri imports, so a headless CLI can reuse it.
8. **Start small, design for the future.** Ship the smallest useful thing, but shape file formats and module boundaries for what is coming (e.g. templates are already one-node workflows).
9. **Safe by default.** Validate before running, surface errors clearly, never auto-run imported content, never silently overwrite.
10. **Honest versions.** Schemas are versioned, migrations are tested, backups are made before migrating.

## 4. Glossary

| Term | Meaning |
|---|---|
| Tool | A CLI program family (`ffmpeg`, `vips`, user-defined). May have several binaries. |
| ToolSpec | Declarative JSON describing a tool: binaries, install/detect, commands, parameters, rules, argument template, ports. |
| Command | One way to use a tool inside a spec. |
| Port | Declared input/output of a command (file, files, folder), typed by extension group. |
| Template | A saved, shareable configuration of one command (params or raw command + variables). A one-node workflow. |
| Workflow | A graph of nodes (commands) connected by typed file ports. Designed in v0.2, executed from v0.3. |
| Workbench | UI + state where a command is configured. |
| Job / Batch | One execution / a planned set of jobs over many inputs. |
| Manifest | `tools-manifest.json`: pinned download URLs + SHA-256 for managed installs. |
| Trust tier | `bundled` (ships with the app) or `user` (local, user-added). |

## 5. Architecture overview

- **Shell:** Tauri v2 (Rust). **Frontend:** Next.js static export (React 19, Tailwind, shadcn/ui). **State:** Redux Toolkit. **Validation:** Zod.
- **Rust owns:** process spawning (argv, no shell), progress parsing, cancel, input expansion, spec loading, the tool manager (detect/download/verify/extract/install), settings.
- **TypeScript core (`src/core`, pure):** spec schema, expression evaluator, argument builder, validation, template schema/migration/review, batch planning, tokenizer.
- **Executor abstraction:** `TauriExecutor` in the app, `MockExecutor` in browser/tests.
- **No local HTTP server** exists in the app. (The v0.0 FastAPI sidecar prototype is tagged `sidecar-prototype` and removed.)
- **Rich vs generated UI:** tools with very conditional options (FFmpeg) may register a builtin panel/builder (bundled specs only). Other tools get an auto-generated panel from their spec.

Authoritative current-state detail: `APP_ARCHITECTURE.md`. Release specifics: the version plans.

## 6. Roadmap

| Version | Status | Theme | Highlights |
|---|---|---|---|
| **0.1** | Done | The FFmpeg release | Tauri + Next.js app, Rust runner, tool manager, video tool (trim, crop, keyframes, web-optimized, GIF, watermark), queue, templates, installers, updater |
| **0.2** | In progress | Platform core | ToolSpec engine, generic tool manager and catalog, custom tools, **libvips** as second tool, **templates** (library, import/export, safe-import review), **batch**; workflow file format designed but not executed |
| **0.3** | Planned | Workflows | Multi-node execution, typed ports, temp workspaces, caching and partial reruns, headless CLI (`nightshift run`), folder-watch trigger — [design document](docs/WORKFLOWS_DESIGN.md) |
| **0.4** | Planned | Editor + extensions | Visual node editor, interactive terminal (PTY), extension runtime (on-demand, token-authenticated Python), more tools (audio, forensics) |
| **0.5+** | Vision | Ecosystem | Signed template/spec registry or marketplace, LLM/HTTP nodes (BYO key or local models), scheduling, tool update checks |
| Unscheduled | Backlog | Polish | Code signing/notarization, run history, spec authoring UI, localisation |

## 7. Tool catalog (candidates)

Priority favours tools that ship as a single binary or simple archive. Python/Node-based tools need runtime management and come later. Always verify each tool's licence and available builds before adding; downloading without bundling avoids most redistribution problems but not all terms.

| Area | Tools | Status |
|---|---|---|
| Video/audio | FFmpeg (+ffprobe) | **Shipped (v0.1)** |
| Image | **libvips** | **Next (v0.2)** |
| Image | ImageMagick, cwebp/dwebp, avifenc, oxipng, pngquant, mozjpeg, gifsicle | Candidate |
| Video/audio | HandBrakeCLI, mkvtoolnix, SoX | Candidate |
| Metadata/docs | ExifTool, pandoc, qpdf, Poppler utils, Ghostscript | Candidate |
| Download/speech | yt-dlp, whisper.cpp, Tesseract | Candidate |
| Forensics | binwalk, YARA, Sleuth Kit, foremost | Later (v0.4+) |
| Web assets | svgo (Node), scour (Python) | Later (needs runtimes) |

Known packaging reality: libvips publishes official Windows binaries, but macOS/Linux users usually install through a package manager (to verify during v0.2). The tool manager therefore supports *managed download*, *system detection*, and *custom path*, with install hints where no download exists.

## 8. Security model

- Execution: argv arrays, no shell; Rust resolves binaries; argv size capped; NUL bytes rejected.
- Downloads: HTTPS + pinned SHA-256 from a manifest (embedded fallback); zip-slip protection; atomic installs; cleanup on failure. The manifest is the trust root: protect the repository (2FA, branch protection).
- Templates: never auto-run on import; review screen with warnings (raw command, URL schemes, absolute paths, risky flags, version mismatch); no executable paths inside files; paths are machine-local and stripped on export; size limits; newer schema versions refused.
- Specs: data only; builtin builders/panels allowed only for bundled specs; user specs live in a local folder and are badged; no remote spec install until signing exists.
- Updater: signed artifacts; the private key must be backed up offline (losing it means existing installs can never auto-update).
- Custom tools run whatever the user points to, equivalent to the user running it in a terminal.
- No telemetry.

## 9. Licensing and third-party tools

- The project licence is declared in `LICENSE` (maintainer decision).
- Tools are downloaded/detected on the user's machine and are **not distributed** by NightShift. `THIRD_PARTY_NOTICES.md` lists each tool, where it comes from and its licence.
- Do not mirror upstream builds into this project's releases (mirroring is redistribution).
- Prefer upstream builds without non-free components; record the licence of each chosen build.

## 10. Brand

- Main brand colour: **purple**; existing cyberpunk/night theme in the UI.
- Logo: cool and minimalistic; must also suit future forensic capabilities (not toy-like).
- Placeholder icon until final branding is supplied.

## 11. Community and contribution

- Open source; distributed through GitHub Releases.
- `CONTRIBUTING.md` explains what contributors need, not everything: dev setup (`pnpm install && pnpm tauri dev`), the quality gate, how to add a tool (spec + manifest entry + golden tests + smoke test), how to add a golden test.
- Feedback strategy: ask developers what post-production and repetitive CLI work they do, whether they use custom scripts or other tools, and how they manage it, without leading with the product name.

## 12. Non-goals (revisit only deliberately)

- Graphical editing or media preview.
- Hiding the command from the user.
- Bundling tool binaries.
- Cloud accounts or telemetry in the core app.
- Running package managers or elevating privileges on the user's behalf (v0.2).
- A general-purpose terminal emulator as the primary UI (an interactive terminal is a later addition, not a replacement for forms and templates).

## 13. Decision log

| Date | Decision | Notes |
|---|---|---|
| Earlier | Tauri v2, Next.js (not Vite), Redux, Zod | TanStack Form dropped for the tool UIs to avoid two owners of form state |
| Earlier | Remove the FastAPI sidecar for v0.1; native Rust execution | Python only for features that truly need it, later, on demand |
| Earlier | Never bundle binaries; download/detect/custom path | Avoids licence and size issues |
| Oct 2026 | v0.1 shipped | FFmpeg release |
| Oct 2026 | **Direction correction: platform for CLI tools, not a video/image/audio tool** | Marketing and code must reflect it |
| Oct 2026 | v0.2 focus: templates (custom settings or raw commands, import/export/share) and batch | libvips is the next tool |
| Oct 2026 | Workflows (ComfyUI-style) are the long-term vision; v0.2 is **design-only** for multi-step chains | Templates are stored as one-node workflows so v0.3 is additive |
| Oct 2026 | `ffprobe` becomes a helper binary of the `ffmpeg` tool | One tool, two binaries |
| Oct 2026 | FFmpeg keeps its builtin rich panel/builder; generic tools use spec-generated panels | Avoids regression, proves the platform with libvips |
| Nov 2026 | Workflow design document completed | `docs/WORKFLOWS_DESIGN.md` covers 14 sections: data model, execution, caching, failure semantics, headless runner, triggers, security, migration — see [design doc](docs/WORKFLOWS_DESIGN.md) |

## 14. Open questions

- Exact template/pack file extensions and whether to register file associations.
- Whether community-authored specs should ever be installable from a registry (needs signing first).
- How to present multiple commands per tool in the catalog without overwhelming new users.
- Which tools after libvips (ImageMagick vs yt-dlp vs ExifTool) give the best proof of generality and user value.
- When to invest in code signing/notarization.

## 15. How to maintain this document

- Change the **roadmap** and **decision log** whenever scope moves; keep release-level detail in the version plans.
- When a principle is broken on purpose, write the exception in the decision log with the reason.
- Keep this file under ~300 lines; link to detailed docs instead of copying them.
