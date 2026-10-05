# NightShift: Application Architecture & Technical Specification

NightShift is a native desktop media processing utility built on **Tauri v2**, **Next.js** (static export), and **Redux Toolkit**. It provides an interactive visual studio for FFmpeg, executing processes directly via an asynchronous Rust subprocess runner with live logs, structured progress parsing, and zero bundled sidecar bloat.

---

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Tauri v2 Host (Rust)                            │
│  Commands: run_job, cancel_job, probe_media, check_paths,             │
│            tool_status, tool_capabilities, tool_install,               │
│            tool_set_custom_path                                        │
│  State:    Jobs (active children, cancel flags), ToolManager           │
│  Plugins:  dialog, clipboard-manager, store, updater, opener, process  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Next.js Static Export (React 19 + Redux)             │  │
│  │  - Redux: videoSlice, jobsSlice, templatesSlice, toolsSlice      │  │
│  │  - Pure: commandBuilder, outputPlanner, resolveCodecs, parser    │  │
│  │  - Validation: 17 rules (V1-V17)                                 │  │
│  │  - Executor: TauriExecutor (native) | MockExecutor (browser)     │  │
│  │  - UI: Video Studio, Batch Queue, Presets, Settings, Setup       │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ Subprocess spawn (argv array, no shell)
                               ┌──────▼───────┐   ┌────────────────┐
                               │ ffmpeg       │   │ ffprobe        │
                               │ (managed or  │   │ (managed or    │
                               │ system PATH) │   │ system PATH)   │
                               └──────────────┘   └────────────────┘
