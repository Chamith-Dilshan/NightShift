# NightShift v0.2: Platform Core — Tool Specs, Templates, Batch

> **Audience:** a coding agent (and the maintainer) implementing NightShift v0.2.
> **Baseline:** the **shipped v0.1 code**. The v0.1 docs (`NIGHTSHIFT_V0_1_PLAN.md`, `NIGHTSHIFT_V0_1_BUILD_GUIDE.md`, `APP_ARCHITECTURE.md`) described the intent and partly disagree with each other. Where code and docs differ, **trust the code**, record the deviation in `docs/DECISIONS.md`, and continue.
> **Companion:** `PROJECT_BIBLE.md` holds the vision, principles and long-term roadmap. This document is the v0.2 source of truth. If they conflict on v0.2 scope, this document wins.
> **Goal of v0.2:** turn NightShift from "a polished FFmpeg app" into **a platform for command-line tools**: tools are described by declarative specs, users install the tools they want, save reusable **templates**, share them as files, and run them over whole folders (**batch**). FFmpeg becomes the first tool on the platform and **libvips** the second, which proves the platform is real.

---

## 0. Rules for the agent

1. Work **milestone by milestone** (section 14). Finish and verify one before starting the next.
2. After every task run: `pnpm lint && pnpm typecheck && pnpm test`, and when Rust changed: `cargo fmt --check && cargo clippy -- -D warnings && cargo test` (from `src-tauri/`). Do not mark a task done with failures.
3. One logical change per commit, Conventional Commits. Reference risk IDs in messages (`fix(R-07): …`).
4. **Do not add dependencies** that are not in section 13. If you need one, stop and flag it with the reason.
5. **Do not implement anything in section 15 (parked).** Leave seams, not features. Multi-node workflows are **design-only** in v0.2 (section 11).
6. **Verify before you trust.** M0 audits the real repo. Never invent download URLs, SHA-256 hashes, CLI flags, crate/package versions, or tool behaviour. Look them up, run `--help`, compute hashes from the real artifact.
7. **Core stays pure.** Everything under `src/core/` is pure TypeScript: no React, no Redux, no `@tauri-apps/*`, no `window`, no `Date`, no randomness, no I/O. Time, ids and platform arrive through a `ctx` argument. This is what makes a future headless CLI possible.
8. **No shell, ever.** Commands are argv arrays. The frontend never supplies an executable path; it supplies a tool id and a binary id, and Rust resolves the path.
9. **Specs and templates are data, never code.** No `eval`, no `new Function`, no dynamic `import()` of user-supplied content. Conditions use the expression language in Appendix D, nothing else.
10. **Do not bundle tool binaries.** Specs are small JSON files and may be bundled. Tool executables are never bundled or redistributed (D7 from v0.1 still holds).
11. No `any`. No non-serializable values in Redux. Redux holds settings and statuses; logs live in `logStore`.
12. When ambiguous, pick the default in section 3 or 16 and keep going. Stop only for items marked **BLOCKING**.
13. Keep `docs/DECISIONS.md` current (date, what differs, what you chose, why). Update `APP_ARCHITECTURE.md`, `README.md`, `CHANGELOG.md` as part of the work (M8), and `PROJECT_BIBLE.md` where reality diverged from it.

---

## 1. Direction and scope

### 1.1 Product direction (this changed after v0.1; honour it everywhere, including copy)
NightShift is **not** a video, image or audio tool. It is a **central desktop platform for powerful command-line tools**. The user picks the tools they want, NightShift helps them install and run them through visual forms **and** raw commands, and lets them save, share and batch what they do. FFmpeg is the first tool, not the identity of the product.

Consequences for this release:
- No new feature may hard-code a specific tool in shared code (`src/core`, `src/store` generic parts, Rust runner/tool manager). Tool-specific knowledge lives in a spec or in `src/tools/<id>/`.
- Public text (README, window title, store listings, release notes) describes a platform for CLI tools. FFmpeg and libvips appear as examples.

### 1.2 In scope
- **ToolSpec v1:** a declarative format describing a tool (binaries, install/detect, commands, parameters, validation rules, argument template, input/output ports, progress parser).
- **Generic engine:** spec loader, expression evaluator, argument builder, validator, auto-generated panels, generic job runner and generic tool manager.
- **FFmpeg re-expressed on the platform** with **zero behaviour change** (all v0.1 golden and smoke tests still pass).
- **Tool catalog** (browse, install, detect, custom path) and **custom tools** (user points to any executable and gets a raw-command workbench).
- **libvips** as the second tool, added with **no changes to `src/core` or `src-tauri`** (spec + manifest + tests only).
- **Templates:** save any tool configuration (parameters or raw command with variables) as a reusable template; library UI; import/export; safe-import review.
- **Batch:** folder/file inputs, dry-run plan, output naming and collision policy, concurrency, failure policy, summary.
- **Graph-ready file formats** (templates are one-node workflows) plus a design document for v0.3 workflows.

### 1.3 Explicitly not in v0.2
Executing multi-node workflows, typed port wiring, result caching, visual node editor, headless CLI, triggers/scheduling, LLM nodes, Python/extension runtime, marketplace or template registry, template signing, PTY terminal, tool auto-update checks, run-history persistence. See section 15.

---

## 2. Decisions already made (do not revisit)

| Topic | Decision |
|---|---|
| Desktop shell | Tauri v2. Frontend: Next.js static export. State: Redux Toolkit. Validation: Zod. |
| Execution | Directly from Rust, argv arrays, no shell, no sidecar. |
| Binaries | Never bundled. Detected, downloaded on request, or user-pointed. |
| Direction | Platform for CLI tools (section 1.1). Not a graphical editor; no media preview. |
| Workflows | Design-only in v0.2. Single-node templates + batch ship now. |
| Distribution | GitHub Releases + updater (as in v0.1). |

## 3. Decisions made in this plan (reasoned defaults; the maintainer may override)

| Topic | Default | Why |
|---|---|---|
| FFmpeg UI | Keep the v0.1 video panels and `videoSlice` as a **builtin rich panel + builtin builder** registered by the FFmpeg spec. Do not rewrite them into spec-driven panels. | Zero regression risk; FFmpeg is too conditional for a pure-JSON spec (R-03). |
| Generic tools UI | Auto-generated from the spec (`SpecPanel`). | This is what lets new tools ship without code. |
| Adapter | A `WorkbenchAdapter` interface lets templates, batch and the queue work against either FFmpeg's slice or the generic workbench slice. | One template/batch implementation for all tools. |
| Routing | Single static route `/tool?id=<toolId>` plus `/tools`, `/templates`, `/settings`. **No dynamic route segments.** `/video` redirects client-side to `/tool?id=ffmpeg`. | Static export cannot pre-render unknown tool ids (R-02). |
| First run | No forced FFmpeg install. Home shows the tool catalog; opening an uninstalled tool shows an inline install/detect/custom-path panel. | "Users pick which tools they want." |
| `ffprobe` | Becomes a **helper binary of the `ffmpeg` tool** (one tool, two binaries), not a separate tool. | One install, one version, one card in the catalog. |
| Template files | `*.nightshift-template.json` (single) and `*.nightshift-pack.json` (many). | Greppable, double-click associable later. |
| Version ranges | Tiny in-repo `compareVersions` that parses the leading numeric dotted prefix; unparseable versions disable range checks with a warning. No semver dependency. | FFmpeg static builds report versions like `N-118461-gabc`. |
| Schema compatibility | `schemaVersion` is a major number. Newer than supported → refuse with a clear message. Same major → unknown keys ignored (with a warning); bundled specs are linted strictly in CI. | Additive evolution without breaking older apps. |
| Package managers | NightShift **shows** install hints (`brew install vips`) with a copy button; it does not run package managers in v0.2. | Avoids privilege and trust problems. |

