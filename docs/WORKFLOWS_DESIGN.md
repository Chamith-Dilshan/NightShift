# NightShift Workflows Design

> **Status:** Design only. No multi-node execution code exists in v0.2.
> **Audience:** Maintainer and future implementer of v0.3.
> **Prerequisite:** NightShift v0.2 ships single-node templates and batch. This document describes how v0.3 will evolve templates into multi-node workflows.

---

## 1. Goals and Non-Goals

### Goals

- Let a user chain several tool commands so that the output of one becomes the input of the next.
- Keep the v0.2 template format as a subset — a one-node template is a valid workflow.
- Execute workflows in deterministic topological order with intermediate files stored in a temporary workspace.
- Support **fan-out** (map a workflow over many inputs) and **collect** (merge outputs back).
- Provide a headless runner (`nightshift run <file> --input <folder>`) that reuses `src/core` and the Rust job runner.
- Make workflows reviewable before execution — a workflow is a script, so the same security model as template import applies.

### Non-Goals (for v0.3)

- Visual node editor (v0.4).
- Remote spec/template registry (v0.5+).
- LLM/HTTP nodes (v0.5+).
- Template signing (unscheduled).
- Real-time collaboration or cloud sync.

---

## 2. Data Model

### 2.1 Nodes

A workflow is a directed acyclic graph (DAG) of nodes. Each node represents one command of one tool.

```ts
interface WorkflowNode {
  id: string;                    // unique within the workflow, e.g. "n1", "resize"
  tool: string;                  // tool id, e.g. "ffmpeg", "vips"
  binary?: string;               // optional binary override
  command: string;               // command id from the tool spec
  mode: "params" | "raw";
  params?: Record<string, unknown>;
  raw?: { argv: string[]; variables?: ParamDef[] };
  inputs: Record<string, PortRef>;  // portId → source reference
  output: { namePattern?: string; ext?: string };
  label?: string;                // optional human-readable label for UI
}
```

### 2.2 Edges

An edge connects an output port of one node to an input port of another.

```ts
interface WorkflowEdge {
  from: string;                  // "nodeId.portId"
  to: string;                    // "nodeId.portId"
}
```

### 2.3 Port References

v0.2 allows only `{ from: "$input" }`. v0.3 adds node-to-node wiring:

```ts
type PortRef =
  | { from: "$input" }                          // external batch input
  | { from: string };                           // "nodeId.portId" — output of another node
```

### 2.4 Typed Ports

Each command declares input and output ports with types:

```ts
type PortKind = "file" | "files" | "folder";

type MediaType = "video" | "audio" | "image" | "document" | "text" | "json" | "archive" | "any";

interface PortDef {
  id: string;
  label: string;
  kind: PortKind;
  // For inputs:
  accepts?: { types?: MediaType[]; extensions?: string[] };
  required?: boolean;
  // For outputs:
  ext?: ValueExpr;
  // Special: stdout-as-value ports (e.g. ffprobe JSON output)
  stdoutAsValue?: boolean;
}
```

### 2.5 Media Types

Media types constrain which ports can be wired together. A port accepting `["image"]` cannot receive from a port producing `"video"`. The type `"any"` matches everything. Extension lists provide a secondary check: a port accepting `[".jpg", ".png"]` rejects a `.webm` output.

### 2.6 Stdout/JSON Ports

Some commands produce structured output on stdout rather than a file. For example, `ffprobe -print_format json` returns JSON metadata. These are declared with `stdoutAsValue: true` on the output port. The value is captured as a string and passed to downstream nodes as a parameter value, not as a file path.

---

## 3. Execution Model

### 3.1 Topological Order

Before execution, the DAG is validated (no cycles) and topologically sorted. Nodes at the same level (no dependency between them) can execute in parallel, subject to the concurrency setting.

### 3.2 Temp Workspace

Each workflow run creates a temporary directory:

```
<app_data>/workspaces/<run-id>/
  node-n1-out/
  node-n2-out/
  intermediates/
```

