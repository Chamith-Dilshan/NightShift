# Graph Report - NightShift  (2026-10-05)

## Corpus Check
- Corpus is ~38,399 words - fits in a single context window. You may not need a graph.

## Summary
- 674 nodes · 1341 edges · 58 communities (27 shown, 31 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.86)
- Token cost: 503 input · 244 output

## Community Hubs (Navigation)
- Persistence and Form Validation
- Frontend Application Components
- Rust Errors and Probe Logic
- Frontend Dependencies and Utilities
- Media Input and Settings Panels
- Execution Adapters and Terminal
- Workspace Build Dependencies
- Tauri Packaging and Icons
- TypeScript Compiler Configuration
- Native Job Lifecycle
- Component Registry Configuration
- Shared UI Components
- System Architecture Concepts
- Typography and Theme Controls
- Native Log Line Splitting
- FFmpeg Progress Parsing
- Tauri Permission Capabilities
- Cross-Platform Release Workflow
- Release Version Consistency
- Cross-Platform CI Workflow
- Tabs User Interface
- Native Filesystem Path Validation
- Project Documentation
- Firefly Visual Background
- Persistent Template Storage
- ESLint Configuration
- Next.js Configuration
- PostCSS Configuration
- Batch Processing Queue
- CI/CD Workflows
- First-Run Setup Wizard
- Video Rule Validation
- Video Editing Studio
- Desktop App Identity
- File Type Icon
- Globe Navigation Icon
- Next.js Logo
- Vercel Logo
- Window Icon
- NightShift App Icon 128px
- NightShift App Icon Retina
- NightShift App Icon 32px
- NightShift Square Logo 107px
- NightShift Square Logo 142px
- NightShift Square Logo 150px
- NightShift Square Logo 284px
- NightShift Square Logo 30px
- NightShift Square Logo 310px
- NightShift Logo Icon 44px
- NightShift App Icon 71px
- NightShift App Icon 89px
- NightShift Store Logo
- NightShift App Icon