---

## 4. Concepts and target architecture

### 4.1 Glossary

| Term | Meaning |
|---|---|
| **Tool** | A CLI program family identified by an id (`ffmpeg`, `vips`, `user.mytool`). May have several binaries. |
| **ToolSpec** | JSON describing a tool (Appendix A). Data only. |
| **Command** | One way to use a tool inside a spec (e.g. libvips `thumbnail`, `convert`). Has params, ports, an argument template. |
| **Port** | A declared input or output of a command (file, files, folder). Typed by extension group. |
| **Template** | A saved, shareable configuration of one command (section 7). Internally a **one-node workflow**. |
| **Workbench** | The UI + state where a user configures one command on one or more inputs. |
| **Job** | One execution of one binary on one input set. |
| **Batch** | A planned set of jobs generated from one template/configuration over many inputs. |
| **Trust tier** | `bundled` (shipped), `user` (local file the user added). Specs cannot be fetched remotely in v0.2. |

### 4.2 Layers

```
┌───────────────────────────────────────────────────────────────────────────┐
│ UI (Next.js client components)                                            │
│  Home/Catalog · Tool workbench (SpecPanel | builtin panel) · Templates    │
│  Batch panel · Queue/Terminal · Settings                                  │
├───────────────────────────────────────────────────────────────────────────┤
│ Redux: workbenchSlice (generic) · videoSlice (ffmpeg, unchanged)          │
│        templatesSlice · jobsSlice · batchesSlice · toolsSlice             │
│ Adapters: WorkbenchAdapter per tool (snapshot/apply)                      │
├───────────────────────────────────────────────────────────────────────────┤
│ src/core  (PURE, no React/Redux/Tauri)                                    │
│  spec/{schema,registry,expr,argBuilder,validate,versions}                 │
│  template/{schema,migrate,io,review,variables}                            │
│  batch/{expand-types,naming,plan}                                         │
│  cmd/{tokenizer}   (moved from v0.1 commandParser)                        │
├───────────────────────────────────────────────────────────────────────────┤
│ Executor (Tauri | Mock)                                                   │
├───────────────────────────────────────────────────────────────────────────┤
│ Rust: spec loader · tool registry/manager · run_job/cancel_job · probe    │
│       expand_inputs · check_paths · settings v2 · install pipeline        │
└───────────────┬───────────────────────────────────────────────────────────┘
                │ spawn (argv, no shell)
        ┌───────▼───────┐ ┌──────────────┐ ┌───────────────┐
        │ ffmpeg/ffprobe│ │ vips family  │ │ user.<tool>   │ … downloaded, detected or user-pointed
        └───────────────┘ └──────────────┘ └───────────────┘
```

### 4.3 Repository changes (adjust to what M0 finds)

```
ADD   tool-specs/{ffmpeg.json,vips.json}                (bundled specs; also copied to src-tauri/resources/specs/)
ADD   tool-specs/__tests__/                              (golden fixtures per spec)
ADD   docs/{DECISIONS.md,WORKFLOWS_DESIGN.md,TOOL_SPEC.md,TEMPLATES.md}
ADD   src/core/**                                        (see 4.2)
ADD   src/tools/ffmpeg/                                  (MOVE v0.1 video panels, videoSlice, builder here; add adapter + builtin registration)
ADD   src/tools/registry.ts                              (builtin builders/panels/adapters, keyed by id)
ADD   src/store/{workbench,templates,batches}/…
ADD   src/components/{catalog,workbench,templates,batch}/…
ADD   src/app/{tool,tools,templates}/page.tsx
ADD   src-tauri/src/{specs.rs,registry.rs,expand.rs,settings.rs}   (names flexible; keep module boundaries)
CHANGE src-tauri/src/{jobs.rs,tools.rs,probe.rs}         (generalize; no `enum Tool { Ffmpeg, Ffprobe }`)
CHANGE tools-manifest.json                               (schema v2: many tools)
CHANGE src/app/video/page.tsx                            (client redirect to /tool?id=ffmpeg)
CHANGE src/app/page.tsx                                  (home = tool catalog + templates entry)
```

**Move, don't rewrite:** when relocating v0.1 FFmpeg code, keep git history (`git mv`) and keep public function behaviour identical. The v0.1 golden tests move with it and must pass unchanged.

---

## 5. Tool spec (summary; full types in Appendix A)

### 5.1 What a spec describes
`id, name, description, category, license (informational), binaries[], install{manifestId?, detect, hints, sources}, commands[{ports, params, groups, args, rules, progress}], probes{}`, plus first-party-only `builder` and `ui.panel` references.

### 5.2 Rules
1. **Data only.** Specs may reference builtin builders/panels by id (`{kind:"builtin", id}`) **only when trust tier is `bundled`**. A user spec containing `builder` or `ui.panel` is rejected with a clear message.
2. **Ids:** bundled `^[a-z][a-z0-9-]{1,31}$`; user specs must start with `user.`. Duplicate ids: bundled wins, the duplicate is reported in the catalog, nothing crashes.
3. **Argument building is deterministic and pure:** same spec + params + io + ctx → same argv.
4. **Values stay in one argv element.** Substituted values are never re-split or re-tokenized (R-07).
5. **Path values are absolute** when they reach the builder (the thunk resolves them). Specs may declare `endOfOptions: true` to emit `--` before positionals, for tools that support it (R-08).
6. **Capability probes** (e.g. list of encoders) are declared as data (`args` + `parse` kind: `lines`, `regex`, `json`) and cached by (binary path, version). Rules and enum options can reference a probe.
7. **Versioning policy:** see section 3 "Schema compatibility". Specs declare the tool versions they were authored against (`testedWith`) and a `minVersion`; a version outside range is a **warning**, never a silent failure.
8. **Loading is fault-isolated:** one invalid spec produces an error entry in the catalog ("could not load: reason"), never a crash.

### 5.3 Spec sources
Bundled: `src-tauri/resources/specs/*.json` (copied from `tool-specs/` at build time; CI checks they are identical). User: `<app_data>/specs/user/*.json`. Rust reads files and returns raw JSON plus tier; TypeScript validates with Zod. Rust additionally parses the **subset** it needs (`id, binaries, install, commands[].progress`) with serde ignoring unknown fields, so the schema is not duplicated in full.

---

## 6. Rust layer changes

### 6.1 Generalized commands

| Command | Behaviour |
|---|---|
| `specs_list()` | Returns `[{ tier, source, json | error }]` for bundled + user specs. |
| `run_job(job_id, spec: JobSpec, on_event: Channel<JobEvent>)` | `JobSpec { tool_id, binary_id, command_id, args, output_path?, output_existed, duration_ms? }`. Rust resolves the binary path from settings and the **progress config from the loaded spec** (by `tool_id` + `command_id`), never from the frontend. |
| `cancel_job(job_id)` | Unchanged semantics (graceful `q` for tools whose spec says `cancel: "stdin-q"`, otherwise terminate; kill after 5 s). Spec field `progress.cancel`: `"stdin-q" \| "terminate"` (default `terminate`). |
| `probe_media(path)` | Unchanged; implemented through the `ffmpeg` tool's `ffprobe` helper binary. Returns a clear error if the `ffmpeg` tool is not installed. |
| `expand_inputs(sources, options)` | See section 8.2. |
| `check_paths(paths)` | Unchanged. |
| `tools_status()` | Per tool: `{ toolId, source: managed\|system\|custom\|missing, binaries: { id, path, version }[], capabilities? }`. |
| `tool_install(tool_id, on_event)` | v0.1 pipeline generalized by manifest (section 9). |
| `tool_detect(tool_id)` | `which` + `-version` per binary using the spec's `install.detect`. |
| `tool_set_custom_path(tool_id, binary_id, path)` | Validate by running the detect args, persist. |
| `tool_probe(tool_id, probe_id)` | Run a spec-declared probe, cache by (path, version), return parsed data. |
| `user_tool_save(spec_json)` / `user_tool_delete(id)` | Writes/removes `<app_data>/specs/user/<id>.json` after validation. |

