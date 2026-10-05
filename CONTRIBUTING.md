# Contributing to NightShift

Thank you for your interest in contributing to **NightShift**! NightShift is a modern, high-performance desktop media processing studio engineered with **Tauri v2**, **Next.js (Static App Router)**, **Redux Toolkit**, and a **Native Rust Execution Engine**.

We welcome contributions from developers of all experience levels—whether fixing a typo, optimizing FFmpeg filter graphs, enhancing native Rust streaming pipelines, or designing new UI controls.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Architecture Mental Model](#architecture-mental-model)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Coding Standards](#coding-standards)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Release Process](#release-process)

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and collaborative in all issues, pull requests, and discussions.

---

## Architecture Mental Model

Before writing code, it helps to understand NightShift's separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js 16 UI (Static Export)                              │
│ ┌──────────────────────┐      ┌───────────────────────────┐ │
│ │  Redux Toolkit Store │ ───> │  Pure Command Builders    │ │
│ │  (videoSlice, etc.)  │      │  (commandBuilder.ts)      │ │
│ └──────────────────────┘      └───────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON IPC (Tauri v2)
┌──────────────────────────────▼──────────────────────────────┐
│ Native Rust Engine (src-tauri)                              │
│ ┌──────────────────────┐      ┌───────────────────────────┐ │
│ │  jobs.rs / probe.rs  │ ───> │  FFmpeg / FFprobe Spawn   │ │
│ │  (streaming logs)    │      │  (unbuffered stdio pipes) │ │
│ └──────────────────────┘      └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

1. **Deterministic State:** The UI state lives entirely in Redux Toolkit (`src/store/`).
2. **Pure Builders:** All CLI argument arrays are constructed via deterministic, side-effect-free functions (`src/store/videoTool/commandBuilder.ts`).
3. **Rust Native Runner:** Process management, unbuffered log line splitting, probe inspection, and binary downloads are implemented in native Rust (`src-tauri/src/`) for maximum memory safety and performance. Zero sidecar bloat.
4. **Decoupled Executor:** The frontend executes commands via `TauriExecutor` in desktop mode or `MockExecutor` in browser preview mode (`src/lib/executor/`).

---

## Development Setup

### Prerequisites

- **Node.js:** `v22.0.0` or higher
- **pnpm:** `v10.0.0` or higher (`npm install -g pnpm`)
- **Rust:** Latest stable toolchain (`rustup update stable`)
- **System Build Tools:**
  - **Windows:** C++ build tools (Visual Studio 2022 Build Tools)
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
  - **Linux:** `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Initial Setup

1. **Fork and Clone the Repository:**
   ```bash
   git clone https://github.com/<your-username>/NightShift.git
   cd NightShift
   ```

2. **Install Frontend Dependencies:**
   ```bash
   pnpm install
   ```

3. **Verify Rust Environment:**
   ```bash
   cargo --version
   cargo check --manifest-path src-tauri/Cargo.toml
   ```

4. **Launch Development Environment:**
   - **Full Desktop App (Tauri + Next.js):**
     ```bash
     pnpm tauri dev
     ```
   - **Browser-Only Mode (Mock Execution):**
     ```bash
     pnpm dev
     ```

---

## Project Structure

```
NightShift/
├── src/                          # Next.js App Router frontend
│   ├── app/                      # Pages (/video, /setup, /settings)
│   ├── components/               # React components (UI & Panels)
│   ├── lib/                      # Utilities & Executor abstractions
│   └── store/                    # Redux slices, builders & schemas
├── src-tauri/                    # Native Rust backend
│   ├── src/
│   │   ├── jobs.rs               # Async process execution & streaming
│   │   ├── line_splitter.rs      # Unbuffered UTF-8 / CR line buffer
│   │   ├── paths.rs              # AppData & binary path resolution
│   │   ├── probe.rs              # FFprobe JSON stream analysis
│   │   ├── progress.rs           # FFmpeg -progress parser
│   │   └── tools.rs              # Capability detection & downloads
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri v2 configuration
├── public/                       # Static web assets (keep lean!)
└── tests/                        # Vitest test suites
```

---

## Development Workflow

### Branching Strategy

- `main` is the primary production branch.
- Always create a feature branch off `main`:
  ```bash
  git checkout -b feature/awesome-filter
  # or
  git checkout -b fix/crop-aspect-ratio
  ```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new user-facing feature or parameter control
- `fix:` A bug fix in UI, state builder, or Rust engine
- `docs:` Documentation updates (`README.md`, architecture docs, guides)
- `refactor:` Code restructuring that does not alter behavior
- `perf:` Performance improvements
- `test:` Adding or fixing unit/integration tests
- `chore:` Dependency bumps, CI updates, configuration tweaks

Example:
```bash
git commit -m "feat(videoTool): add two-pass encoding support for AV1"
```

---

## Testing & Quality Assurance

All PRs must pass the complete CI verification pipeline before merge:

```bash
# 1. Typecheck TypeScript
pnpm typecheck

# 2. Lint frontend code
pnpm lint

# 3. Run frontend unit and golden tests (Vitest)
pnpm test

# 4. Run Rust unit tests
cargo test --manifest-path src-tauri/Cargo.toml

# 5. Run Rust linter (Clippy)
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# 6. Verify static production build export
pnpm build
```

---

## Coding Standards

### TypeScript & React

- **Strict Typing:** Avoid `any` at all costs. Declare explicit interfaces for all action payloads and IPC contracts.
- **Pure Command Logic:** Command building logic in `src/store/videoTool/commandBuilder.ts` must remain pure, deterministic, and free of side-effects. Always add unit tests for new parameter permutations.
- **Styling:** Use Tailwind CSS utility classes and `shadcn/ui` primitives. Maintain the dark/cyberpunk aesthetic palette.
- **State Changes:** Never mutate state directly; utilize Immer-backed Redux Toolkit reducers.

### Rust

- **Idiomatic Code:** Follow standard Rust idioms and format code with `cargo fmt`.
- **Error Handling:** Avoid `.unwrap()` and `.expect()` in production code paths; propagate errors cleanly using `Result<T, E>`.
- **Resource Management:** Ensure child processes, file handles, and async channels cleanly terminate upon cancellation.

---

## Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/awesome-filter
   ```
2. Open a Pull Request against `NightShift:main`.
3. Fill out the PR template with:
   - Summary of changes
   - Motivation and context
   - Verification steps and test results
   - Screenshots or video clips for visual/UI changes
4. Maintainers will review your PR and provide feedback. Once approved and CI passes, it will be squashed and merged.

---

## Questions or Need Help?

- **Issues:** Open a [GitHub Issue](https://github.com/akehito/NightShift/issues) for bug reports and feature requests.
- **Discussions:** Use [GitHub Discussions](https://github.com/akehito/NightShift/discussions) for architecture questions and brainstorming.

Thank you for helping make NightShift the ultimate media processing workbench!