- Each node's output ports write to this workspace.
- Intermediate files (outputs consumed by downstream nodes) remain until the run completes.
- On successful completion, the workspace is cleaned up unless the user opts to keep it.
- On failure, the workspace is preserved for debugging.

### 3.3 Intermediate Cleanup

After all nodes complete, the system identifies which intermediate files are not final outputs and deletes them. A final output is any node output port that is not referenced by any edge.

### 3.4 Disk Space Estimate

Before execution, the system estimates disk usage:

- Sum of all input file sizes (from batch expansion).
- Estimated output size per node based on the tool and settings (e.g., video encode ratio).
- Peak workspace size = sum of all intermediate files that may coexist.

If the estimate exceeds available disk space, the run is blocked with a clear message.

---

## 4. Batch as Map/Collect

### 4.1 Fan-Out (Map)

A batch over a workflow is a **map** operation: for each input file, the entire workflow executes. The input file is bound to all nodes whose input port references `$input`.

```
Input files: [A.jpg, B.jpg, C.jpg]
Workflow: [probe → resize → watermark]

Execution:
  A.jpg → probe(A) → resize(A) → watermark(A) → output_A
  B.jpg → probe(B) → resize(B) → watermark(B) → output_B
  C.jpg → probe(C) → resize(C) → watermark(C) → output_C
```

### 4.2 Collect

After all inputs are processed, a collect phase merges results. For example, a workflow might produce individual images that are then stitched into a video. The collect node receives all outputs from the fan-out phase.

```ts
interface CollectNode {
  kind: "collect";
  inputs: { from: "$fanout" };  // receives all outputs from the map phase
  tool: string;
  command: string;
  // ...
}
```

### 4.3 Concurrency

- **Input-level concurrency:** how many inputs are processed in parallel (default 1, max = min(logical cores, 8)).
- **Node-level concurrency:** within one input's workflow, independent nodes run in parallel.

The scheduler respects both dimensions, capping total concurrent jobs at the concurrency setting.

---

## 5. Caching

### 5.1 Cache Key

Each node execution is cached by a composite key:

```
cacheKey = hash(
  specVersion,           // tool spec schema version
  nodeParams,            // canonical JSON of node params or raw argv
  inputContentHash,      // SHA-256 of input file(s), or mtime+size as a fast path
  toolVersion            // installed tool version
)
```

If the cache key matches an existing cached result, the node is skipped and the cached output is used.

### 5.2 Invalidation

Cache entries are invalidated when:

- The tool is updated (version change).
- The spec is updated (schema version change).
- The input file's mtime or size changes (fast-path invalidation).
- The user explicitly clears the cache.

### 5.3 Storage Location

```
<app_data>/cache/<tool-id>/<cacheKey>/
  output-<portId>
  metadata.json          // cache key, timestamps, input hashes
```

### 5.4 Size Limits

- Default cache size limit: 2 GB.
- When the limit is exceeded, the oldest entries (by last access time) are evicted.
- The user can adjust the limit in settings.

---

## 6. Failure Semantics and Partial Reruns

### 6.1 Fail-Fast vs Continue

Each workflow declares a failure policy:

- **Fail-fast:** stop the entire run when any node fails. Default for workflows.
- **Continue:** mark the failed node and its dependents as skipped, continue with independent branches.

### 6.2 Partial Rerun

After a failure, the user can choose to rerun from the failed node. The system replays only the failed node and its downstream dependents, reusing cached or previously successful outputs for upstream nodes.

### 6.3 Partial Results

When a workflow fails, the outputs of successfully completed nodes are preserved in the workspace. The user can inspect them or use them as starting points for a modified workflow.

---

## 7. Sub-Workflows and Parameters

### 7.1 Sub-Workflows

A workflow can reference another workflow file as a node:

```ts
interface SubWorkflowNode {
  kind: "sub-workflow";
  ref: string;                // path to another .nightshift-workflow.json file
  inputs: Record<string, PortRef>;
  output: { namePattern?: string; ext?: string };
}
```

Sub-workflows are resolved at load time. Circular references are rejected.