### 6.2 Progress parsers (selected by spec data)
- `none`: logs only.
- `ffmpeg-progress`: the v0.1 `-progress pipe:1` block parser. `progress.inject` in the spec (`["-progress","pipe:1","-nostats"]`) is prepended after the binary, unless already present.
- `regex`: spec supplies `pattern` with named groups `percent` or `current`/`total`; applied per output line; throttled to 4 events/s.
Throttling, line splitting, exactly-one `Exit` event, partial-output cleanup, `CREATE_NO_WINDOW`, per-job registry: **unchanged from v0.1**.

### 6.3 Settings v2 (`settings.json`)
```json
{
  "schemaVersion": 2,
  "tools": {
    "ffmpeg": { "source": "managed", "installedAt": "…",
                "binaries": { "ffmpeg": { "path": "…", "version": "…" }, "ffprobe": { "path": "…", "version": "…" } } }
  },
  "manifestUrl": null
}
```
Migration from v1 (verify the real v0.1 shape in M0): keep a copy as `settings.v1.backup.json`, convert, write atomically. Any failure leaves the original untouched and the app starts with no tools configured plus a toast.

### 6.4 Security
- Binary ids and tool ids are validated against the loaded registry; unknown ids → `InvalidArgs`.
- Frontend-supplied `args` are forwarded as-is (manual/raw mode is intentionally unrestricted, as in v0.1), but argv total size is capped (64 KB) and NUL bytes are rejected.
- User tools execute whatever executable the user chose. That is equivalent to the user running it in a terminal and is acceptable; **templates can never carry an executable path** (section 7.5).
- Capabilities and CSP: unchanged from v0.1, plus no new plugin permissions. If something new is needed, stop and flag it.

---

## 7. Templates

### 7.1 Definition
A template is a saved configuration of **one command of one tool**, optionally with a raw command and user-facing variables. It is stored in the same shape as a (future) workflow with exactly one node (Appendix B, section 11). Templates are the unit users save, apply, export, import and run in batch.

### 7.2 Two modes
1. **`params`:** values for the command's parameters. For tools with a builtin builder (FFmpeg) `params` is that tool's own settings object (the v0.1 `VideoSettings`), validated by the tool's Zod schema.
2. **`raw`:** an `argv` array (tokens, **not** a single string) with placeholders and optional variables. This is the "add a custom command directly" path, and works for any tool including user-defined ones.

### 7.3 Placeholders and variables (raw mode)
- Built-in placeholders: `{input}`, `{output}`, `{name}` (input basename without extension), `{ext}` (input extension), `{index}` (1-based position in the batch), `{inputDir}`.
- Variables: `{var:<id>}`, declared in `raw.variables` using the **same `ParamDef` shape as specs** (so they get typed, validated form fields when the template is applied).
- Literal braces: `{{` and `}}`.
- Substitution happens **per argv element, after tokenization**; the result is never re-split (R-07). An element that is exactly `{input}` becomes exactly the input path.
- Unknown placeholder → validation **error** at save and at apply.

### 7.4 Operations (library UI + store)
Save from the current workbench (params or raw) · duplicate · rename · edit description/tags · delete · search/filter by tool and tag · **apply** (loads into the workbench) · **Run on files/folder** (opens the batch panel with the template preselected) · export one/many · import · built-in read-only presets (the four v0.1 quick presets, migrated).
Persistence: `templates.json` via the store plugin (as v0.1), listener middleware, hydrate on the client, Zod-validate each item on load, drop invalid items with a toast count.

### 7.5 Import security model (normative; each point is a test)
1. **Never auto-run.** Import only adds to the library. Running always requires the normal Run action.
2. **Review screen before saving**, showing: tools required (installed / missing / **unknown to this install**), mode (`params` or **`raw command`** badge), the fully resolved command for a sample input, content hash, author (labelled "unverified"), and **warnings** for: raw mode, arguments containing URL schemes (`http:`, `https:`, `ftp:`, `tcp:`, `udp:`, `file:`, `concat:`, …), absolute paths inside raw args, arguments the spec marks `risky: true`, and `requires.version` outside the installed tool version.
3. **No executables in templates.** A template references `tool` + optional `binary` ids only. Unknown tool id → "requires X" with: *Install* (if a bundled spec exists), *Map to a local executable* (explicit user action with a warning, creates a user tool), or *Cancel*. Never resolve a path from the file.
4. **Paths are machine-local.** On export, params of type `file`/path (e.g. watermark image) are **stripped and recorded** in `portableGaps`; on import the user is told which files they must choose. Output directories are never stored in templates.
5. **Limits:** file size ≤ 1 MB, ≤ 200 templates per pack, ≤ 10,000 argv tokens, strings ≤ 8 KB. Reject beyond limits.
6. **Newer `schemaVersion`** → refuse with "requires a newer NightShift". **Multi-node graph** in v0.2 → refuse with "workflows with several steps need a newer NightShift" (never partially import).
7. **Id clashes** on import: ask *Keep both* (new id) or *Replace*. Never silently overwrite.
8. The content hash is **informational** (sha256 of canonical JSON excluding `id`, `createdAt`, `updatedAt`, `author`). Signing is parked.

### 7.6 Legacy migration
v0.1 `VideoTemplate { id, name, createdAt, schemaVersion, settings }` → `NightShiftTemplate` (tool `ffmpeg`, command `transcode`, mode `params`, `params = settings`). Idempotent; run once at hydrate; keep the old file as `templates.v1.backup.json`. Also keep the v0.1 legacy-localStorage import path if present in the code.

---

## 8. Batch

### 8.1 Behaviour
A batch is created from the current workbench (or a template) plus a **set of inputs**. Flow: *choose inputs → choose output options → Plan (dry run) → review → Run*.

### 8.2 Input expansion (`expand_inputs`, Rust)
```
expand_inputs({ sources: [{ kind: "file"|"folder", path }], recursive: bool,
                extensions?: string[], nameFilter?: string, includeHidden: bool, limit: number })
  -> { items: [{ path, sizeBytes, relativeTo?: string }], truncated: bool, skipped: [{ path, reason }] }
```
- `extensions` default comes from the command's input port; `nameFilter` supports only `*` and `?`.
- **Do not follow symlinks**; skip hidden entries unless asked; sort deterministically (natural order); default `limit` 10,000 (`truncated: true` when hit) (R-15).
- Folder sources record the folder as `relativeTo` so output structure can be mirrored.