```

---

## 2. Directory Structure

```
NightShift/
├── src/                                  # Next.js Static Export Source
│   ├── app/                              # App Router Pages
│   │   ├── layout.tsx                    # Root layout with ReduxProvider & Hydrator
│   │   ├── page.tsx                      # Dashboard / Studio launcher
│   │   ├── video/page.tsx                # Video Studio page
│   │   ├── settings/page.tsx             # Tools & Update settings page
│   │   └── setup/page.tsx                # First-run tool installer wizard
│   │
│   ├── components/                       # UI Components
│   │   ├── ui/                           # Primitive UI components (shadcn/ui)
│   │   └── videoTool/                    # Tool parameter panels
│   │       ├── InputPanel.tsx            # File picker & drag-drop handler
│   │       ├── OutputPanel.tsx           # Output naming & collision settings
│   │       ├── VideoPanel.tsx            # Codecs, rate control, presets, scale
│   │       ├── AudioPanel.tsx            # Audio codecs, bitrates, channels
│   │       ├── TrimPanel.tsx             # Clip trimming with duration hints
│   │       ├── CropPanel.tsx             # Canvas cropping
│   │       ├── KeyframePanel.tsx         # GOP / All-Intra keyframe interval
│   │       ├── FiltersPanel.tsx          # Grayscale, blur, sharpen, saturation
│   │       ├── TransformPanel.tsx        # Rotate & flips
│   │       ├── WatermarkPanel.tsx        # 9-point anchor watermark overlay
│   │       ├── TemplateManager.tsx       # Presets management & JSON import/export
│   │       ├── QueuePanel.tsx            # Batch processing queue UI
│   │       └── ValidationSummary.tsx     # Error & warning diagnostics summary
│   │
│   ├── lib/                              # Core Utilities & Execution Layer
│   │   ├── isTauri.ts                    # Tauri environment detector
│   │   └── executor/                     # Process Execution Abstraction
│   │       ├── types.ts                  # Executor & Job data interfaces
│   │       ├── tauriExecutor.ts          # Native Tauri IPC implementation
│   │       ├── mockExecutor.ts           # Browser dev mock executor
│   │       └── index.ts                  # getExecutor factory
│   │
│   └── store/                            # Redux State Management
│       ├── store.ts                      # Central store configuration
│       ├── hooks.ts                      # Typed hooks
│       ├── ReduxProvider.tsx             # Store provider wrapper
│       ├── videoTool/                    # Video slice & pure algorithms
│       │   ├── types.ts                  # Video settings & probe models
│       │   ├── videoSlice.ts             # Video parameters slice
│       │   ├── codecRules.ts             # Container codec compatibility engine
│       │   ├── commandBuilder.ts         # Pure FFmpeg argument generator
│       │   ├── outputPlanner.ts          # Output filename & collision resolver
│       │   ├── commandParser.ts          # CLI string tokenizing and formatting
│       │   ├── videoSchema.ts            # Zod schema and V1-V17 validator
│       │   └── selectors.ts              # Memoized selectors
│       ├── templates/                    # Presets & Templates slice
│       │   ├── types.ts                  # Template model
│       │   ├── presets.ts                # Default built-in presets
│       │   ├── migrations.ts             # Legacy format migrations
│       │   └── templatesSlice.ts         # Templates slice
│       ├── jobs/                         # Queue & Execution slice
│       │   ├── jobsSlice.ts              # Batch queue state
│       │   ├── queueThunks.ts            # Sequential queue runner
│       │   └── logStore.ts               # Virtualized log ring buffer
│       ├── tools/                        # Tool status slice
│       │   └── toolsSlice.ts             # Detected tools & capabilities
│       └── persistence/                  # Storage & hydration
│           ├── storage.ts                # Disk / Store plugin adapter
│           ├── listener.ts               # Debounced Redux listener middleware
│           └── hydrate.tsx               # Client hydration component
│
├── src-tauri/                            # Rust Native Host (Tauri v2)
│   ├── src/
│   │   ├── lib.rs                        # Plugin registration & command handlers
│   │   ├── main.rs                       # Entrypoint
│   │   ├── jobs.rs                       # Subprocess execution & cancel manager
│   │   ├── tools.rs                      # Binary resolution, download & install
│   │   ├── probe.rs                      # ffprobe JSON extractor
│   │   ├── paths.rs                      # Direct filesystem path inspector
│   │   ├── line_splitter.rs              # Zero-allocation chunk line splitter
│   │   ├── progress.rs                   # FFmpeg -progress pipe:1 parser
│   │   └── error.rs                      # Application error taxonomy
│   ├── resources/
│   │   └── tools-manifest.fallback.json  # Embedded static tool download fallback
│   ├── capabilities/
│   │   └── default.json                  # Restrictive capability permissions
│   ├── Cargo.toml                        # Rust dependencies
│   └── tauri.conf.json                   # Desktop bundle & security settings
│
├── tools-manifest.json                   # Verified binary sources & checksums
├── scripts/
│   └── check-version.mjs                 # Cross-manifest version validator
├── .github/workflows/
│   ├── ci.yml                            # CI matrix (lint, test, clippy, build)
│   └── release.yml                       # Multi-platform release packaging
├── package.json
└── README.md
```

---

## 3. Core Subsystems

### 3.1 Rust Execution Pipeline (`jobs.rs`, `line_splitter.rs`, `progress.rs`)
- **Process Spawning:** Spawns binaries directly via `tokio::process::Command` without shell wrappers, passing arguments as a typed `argv` array.
- **Windows Integration:** Spawns with `CREATE_NO_WINDOW` (`0x0800_0000`) to eliminate console window flashes.
- **Stream Ingestion:** Reads stdout and stderr asynchronously using chunked buffers split on `\r\n`, `\n`, or standalone `\r`.
- **Structured Progress Parsing:** Ingests `-progress pipe:1 -nostats` key-value blocks and emits throttled progress events with playback duration, speed, fps, bitrate, and percentage.
- **Graceful Cancellation:** Writes `q` to child stdin, falling back to process kill if unresponsive after 5 seconds. Automatically removes partial output files on failure or cancellation.

### 3.2 Tool Manager & Binary Provisioning (`tools.rs`)
- **Zero-Bundle Policy:** Installers remain lightweight because binaries are not packaged in the bundle.
- **Resolution Order:** `Custom Path` > `Managed App Data Install` > `System PATH` (via `which`) > `Missing`.
- **Atomic Installation:** Downloads static builds from verified GitHub release manifests, computes SHA-256 hashes, extracts archives (`zip` / `tar.xz`), and moves them atomically into versioned application storage.
- **Encoder Capabilities:** Queries `ffmpeg -encoders` once per binary version and dynamically adjusts UI capabilities.

### 3.3 Pure Functional Command Construction (`commandBuilder.ts`)
- Pure function mapping `VideoSettings` into exact CLI arguments without side effects or store mutations.
- Enforces fixed argument orders: collision flag (`-n` vs `-y`), trim (`-ss`, `-to` before `-i`), main input, watermark input, filter graphs, video codec options, audio options, container flags (`+faststart`), stream hygiene (`-sn -dn`), and output path.

### 3.4 Dynamic Codec Resolution (`codecRules.ts`)
- Pure compatibility rules that adapt user selections (e.g. H.264 when switching to WebM becomes VP9) without overwriting user state in Redux. Switching containers back restores the user's original selection.