### 7.2 Parameters

A workflow can declare top-level parameters that override node params:

```ts
interface WorkflowParam {
  id: string;
  label: string;
  type: "string" | "int" | "float" | "bool" | "enum" | "file";
  default?: unknown;
  // ...
}
```

Parameters are resolved before execution using the same placeholder system as templates (`{var:id}`).

---

## 8. Headless Runner and Exit Codes

### 8.1 Command Line

```
nightshift run <workflow.nightshift-workflow.json> --input <file-or-folder> [--output <dir>] [--param <key>=<value>]
```

The headless runner reuses `src/core` (pure TypeScript) for validation and argument building, and the Rust job runner for execution.

### 8.2 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All nodes completed successfully |
| 1 | Validation error (bad workflow file, missing tools) |
| 2 | Execution error (at least one node failed) |
| 3 | Resource error (disk full, tool not found) |
| 4 | Cancelled by user |

### 8.3 JSON Output

With `--json`, the runner outputs a summary to stdout:

```json
{
  "status": "success" | "partial" | "failed",
  "nodes": {
    "n1": { "status": "success", "outputBytes": 12345, "durationMs": 200 },
    "n2": { "status": "failed", "error": "..." }
  },
  "wallTimeMs": 500,
  "inputs": 3,
  "outputs": 2
}
```

---

## 9. Triggers

### 9.1 Folder Watch

A workflow can be triggered when new files appear in a watched folder. The trigger configuration includes:

- Watched directory path.
- File filter (extensions, name pattern).
- Debounce interval (e.g., wait 5 seconds after the last file appears).
- Concurrency setting.

### 9.2 Schedule

A workflow can run on a cron-like schedule. The schedule is stored in the app settings and executed by a background service.

### 9.3 Manual Trigger

The primary trigger in v0.3 remains manual: the user starts the workflow from the UI or CLI.

---

## 10. Non-CLI Nodes (HTTP, LLM) and Consent Model

### 10.1 HTTP Nodes

An HTTP node makes a request to a URL and returns the response as a value. The node declares:

- Method, URL template, headers, body template.
- Expected response type (JSON, text, file).

### 10.2 LLM Nodes

An LLM node sends a prompt to a language model and returns the response. The node declares:

- Model provider (OpenAI, local model via Ollama, etc.).
- Prompt template with placeholders.
- Output format (text, JSON schema).

### 10.3 Consent Model

Network-capable nodes require explicit consent:

- On first run, the review screen highlights all network nodes and their endpoints.
- The user must explicitly approve each unique endpoint.
- Approved endpoints are stored in a whitelist; changes to the workflow's endpoints require re-approval.
- The user can revoke approval at any time in settings.

---

## 11. Security

### 11.1 Workflow as Script

A workflow is equivalent to a shell script: it chains commands that read, write, and transform files. The same security model as template import applies:

- **Review screen** before first execution, showing all nodes, tools, network endpoints, and file operations.
- **No auto-run** — the user must explicitly start the workflow.
- **No executables in workflows** — only tool ids, resolved by the app.

### 11.2 Review Generalization

The review screen extends from templates to workflows:

- List all nodes with their tools and commands.
- Highlight network-capable nodes (HTTP, LLM).
- Show file size estimates and disk space requirements.
- Warn about raw mode nodes and risky parameters.
- Show the content hash of the workflow file.

### 11.3 Sandboxing Considerations

For v0.4+, network-capable nodes may run in a sandboxed extension runtime (Python sidecar with token authentication). This is not planned for v0.3.

---

## 12. Migration from v0.2 Templates

### 12.1 Format Compatibility

A v0.2 template is a valid v0.3 workflow with one node and no edges. No migration is needed — the same file format works.

### 12.2 Schema Evolution

The workflow file format extends the template format:

```json
{
  "kind": "nightshift.workflow",
  "schemaVersion": 2,
  "name": "My Workflow",
  "graph": {
    "nodes": [
      { "id": "n1", "tool": "ffmpeg", "command": "transcode", ... },
      { "id": "n2", "tool": "vips", "command": "convert", ... }
    ],
    "edges": [
      { "from": "n1.out", "to": "n2.in" }
    ]
  }
}
```