### 8.3 Output planning (`core/batch`, pure)
Options: `dir` (null = beside each input) · `structure: "flat" | "mirror"` (mirror needs a folder source) · `namePattern` (tokens `{name}`, `{index}`, `{ext}`, `{parent}`, `{date}`; `{date}` is supplied through `ctx`, never read from the clock inside core) · `onConflict: "rename" | "overwrite" | "skip"`.
`planBatch(config, inputs, existing: Set<string>, ctx) → BatchPlan { items: [{ input, output, argv, display, issues, willSkip, existedBefore }], summary: { total, runnable, skipped, errors, warnings } }`.
Rules: reuse the v0.1 V2/V3/V17 behaviours (illegal characters, reserved Windows names, output ≠ input, collision detection **between planned outputs**), plus path length warning above 240 characters (R-14). A batch with any item that has an `error` can still run the valid items only if the user chooses **"Run valid items"**; the default is blocked until errors are fixed or those items removed.

### 8.4 Execution
- Scheduler lives in a thunk. **Concurrency default 1**, user setting 1..min(logical cores, 8). A hint warns that parallel encodes compete for CPU (R-11).
- **Failure policy:** `continue` (default) or `stop-on-first-failure`.
- Controls: cancel one job, cancel all, **retry failed only**, reveal output in folder.
- Logs: ring buffer per job as in v0.1, but total retention is capped to the **most recent 50 jobs** per batch; older jobs keep status and the last error line only (R-10).
- Summary on completion: counts (done/failed/cancelled/skipped), wall time, **bytes before → after** (from `check_paths`), per-failure last error line, "Copy summary".
- Batch state is runtime-only (not persisted in v0.2).

---

## 9. Tool manager, catalog, custom tools, libvips