## God Nodes (most connected - your core abstractions)
1. `useAppDispatch()` - 35 edges
2. `useAppSelector` - 33 edges
3. `isTauri()` - 22 edges
4. `selectVideoSettings()` - 21 edges
5. `ToolManager` - 20 edges
6. `getExecutor()` - 17 edges
7. `Button()` - 16 edges
8. `compilerOptions` - 16 edges
9. `tool_install()` - 15 edges
10. `AppError` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Native Rust Execution Engine` --semantically_similar_to--> `Rust Execution Pipeline`  [INFERRED] [semantically similar]
  CHANGELOG.md → APP_ARCHITECTURE.md
- `FFmpeg and FFprobe Third-Party Tools` --semantically_similar_to--> `FFmpeg and FFprobe`  [INFERRED] [semantically similar]
  THIRD_PARTY_NOTICES.md → APP_ARCHITECTURE.md
- `First-Run Tool Manager` --semantically_similar_to--> `Tool Manager and Binary Provisioning`  [INFERRED] [semantically similar]
  README.md → APP_ARCHITECTURE.md
- `Dynamic Codec Resolution` --semantically_similar_to--> `Dynamic Codec Resolution`  [INFERRED] [semantically similar]
  CHANGELOG.md → APP_ARCHITECTURE.md
- `Disk-Based Template Persistence` --semantically_similar_to--> `Disk Template Persistence`  [INFERRED] [semantically similar]
  README.md → CHANGELOG.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cross-Platform CI Validation** — _github_workflows_ci_workflow, _github_workflows_ci_ubuntu_2204, _github_workflows_ci_windows_latest, _github_workflows_ci_macos_latest [EXTRACTED 1.00]
- **Cross-Platform Release Packaging** — _github_workflows_release_workflow, _github_workflows_release_macos_latest, _github_workflows_release_ubuntu_2204, _github_workflows_release_windows_latest [EXTRACTED 1.00]
- **NightShift Desktop Application Stack** — app_architecture_tauri_v2_host, app_architecture_nextjs_static_export, app_architecture_redux_toolkit_state_management, app_architecture_rust_execution_pipeline [EXTRACTED 1.00]

## Communities (58 total, 31 thin omitted)

### Community 0 - "Persistence and Form Validation"
Cohesion: 0.07
Nodes (47): ValidationSummary(), ValidationSummaryProps, Hydrator(), hydrate(), persistenceListener, loadLastSettingsFromDisk(), loadTemplatesFromDisk(), saveLastSettingsToDisk() (+39 more)

### Community 1 - "Frontend Application Components"
Cohesion: 0.14
Nodes (33): HomePage(), VideoToolPage(), Button(), buttonVariants, Input(), Label(), SelectContent(), SelectItem() (+25 more)

### Community 2 - "Rust Errors and Probe Logic"
Cohesion: 0.11
Nodes (43): Error, Ok, Path, S, Serialize, AppError, Result, String (+35 more)

### Community 3 - "Frontend Dependencies and Utilities"
Cohesion: 0.04
Nodes (47): @base-ui/react, class-variance-authority, clsx, cn, @hookform/resolvers, lucide-react, next, dependencies (+39 more)

### Community 4 - "Media Input and Settings Panels"
Cohesion: 0.09
Nodes (26): SettingsPage(), SetupPage(), basename(), extractProbeSummary(), InputPanel(), isMediaFile(), MEDIA_EXTENSIONS, parseFraction() (+18 more)

### Community 5 - "Execution Adapters and Terminal"
Cohesion: 0.07
Nodes (19): TerminalOutput(), TerminalOutputProps, MockExecutor, TauriExecutor, Capabilities, Executor, InstallEvent, JobEvent (+11 more)

### Community 6 - "Workspace Build Dependencies"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, shadcn, tailwindcss, @tailwindcss/postcss (+32 more)

### Community 7 - "Tauri Packaging and Icons"
Cohesion: 0.06
Nodes (32): https://github.com/example/nightshift/releases/latest/download/latest.json, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, security (+24 more)

### Community 8 - "TypeScript Compiler Configuration"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 9 - "Native Job Lifecycle"
Cohesion: 0.13
Nodes (21): AtomicBool, ChildStdin, ActiveJob, cancel_job(), JobEvent, Jobs, JobSpec, AppHandle (+13 more)

### Community 10 - "Component Registry Configuration"
Cohesion: 0.09
Nodes (22): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+14 more)

### Community 11 - "Shared UI Components"
Cohesion: 0.14
Nodes (11): ComingSoon(), ComingSoonProps, PanelBlock(), PanelBlockProps, AnimatedThemeToggler(), AnimatedThemeTogglerProps, getThemeTransitionClipPaths(), polygonCollapsed() (+3 more)

### Community 12 - "System Architecture Concepts"
Cohesion: 0.11
Nodes (19): Dynamic Codec Resolution, Executor Abstraction, FFmpeg and FFprobe, Next.js Static Export UI, NightShift Desktop Application, Pure Functional Command Construction, Redux Toolkit State Management, Rust Execution Pipeline (+11 more)

### Community 13 - "Typography and Theme Controls"
Cohesion: 0.13
Nodes (10): monotonFont, proFont, inter, metadata, GlitchButtonProps, RadioGroup(), RadioGroupContext, RadioGroupContextValue (+2 more)

### Community 14 - "Native Log Line Splitting"
Cohesion: 0.24
Nodes (12): LineSplitter, Default, Option, Self, String, Vec, test_chunk_boundary_between_cr_and_lf(), test_chunk_boundary_cr_not_followed_by_lf() (+4 more)

### Community 15 - "FFmpeg Progress Parsing"
Cohesion: 0.24
Nodes (10): parse_hhmmss_to_ms(), ParsedProgress, ProgressParser, Default, HashMap, Option, Self, String (+2 more)

### Community 16 - "Tauri Permission Capabilities"
Cohesion: 0.13
Nodes (14): clipboard-manager:allow-read-text, clipboard-manager:allow-write-text, core:default, dialog:default, main, opener:default, process:default, store:default (+6 more)

### Community 17 - "Cross-Platform Release Workflow"
Cohesion: 0.18
Nodes (11): macOS Release Runner, Release Platform Matrix, Version Tag Release Trigger, Tauri Multi-Platform Release Build, Ubuntu 22.04 Release Runner, Release Version Sync Check, Windows Release Runner, Release Workflow (+3 more)

### Community 18 - "Release Version Consistency"
Cohesion: 0.22
Nodes (8): cargoContent, cargoPath, cargoVersionMatch, pkg, pkgPath, rootDir, tauriConf, tauriConfPath

### Community 19 - "Cross-Platform CI Workflow"
Cohesion: 0.33
Nodes (6): macOS CI Runner, CI Platform Matrix, CI Quality Checks, Ubuntu 22.04 CI Runner, Windows CI Runner, Continuous Integration Workflow

### Community 21 - "Native Filesystem Path Validation"
Cohesion: 0.47
Nodes (5): check_paths(), PathInfo, Option, String, Vec

### Community 22 - "Project Documentation"
Cohesion: 0.40
Nodes (5): pnpm Workspace Configuration, Building NightShift from Source, GitHub Releases, NightShift README, Third-Party Notices

## Knowledge Gaps
- **213 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+208 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend Dependencies and Utilities` to `Workspace Build Dependencies`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `useAppDispatch()` connect `Frontend Application Components` to `Persistence and Form Validation`, `Shared UI Components`, `Media Input and Settings Panels`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `selectVideoSettings()` (e.g. with `AudioPanel()` and `CropPanel()`) actually correct?**
  _`selectVideoSettings()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _213 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Persistence and Form Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.06583850931677018 - nodes in this community are weakly interconnected._
- **Should `Frontend Application Components` be split into smaller, more focused modules?**
  _Cohesion score 0.14143775569842199 - nodes in this community are weakly interconnected._
- **Should `Rust Errors and Probe Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.10667634252539913 - nodes in this community are weakly interconnected._