- `kind: "nightshift.workflow"` distinguishes workflows from templates.
- `schemaVersion: 2` allows v0.2 apps to reject workflows with a clear message.
- A v0.2 template (`kind: "nightshift.template"`, `schemaVersion: 1`) is accepted by v0.3 as a one-node workflow.

### 12.3 File Extension

Workflows use `.nightshift-workflow.json` to distinguish them from templates (`.nightshift-template.json`).

---

## 13. Open Questions

1. **Intermediate file naming:** Should intermediates use the node's output port name, the node id, or a hash? Current preference: node id + port id to keep them readable.
2. **Cache sharing across workflows:** Should the cache be global or per-workflow? Current preference: global cache keyed by the composite key, so common operations (e.g., probe) benefit all workflows.
3. **Error recovery:** Should a failed node's dependents be marked as skipped or as failed? Current preference: skipped, with a clear distinction in the UI.
4. **Workspace retention:** How long should failed workspaces be kept? Current preference: until the next run of the same workflow or until the user clears them.
5. **Sub-workflow resolution:** Should sub-workflows be resolved by path, by id, or from a library? Current preference: relative path from the workflow file's directory, with an option to reference a library workflow by id.

---

## 14. Estimated Milestones for v0.3

### M1: Core Execution Engine
- DAG validation and topological sort in `src/core/workflow/`.
- Temp workspace management in Rust.
- Multi-node job scheduler extending the batch scheduler.
- Intermediate file routing between nodes.

### M2: Workflow Format and UI
- Workflow file format (schema v2) with Zod validation.
- Workflow import/export with review screen.
- Linear workflow view in the UI (list of nodes with connections).
- Run workflow from UI with progress per node.

### M3: Caching and Headless Runner
- Cache key computation and storage.
- Cache invalidation on tool/spec update.
- Headless CLI runner (`nightshift run`).
- JSON output mode for CI/CD integration.

### M4: Triggers and Advanced Features
- Folder watch trigger.
- Schedule trigger.
- Sub-workflow support.
- Collect node for fan-in operations.

### M5: Polish and QA
- Error recovery and partial rerun.
- Disk space estimation and warnings.
- Full QA matrix across platforms.
- Documentation updates.

---

## Appendix A: Example Workflow

```json
{
  "kind": "nightshift.workflow",
  "schemaVersion": 2,
  "name": "Probe, Resize, Watermark",
  "description": "Probe video metadata, resize to 720p, add watermark.",
  "graph": {
    "nodes": [
      {
        "id": "probe",
        "tool": "ffmpeg",
        "command": "probe",
        "mode": "params",
        "params": {},
        "inputs": { "in": { "from": "$input" } },
        "output": { "ext": "json" },
        "label": "Probe metadata"
      },
      {
        "id": "resize",
        "tool": "ffmpeg",
        "command": "transcode",
        "mode": "params",
        "params": { "width": 1280, "height": 720 },
        "inputs": { "in": { "from": "$input" } },
        "output": { "ext": "mp4" },
        "label": "Resize to 720p"
      },
      {
        "id": "watermark",
        "tool": "ffmpeg",
        "command": "transcode",
        "mode": "params",
        "params": { "watermark": "{var:logo}" },
        "raw": {
          "variables": [
            { "id": "logo", "label": "Logo file", "type": "file" }
          ]
        },
        "inputs": { "in": { "from": "resize.out" } },
        "output": { "namePattern": "{name}_watermarked", "ext": "mp4" },
        "label": "Add watermark"
      }
    ],
    "edges": [
      { "from": "resize.out", "to": "watermark.in" }
    ]
  }
}
```

In this example:
- `probe` and `resize` both take `$input` (the batch input file).
- `watermark` takes the output of `resize` via the edge.
- `probe`'s output is not consumed by any edge, so it is a final output (metadata JSON file).
- `watermark`'s output is the final video file.