### 9.1 Manifest v2 (`tools-manifest.json`)
```json
{
  "schemaVersion": 2,
  "tools": {
    "ffmpeg": { "version": "…", "license": "…", "homepage": "…",
      "artifacts": { "windows-x86_64": { "url": "…", "sha256": "…", "archive": "zip", "bins": { "ffmpeg": "…", "ffprobe": "…" } } } },
    "vips":   { "version": "…", "license": "…", "homepage": "…", "artifacts": { } }
  }
}
```
Same trust rules as v0.1: HTTPS + SHA-256, remote fetch with 5 s timeout, embedded fallback, atomic install, zip-slip protection, cleanup on failure. A tool or platform **absent from the manifest is simply "no managed download"** (detect/custom only, with the spec's install hints shown).

### 9.2 Catalog (`/tools`)
Card per spec: name, description, category, license note, status (installed/missing + source + version), actions (Open, Install, Use detected, Choose executable, Reinstall, Remove managed). Spec load errors appear as red cards with the reason. A "Add your own tool" card starts the custom tool wizard.

### 9.3 Custom tools
Wizard: display name → executable (native file dialog) → optional version args (default `--version`) → optional first command (raw template). Creates a user spec `user.<slug>` with one command whose `args` is empty (raw mode only), stored in the user specs dir. Works with templates and batch exactly like bundled tools. Deleting a custom tool leaves templates that reference it in an "unavailable: tool missing" state (not deleted).

### 9.4 libvips (second tool; the proof)
- **Acceptance criterion:** adding libvips requires **no change** to `src/core/**`, `src-tauri/src/**` or the Redux slices. Only `tool-specs/vips.json`, `tools-manifest.json`, fixtures and tests. If something needs a code change, that is a **spec-format gap**: fix it generally in the engine, add a test, log it in `docs/DECISIONS.md`.
- **Facts to verify from the real tool** (written from memory; do not trust): the CLIs are `vips` (operation-based), `vipsthumbnail`, `vipsheader`; **save options are appended to the output filename** in brackets (e.g. `out.jpg[Q=90,strip]`), which exercises the `format`/`join` value expressions; `vipsthumbnail` takes a size and an `-o` pattern. Author the spec from `--help` output of the installed version, record the version in `testedWith`.
- **Commands for v0.2:** `thumbnail` (resize/convert via `vipsthumbnail`) and `convert` (re-encode via `vips copy` with format-specific save options). Optional third: `info` (`vipsheader`). Keep it small; quality over breadth.
- **Packaging reality (verify, BLOCKING for the manifest only):** libvips publishes official Windows binaries (check the libvips GitHub organisation's Windows build repository) but, as far as I know, **no official macOS/Linux binaries**; those users install through Homebrew/apt/dnf. Expect the manifest to cover Windows only, with `hints` for the others. Record findings and the licence (LGPL-family, verify) in `DECISIONS.md` and in your summary for approval.

---

## 10. Frontend

### 10.1 Routes (static export safe)
`/` home (catalog preview, recent templates) · `/tools` catalog · `/tool?id=<id>[&template=<tid>]` workbench (read with `useSearchParams` inside a `<Suspense>` boundary) · `/templates` library · `/settings` · `/setup` may remain as a thin redirect to `/tools`. **No `[param]` segments.** `/video` → client redirect.

### 10.2 Workbench
Layout per tool: inputs (drop zone, dialog) → configuration → command preview (Copy; manual/raw edit; "as run" toggle) → Batch panel → Queue/Terminal (v0.1 components, generalized).
- **SpecPanel:** renders groups and fields from `ParamDef` (number/slider, enum select, switch, text, file picker), honours `visibleWhen/enabledWhen`, shows `rules` issues inline, disables Run on errors. Fields are controlled by `workbenchSlice`.
- **Builtin panel (ffmpeg):** the existing v0.1 panels, mounted by the registry.
- **Raw mode** for every tool: the v0.1 manual-edit behaviour (tokenizer round-trip, "Manual" badge, read-only controls, Reset to auto) generalized; plus a **variables editor** when saving a raw template.

### 10.3 `WorkbenchAdapter`
```ts
interface WorkbenchAdapter {
  toolId: string;
  snapshot(state: RootState): WorkbenchSnapshot;       // { commandId, mode, params?, raw?, inputs, output }
  apply(dispatch: AppDispatch, snap: WorkbenchSnapshot): ApplyResult;   // { warnings: string[] } (dropped keys, clamped values)
}
```
FFmpeg's adapter wraps `videoSlice`; generic tools use `workbenchSlice`. Templates, batch and the queue depend only on this interface.

### 10.4 State
- `workbenchSlice`: `sessions[toolId] = { commandId, mode, params, raw, inputs, output }`.
- `templatesSlice`: library (section 7); reducers pure; timestamps and ids come from the dispatching thunk.
- `batchesSlice`: `{ id, toolId, templateId?, status, jobIds, options, createdAt }`.
- `jobsSlice` (v0.1) gains `toolId`, `batchId?`, `skipped` status.
- `toolsSlice`: per-tool status and capability data, populated from `tools_status` and spec loading.

---

## 11. Graph-ready seams (design-only; this is how v0.3 stays additive)

Implement **only** the following in v0.2:

1. The template file shape in Appendix B (`graph.nodes[]`, `graph.edges[]`, node `inputs` references).
2. Validators that accept exactly one node, no edges, and only `{ "from": "$input" }` references, and reject anything else with the specific messages in section 7.5.
3. Core types `PortDef`, `PortKind`, `MediaType` and input/output declarations in specs (already needed for batch).
4. **Design document `docs/WORKFLOWS_DESIGN.md`** (no code) covering at least: node/edge model and typed ports (media types, `file` vs `files` vs `folder`, stdout-as-value ports such as ffprobe JSON); execution model (topological order, temp workspace per run, intermediate cleanup and disk-space estimate); **fan-out/map** (a batch is a map over inputs) and **collect**; caching key = hash(spec version, node params, input content hash or mtime+size, tool version) and invalidation; failure semantics (fail-fast vs continue branch, partial rerun from a failed node); sub-workflows; headless runner (`nightshift run <file> --input <folder>`) reusing `src/core` and the Rust runner; trigger sources (folder watch, schedule); LLM/HTTP nodes as a later node type; security implications (a workflow is a script: review screen generalizes, network-capable nodes need explicit consent); migration path from v0.2 one-node templates. Outline in Appendix E.

Do **not** build: edge editing UI, multi-node execution, temp workspaces, caching, headless mode.

---

## 12. Risk and bug register

| ID | Sev | Risk / problem | Mitigation | Verified by |
|---|---|---|---|---|
| R-01 | High | v0.1 core is FFmpeg-shaped (`Tool` enum, `-progress` injection in Rust, `/video` route) | Generalize via specs; progress config from spec | libvips added with zero core/Rust change |
| R-02 | High | Next static export cannot pre-render dynamic tool ids | Single `/tool?id=` route + Suspense | `pnpm build` passes; deep link works in the packaged app |
| R-03 | High | FFmpeg is too conditional for pure-JSON specs | Builtin builder/panel escape hatch (bundled only); spec language kept small | All v0.1 goldens pass via adapter |
| R-04 | High | Imported templates run arbitrary arguments | Section 7.5 (review, no auto-run, no executables, warnings) | Security test suite |
| R-05 | Med | Absolute paths make templates non-portable / leak local info | Strip path params on export, `portableGaps`, prompt on import | Export/import tests |
| R-06 | Med | Tool version drift breaks flags | `testedWith`/`minVersion` warnings, capability probes, `smoke.helpArgs` lint | CI smoke job |
| R-07 | High | Placeholder values containing spaces/quotes split into extra args | Substitute per argv element after tokenizing | Property tests with hostile values |
| R-08 | Med | File names beginning with `-` interpreted as options | Absolute paths always; optional `--` end-of-options | Test with `-weird.mp4` |
| R-09 | Med | libvips has no official macOS/Linux binaries | detect/custom path + hints; manifest optional per platform | Catalog shows correct state on each OS |
| R-10 | Med | Thousands of batch jobs exhaust memory with logs | Retain logs for last 50 jobs; statuses only beyond | 2,000-item synthetic batch test |
| R-11 | Low | Parallel heavy encodes thrash CPU | Default concurrency 1; hint when raising | UX check |
| R-12 | High | Settings/templates migration loses data | Backups + idempotent migrations + fixture tests | Migration tests; QA #14 |
| R-13 | Med | Spec/template schemas are now public API | Versioning policy (section 3); docs in `docs/TOOL_SPEC.md`, `docs/TEMPLATES.md` | Doc review |
| R-14 | Low | Windows MAX_PATH and reserved names in batch output | Warn > 240 chars; reuse reserved-name rules | Plan tests |
| R-15 | Med | Symlink loops / huge folders in `expand_inputs` | No symlink following, limit + `truncated` | Rust tests with fixtures |
| R-16 | Med | One bad user spec breaks startup | Fault-isolated loading, error cards | Spec fuzz fixtures |
| R-17 | Med | Spec expression language creeps toward a programming language | Fixed operator set (Appendix D); additions require a DECISIONS entry | Code review gate |
| R-18 | Low | Custom-tool wizard users create unusable specs | Detect run + immediate "test run" button showing version output | Manual QA |

---

## 13. Dependencies (allowed list)

**JS:** nothing new is expected. Existing: `@reduxjs/toolkit`, `react-redux`, `zod`, Tauri API + plugins already in v0.1, `vitest`, shadcn/Tailwind/lucide, `@tanstack/react-virtual`. If your installed Zod supports built-in JSON Schema export, you may use it to emit `tool-spec.schema.json`; do **not** add a converter package.
**Rust:** existing v0.1 list plus `regex` (progress parser) and `walkdir` (`expand_inputs`). Anything else → flag and ask.

---

## 14. Milestones and tasks

Each task has acceptance criteria. Tick only when all pass.

### M0: Audit and preparation
- [ ] **T-0.1** Confirm `v0.1.0` is tagged and released. Create branch `v0.2`.
- [ ] **T-0.2** Audit the real code against sections 4–6 of this plan: actual shape of `settings.json`, `tools-manifest.json`, template storage, `Tool` enum usage, where `-progress` is injected, how `/video` and `/setup` are wired, `videoSlice` public API. Write findings to `docs/DECISIONS.md`.
- [ ] **T-0.3** Add `docs/` skeletons (`DECISIONS.md`, `TOOL_SPEC.md`, `TEMPLATES.md`, `WORKFLOWS_DESIGN.md`).
- [ ] **T-0.4** Add a lint rule (or CI grep) enforcing that `src/core/**` imports nothing from `react`, `react-redux`, `@reduxjs/toolkit`, or `@tauri-apps/*`.

**Done when:** audit committed; CI green; the import rule is active.

### M1: Spec engine (pure TypeScript)
- [ ] **T-1.1** `core/spec/schema.ts`: Zod schemas for Appendix A, `.strict()` lint mode for bundled specs and tolerant mode for loading; `schemaVersion` gate.
- [ ] **T-1.2** `core/spec/expr.ts`: evaluator for Appendix D (no `eval`).
- [ ] **T-1.3** `core/spec/argBuilder.ts`: `buildCommand(spec, commandId, params, io, ctx) → BuiltCommand` with all `ArgNode`/`ValueExpr` kinds, deterministic ordering, `endOfOptions`.
- [ ] **T-1.4** `core/spec/validate.ts`: param type/range checks, `rules` evaluation, port requirements; returns `Issue[]` with `path`, `message`, `severity`.
- [ ] **T-1.5** `core/spec/versions.ts`: `compareVersions`, range checks, lenient parsing.
- [ ] **T-1.6** `core/cmd/tokenizer.ts`: move v0.1 `parseCommand`/`formatCommand` unchanged (tests move too).
- [ ] **T-1.7** Tests: expression truth tables; arg builder goldens (flag/option styles `separate`/`equals`/`concat`, group, repeat, join, map, format); hostile-value tests (spaces, quotes, `{}` characters, leading `-`, Unicode); spec rejection fixtures (builtin in user tier, unknown schemaVersion, bad ids, duplicate param ids, unknown placeholders).

**Done when:** a toy spec in tests builds correct argv for every node kind; hostile values never split argv.

### M2: Rust generalization
- [ ] **T-2.1** `specs.rs`: load bundled + user specs, fault-isolated; `specs_list`.
- [ ] **T-2.2** Replace `enum Tool` with registry lookups (tool id + binary id); update `run_job` per 6.1; progress config from spec; add `regex` parser and `cancel` modes.
- [ ] **T-2.3** `settings.rs`: v2 schema, backup + migration from v1, atomic write.
- [ ] **T-2.4** Generalize tool manager (`tools_status`, `tool_detect`, `tool_install`, `tool_set_custom_path`, `tool_probe`, `user_tool_save/delete`) and manifest v2 parsing.
- [ ] **T-2.5** `expand.rs`: `expand_inputs` per 8.2.
- [ ] **T-2.6** Rust tests: spec loading (valid, invalid, duplicate, user tier); settings migration fixtures; manifest v2; `expand_inputs` (symlink, hidden, filters, limit, ordering); `run_job` on a non-FFmpeg helper binary with a `regex` progress spec; checksum/zip-slip tests still pass.

**Done when:** an FFmpeg job and a non-FFmpeg job both run, report progress/exit/cancel correctly; migration preserves an existing v0.1 install.

### M3: FFmpeg on the platform (no behaviour change)
- [ ] **T-3.1** Author `tool-specs/ffmpeg.json`: binaries `ffmpeg` (primary) + `ffprobe` (helper), install/detect, probes (`encoders`), commands (`transcode`, plus `probe` if useful), `builder: {builtin: "ffmpeg-video"}`, `ui.panel: {builtin: "ffmpeg-video"}`, progress `ffmpeg-progress` with inject args.
- [ ] **T-3.2** `git mv` v0.1 video code into `src/tools/ffmpeg/`; register builtin builder/panel/adapter in `src/tools/registry.ts`.
- [ ] **T-3.3** Route `/tool?id=ffmpeg` mounts the builtin panel; `/video` redirects.
- [ ] **T-3.4** Executor/thunks use tool id + binary id; remove hard-coded FFmpeg/ffprobe types from shared code.
- [ ] **T-3.5** Tool manager UI for ffmpeg uses the generic catalog card; `ffprobe` no longer appears as a separate tool.

**Done when:** **all v0.1 golden tests, smoke tests and QA scenarios 4–15 pass unchanged**; `rg "Tool::Ffprobe|enum Tool"` returns nothing in shared Rust; a v0.1 install upgrades in place.

### M4: Generic workbench, catalog, custom tools, libvips
- [ ] **T-4.1** `workbenchSlice` + `SpecPanel` + generic command preview/raw mode.
- [ ] **T-4.2** `/tools` catalog page, inline install/detect/custom-path panel, home page tool grid, "Coming soon" cards removed or replaced by real catalog entries.
- [ ] **T-4.3** Custom tool wizard + `user_tool_save` + "test run".
- [ ] **T-4.4** **libvips spec** (section 9.4): `thumbnail`, `convert` (+ optional `info`), fixtures, golden tests, probes if needed, `smoke.helpArgs`.
- [ ] **T-4.5** libvips manifest research per 9.4. **BLOCKING:** list chosen sources and licences for maintainer approval before merging manifest changes.
- [ ] **T-4.6** CI smoke job: install libvips on Ubuntu (runner only), run builder output for each libvips command on a generated image, assert with `vipsheader`/`ffprobe`.

**Done when:** libvips works end to end from the UI on Windows (managed or detected) and on a machine with a system install; **`git diff` of the libvips PR touches no files under `src/core` or `src-tauri/src`**.

### M5: Templates
- [ ] **T-5.1** `core/template/schema.ts` (Appendix B), `migrate.ts` (v0.1 → v1), `io.ts` (parse/canonicalize/hash/export), `variables.ts` (placeholder resolution), `review.ts` (warning rules of 7.5).
- [ ] **T-5.2** `templatesSlice`, persistence listener, hydrate, legacy migration (7.6).
- [ ] **T-5.3** `WorkbenchAdapter` implementations (ffmpeg, generic) and **Save as template** (params and raw).
- [ ] **T-5.4** `/templates` library UI (search, tags, duplicate, rename, delete, apply, export, import pack/single) and the import **review screen**.
- [ ] **T-5.5** Built-in presets (the four v0.1 quick presets) as read-only templates.
- [ ] **T-5.6** Security tests for every point in 7.5, including hostile files (huge, deeply nested, executable-path fields, URL args, multi-node, newer schema).

**Done when:** a template exported on one machine imports on another, shows a correct review screen, applies without surprises, and a v0.1 template library migrates intact.

### M6: Batch
- [ ] **T-6.1** `core/batch` (`naming.ts`, `plan.ts`) with unit tests (collisions, reserved names, mirror structure, `{index}`, long paths).
- [ ] **T-6.2** `batchesSlice`, scheduler thunk (concurrency, failure policy, cancel, retry failed), `jobsSlice` extensions, log retention cap.
- [ ] **T-6.3** Batch panel UI: folder/file inputs via `expand_inputs`, options, **dry-run table**, run, progress, summary with before/after size, copy summary.
- [ ] **T-6.4** "Run on folder" entry points from the workbench and the template library.
- [ ] **T-6.5** Tests: planner matrix; scheduler with `MockExecutor` (concurrency 1 and 3, stop-on-failure, cancel-all, retry); 2,000-item synthetic batch stays within memory/UI budget.

**Done when:** a 3-file and a 200-file batch run correctly for both ffmpeg and libvips with the same template and batch UI.

### M7: Workflow design (design-only)
- [ ] **T-7.1** Validators/reject-messages for multi-node and unsupported references (7.5 #6) with tests.
- [ ] **T-7.2** Write `docs/WORKFLOWS_DESIGN.md` per section 11 and Appendix E.
- [ ] **T-7.3** Update `PROJECT_BIBLE.md` roadmap sections to match the design.

**Done when:** the design document is reviewed by the maintainer and no multi-node execution code exists.

### M8: Packaging, docs, QA, release
- [ ] **T-8.1** Version `0.2.0` in `tauri.conf.json`, `Cargo.toml`, `package.json` (CI check). Bundled specs copied into resources; CI verifies `tool-specs/` and resources are identical.
- [ ] **T-8.2** Verify installers still contain **no tool binaries**; record sizes.
- [ ] **T-8.3** Docs: `README.md` rewritten for the platform positioning (Appendix F), `docs/TOOL_SPEC.md` (how to author a spec, with the libvips spec as the worked example), `docs/TEMPLATES.md` (format, import safety, sharing), `CONTRIBUTING.md` (how to add a tool: spec + manifest + goldens + smoke), `APP_ARCHITECTURE.md`, `CHANGELOG.md` `## [0.2.0]`, `THIRD_PARTY_NOTICES.md` (each tool is downloaded/detected, not distributed; link licences).
- [ ] **T-8.4** Run the QA matrix (section 17) on Windows 11, macOS (Apple Silicon), Ubuntu LTS.
- [ ] **T-8.5** Release notes; publish `v0.2.0`; verify the updater moves a v0.1.0 install to v0.2.0.

---

## 15. Parked (after v0.2)

| Version | Theme | Highlights |
|---|---|---|
| **v0.3** | Workflows | Multi-node execution per `WORKFLOWS_DESIGN.md`, typed ports, temp workspaces, caching, partial reruns, headless CLI (`nightshift run`), folder-watch trigger |
| **v0.4** | Editor + extensions | Visual node editor, PTY terminal, extension runtime (lazily started, token-authenticated Python sidecar), more tools (audio, forensics) |
| **v0.5+** | Ecosystem | Template/spec registry with signed packages, LLM/HTTP nodes (BYO key, local models), scheduling, marketplace |
| **Unscheduled** | Polish | Code signing/notarization, run-history persistence, tool update checks, spec authoring UI, localisation |

## 16. Owner decisions

| Item | Default | Status |
|---|---|---|
| libvips (and any other) download sources + licences | Agent proposes; maintainer approves | **BLOCKING (T-4.5)** |
| Template file extensions (section 3) | `.nightshift-template.json`, `.nightshift-pack.json` | confirm |
| User-installed specs | Allowed from the local specs folder with a visible "user" badge; no remote spec install | confirm |
| FFmpeg UI approach (section 3) | Keep builtin panel; do not rewrite as spec-driven | confirm |
| Code signing for 0.2 | Still unsigned + README instructions | decided |
| Project licence | Whatever the repo declares | confirm |
| Public tagline / positioning copy | Appendix F suggestions | open |
| Telemetry | None | decided |

## 17. Manual QA matrix (each OS)

| # | Scenario | Expect |
|---|---|---|
| 1 | Upgrade a v0.1.0 install in place | Settings and templates migrate; FFmpeg still works; backups exist |
| 2 | Fresh install, no tools | Home shows catalog; no forced install; opening FFmpeg offers install/detect/custom |
| 3 | v0.1 golden scenarios (old QA 4–15) | Identical results |
| 4 | Install libvips (managed on Windows; detect/custom elsewhere) | Catalog status correct; hints shown where no download exists |
| 5 | libvips thumbnail + convert on a folder of images | Outputs correct; size summary shown |
| 6 | Custom tool wizard with a trivial CLI | Version test works; raw template runs |
| 7 | Save params template (ffmpeg) → restart → apply | Exact settings restored |
| 8 | Save raw template with variables → apply → change variable → run | Substitution correct, no arg splitting with spaces/quotes |
| 9 | Export template; import on another machine (or profile) | Review screen accurate; portable gaps listed; no auto-run |
| 10 | Import hostile files (URL args, executable path field, 5 MB file, multi-node, newer schema) | Each rejected or warned as specified |
| 11 | Import template requiring an unknown tool | Offers install/map/cancel; never resolves a path from the file |
| 12 | Batch: 3 files; folder (recursive, mirror); 200 files | Dry-run correct; sequential run; summary correct |
| 13 | Batch with collisions and `skip`/`rename`/`overwrite` | Policy honoured; sources untouched |
| 14 | Cancel one job / cancel all / retry failed | Queue behaves as specified |
| 15 | Concurrency 3 on a small batch | Three jobs run at once; UI stays responsive |
| 16 | File named `-weird name.png` with spaces/Unicode | Works (absolute paths) |
| 17 | Corrupt `templates.json`, corrupt user spec | App starts; items dropped/error card shown |
| 18 | Deep link `/tool?id=vips` in the packaged app | Loads (no dynamic route breakage) |
| 19 | Updater v0.1.0 → v0.2.0 | Succeeds |
| 20 | Inspect installers | No tool binaries inside |

## 18. Definition of done for v0.2

- [ ] All milestone tasks M0–M8 ticked; CI green on all three OSes.
- [ ] FFmpeg behaves exactly as in v0.1 (all v0.1 goldens/smoke tests pass).
- [ ] libvips shipped with **no** changes to `src/core` or `src-tauri/src`.
- [ ] Templates import/export with the full security model of 7.5 tested.
- [ ] Batch works for both tools through one UI.
- [ ] `docs/WORKFLOWS_DESIGN.md` approved; no multi-node execution code present.
- [ ] README/docs describe a platform for CLI tools, not an FFmpeg wrapper.
- [ ] No tool binaries in the repo or installers.
- [ ] `v0.2.0` published; updater verified.

---

## Appendix A: ToolSpec v1 (TypeScript shape; Zod is the source of truth)

```ts
export interface ToolSpec {
  schemaVersion: 1;
  id: string;                         // bundled: ^[a-z][a-z0-9-]{1,31}$ ; user: "user.<slug>"
  name: string;
  description: string;
  category: "video" | "audio" | "image" | "document" | "data" | "forensics" | "network" | "other";
  homepage?: string;
  license?: { name: string; url?: string; note?: string };    // informational only
  testedWith?: string[];                                       // tool versions the spec was authored against
  binaries: BinaryDef[];
  install: InstallDef;
  probes?: Record<string, ProbeDef>;
  commands: CommandDef[];
  // first-party only (rejected for trust tier "user"):
  builder?: { kind: "builtin"; id: string };
  ui?: { panel?: { kind: "builtin"; id: string } };
  smoke?: { helpArgs?: string[]; mustMention?: string[] };     // CI lint: each string must appear in help output
}

export interface BinaryDef {
  id: string;                                   // "ffmpeg", "ffprobe", "vips"
  role: "primary" | "helper";
  names: { windows: string; unix: string };     // executable file names
}

export interface InstallDef {
  manifestId?: string;                          // key in tools-manifest.json; absent = no managed download
  sources: Array<"managed" | "system" | "custom">;             // preference order
  detect: { binary: string; versionArgs: string[]; versionRegex: string; minVersion?: string };
  hints?: { windows?: string; macos?: string; linux?: string }; // human text, e.g. "brew install vips"
}

export interface ProbeDef {
  binary: string;
  args: string[];
  parse: { kind: "lines" | "regex" | "json"; pattern?: string; group?: number; path?: string };
  // result is string[] (lines/regex) or any JSON subtree (json); cached by (binary path, version)
}

export interface CommandDef {
  id: string; name: string; description?: string;
  binary: string;                               // BinaryDef.id
  inputs: PortDef[];
  outputs: PortDef[];
  groups?: { id: string; label: string; order?: number }[];
  params: ParamDef[];
  args: ArgNode[];                              // argument template, in order
  rules?: RuleDef[];
  endOfOptions?: boolean;                       // emit "--" before positional inputs/outputs
  progress?: {
    parser: "none" | "ffmpeg-progress" | "regex";
    inject?: string[];                          // args placed right after the binary (ffmpeg-progress only by default)
    regex?: { pattern: string; percentGroup?: string; currentGroup?: string; totalGroup?: string };
    cancel?: "stdin-q" | "terminate";           // default "terminate"
    durationFrom?: "probe" | "none";
  };
}

export type MediaType = "video" | "audio" | "image" | "document" | "text" | "json" | "archive" | "any";

export interface PortDef {
  id: string; label: string;
  kind: "file" | "files" | "folder";
  accepts?: { types?: MediaType[]; extensions?: string[] };    // inputs
  required?: boolean;                                          // default true for inputs
  ext?: ValueExpr;                                             // outputs: derived output extension (e.g. {param:"format"})
}

export interface ParamDef {
  id: string; label: string; help?: string; group?: string;
  type: "string" | "int" | "float" | "bool" | "enum" | "multienum" | "file";
  default?: unknown;
  required?: boolean;
  min?: number; max?: number; step?: number; unit?: string;     // numeric
  pattern?: string; maxLength?: number;                         // string
  options?: { value: string; label: string; when?: Expr }[];    // enum / multienum
  optionsFrom?: { probe: string; filter?: string[] };           // enum options from a probe (capabilities)
  visibleWhen?: Expr; enabledWhen?: Expr;
  portable?: boolean;                                           // default true; false for `file`
  risky?: boolean;                                              // review screen highlights it
}

export type ArgNode =
  | { kind: "flag"; flag: string; when?: Expr }
  | { kind: "option"; flag: string; value: ValueExpr; style?: "separate" | "equals" | "concat"; when?: Expr }
  | { kind: "positional"; value: ValueExpr; when?: Expr }
  | { kind: "group"; when?: Expr; args: ArgNode[] }
  | { kind: "repeat"; param: string; node: ArgNode };           // expands once per item of a multienum value; node may use {item}

export type ValueExpr =
  | { param: string }
  | { in: string }                                             // input port path (files → each path via repeat/positional)
  | { out: string }                                            // output port path
  | { literal: string | number | boolean }
  | { format: string }                                         // "{width}x{height}", "{out:dst}[{saveOptions}]"; {id} param, {in:id}, {out:id}, {item}
  | { join: { sep: string; items: { when?: Expr; value: ValueExpr }[] } }   // omits items whose `when` is false; empty result → omit the arg
  | { map: { param: string; table: Record<string, string> } };

export interface RuleDef {
  id: string; severity: "error" | "warning" | "info";
  when: Expr;                                                   // rule FIRES when true
  message: string;                                              // may interpolate {paramId}
}
```

`BuiltCommand` returned by the builder:
```ts
interface BuiltCommand {
  toolId: string; commandId: string; binaryId: string;
  args: string[];                                // WITHOUT the binary name; progress inject is added by Rust
  display: string;                               // platform-quoted, for preview/copy
  inputs: Record<string, string | string[]>;
  outputs: Record<string, string>;
  issues: Issue[];                               // errors block Run
  adjustments: string[];                         // human-readable notes ("adjusted for WebM")
}
```
Builder signature (pure): `buildCommand(spec, commandId, params, io, ctx) => BuiltCommand` where `io = { inputs, outputs }` (absolute paths) and `ctx = { platform, probes?, capabilities?, toolVersion? }`.

## Appendix B: Template v1

```ts
export interface NightShiftTemplate {
  schemaVersion: 1;
  kind: "nightshift.template";
  id: string;                                  // uuid, supplied by the thunk
  name: string; description?: string; tags?: string[];
  author?: string;                             // free text, unverified
  createdAt: string; updatedAt: string;        // ISO strings supplied by the thunk
  requires: { tool: string; version?: string; features?: string[] }[];   // version e.g. ">=6.0", features e.g. "encoder:libx264"
  portableGaps?: { nodeId: string; param: string; label: string }[];     // path params stripped on export
  graph: {
    nodes: TemplateNode[];                     // v0.2: EXACTLY ONE
    edges: [];                                 // v0.2: MUST be empty
  };
}

export interface TemplateNode {
  id: string;                                  // "n1"
  tool: string;                                // tool id
  binary?: string;                             // default: the command's binary
  command: string;                             // command id
  mode: "params" | "raw";
  params?: Record<string, unknown>;            // mode "params" (for builtin-builder tools: the tool's own settings object)
  raw?: { argv: string[]; variables?: ParamDef[] };   // mode "raw"; argv excludes the binary; supports placeholders (7.3)
  inputs: Record<string, { from: "$input" }>;  // v0.2: only "$input"; v0.3 adds { from: "<nodeId>.<portId>" }
  output: { namePattern?: string; ext?: string };
}
```

Example, params mode (ffmpeg): `{ "kind":"nightshift.template", "schemaVersion":1, "name":"Scroll-scrub MP4", "requires":[{"tool":"ffmpeg","version":">=5"}], "graph":{"nodes":[{"id":"n1","tool":"ffmpeg","command":"transcode","mode":"params","params":{ …VideoSettings… },"inputs":{"in":{"from":"$input"}},"output":{"namePattern":"{name}_scrub"}}],"edges":[]} }`

Example, raw mode with a variable (any tool):
```json
{ "kind": "nightshift.template", "schemaVersion": 1, "name": "Quick WebP", "requires": [{ "tool": "vips" }],
  "graph": { "nodes": [{ "id": "n1", "tool": "vips", "command": "convert", "mode": "raw",
    "raw": { "argv": ["copy", "{input}", "{output}[Q={var:quality}]"],
             "variables": [{ "id": "quality", "label": "Quality", "type": "int", "min": 1, "max": 100, "default": 80 }] },
    "inputs": { "in": { "from": "$input" } }, "output": { "ext": "webp", "namePattern": "{name}" } }], "edges": [] } }
```
(Illustrative; verify the real libvips syntax before shipping any built-in template.)

## Appendix C: Illustrative spec fragment (libvips-style; **author the real one from `--help`**)

```json
{
  "schemaVersion": 1, "id": "vips", "name": "libvips", "category": "image",
  "description": "Fast, low-memory image processing.",
  "binaries": [
    { "id": "vips", "role": "primary", "names": { "windows": "vips.exe", "unix": "vips" } },
    { "id": "vipsthumbnail", "role": "helper", "names": { "windows": "vipsthumbnail.exe", "unix": "vipsthumbnail" } }
  ],
  "install": { "manifestId": "vips", "sources": ["managed", "system", "custom"],
    "detect": { "binary": "vips", "versionArgs": ["--version"], "versionRegex": "(\\d+\\.\\d+(\\.\\d+)?)" },
    "hints": { "macos": "brew install vips", "linux": "sudo apt install libvips-tools" } },
  "commands": [{
    "id": "convert", "name": "Convert / re-encode", "binary": "vips",
    "inputs":  [{ "id": "src", "label": "Image", "kind": "file", "accepts": { "types": ["image"] } }],
    "outputs": [{ "id": "dst", "label": "Output", "kind": "file", "ext": { "param": "format" } }],
    "params": [
      { "id": "format",  "label": "Format",  "type": "enum", "default": "webp",
        "options": [{ "value": "webp", "label": "WebP" }, { "value": "jpg", "label": "JPEG" }, { "value": "png", "label": "PNG" }] },
      { "id": "quality", "label": "Quality", "type": "int", "min": 1, "max": 100, "default": 80,
        "visibleWhen": { "in": [{ "param": "format" }, ["webp", "jpg"]] } },
      { "id": "strip",   "label": "Strip metadata", "type": "bool", "default": true }
    ],
    "args": [
      { "kind": "positional", "value": { "literal": "copy" } },
      { "kind": "positional", "value": { "in": "src" } },
      { "kind": "positional", "value": { "format": "{out:dst}[{saveOptions}]" } }
    ]
  }]
}
```
This fragment is intentionally incomplete (`saveOptions` needs a `join` definition, and the exact option names must be verified). It shows the shape the real spec must take; the gap it exposes (building a bracketed option string) is exactly why libvips is the proof tool.

## Appendix D: Expression language (complete; additions need a DECISIONS entry)

```ts
type V   = { param: string } | { literal: string | number | boolean } | { in: string } | { out: string } | { toolVersion: true };
type Expr =
  | { eq: [V, V] } | { ne: [V, V] }
  | { gt: [V, V] } | { gte: [V, V] } | { lt: [V, V] } | { lte: [V, V] }
  | { in: [V, Array<string | number | boolean>] }
  | { set: V } | { unset: V }                      // value present / absent (non-empty)
  | { has: { probe: string; value: V } }           // probe result contains value
  | { versionGte: string }                          // tool version >= literal (lenient compare)
  | { and: Expr[] } | { or: Expr[] } | { not: Expr } | { literal: boolean };
```
Evaluation: pure, total (unknown params evaluate to `unset`), no side effects, depth ≤ 16, node count ≤ 256 per expression (reject larger specs).

## Appendix E: Outline for `docs/WORKFLOWS_DESIGN.md` (agent writes the prose; maintainer reviews)

1. Goals and non-goals · 2. Data model (nodes, edges, typed ports, media types, stdout/JSON ports) · 3. Execution model (topological order, temp workspace, intermediate cleanup, disk estimate) · 4. Batch as map/collect · 5. Caching (key definition, invalidation, storage location, size limits) · 6. Failure semantics and partial reruns · 7. Sub-workflows and parameters · 8. Headless runner and exit codes · 9. Triggers (folder watch, schedule) · 10. Non-CLI nodes (HTTP, LLM) and consent model · 11. Security (workflow as script, review generalization) · 12. Migration from v0.2 templates · 13. Open questions · 14. Estimated milestones for v0.3.

## Appendix F: Positioning guidance (for README, window title, release notes)

- Lead with the idea: *install the command-line tools you need, run them through visual forms or raw commands, save what you do as templates, run it on whole folders.*
- Do **not** call NightShift an FFmpeg wrapper/GUI. Do not title sections "Video tool"/"Image tool"; use tool names inside the catalog.
- Examples may use FFmpeg and libvips because they are relatable; say clearly that more tools are coming and that users choose what to install.
- State honestly: tools are downloaded or detected, never bundled; templates are shareable files and should be reviewed like scripts before use.
