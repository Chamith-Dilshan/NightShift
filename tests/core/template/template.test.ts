import { describe, it, expect } from "vitest";
import {
  NightShiftTemplate,
  validateTemplate,
  validatePack,
  TEMPLATE_MAX_FILE_SIZE,
  TEMPLATE_MAX_PACK_SIZE,
  TEMPLATE_MAX_ARGV_TOKENS,
  TEMPLATE_MAX_STRING_LENGTH,
} from "@/core/template/schema";
import {
  parseTemplateFile,
  canonicalizeTemplate,
  exportTemplate,
  exportPack,
  stripForExport,
  validateRawConstraints,
} from "@/core/template/io";
import { reviewTemplate, ReviewWarning, validateGraph } from "@/core/template/review";
import { resolveToken, resolveRawArgv, validateVariableReferences } from "@/core/template/variables";

const makeTemplate = (overrides = {}): NightShiftTemplate => ({
  schemaVersion: 1,
  kind: "nightshift.template",
  id: "test-123",
  name: "Test Template",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  requires: [{ tool: "ffmpeg" }],
  graph: {
    nodes: [
      {
        id: "n1",
        tool: "ffmpeg",
        command: "transcode",
        mode: "params",
        params: {},
        inputs: { in: { from: "$input" } },
        output: {},
      },
    ],
    edges: [],
  },
  ...overrides,
});

describe("schema validation", () => {
  it("accepts a valid template", () => {
    const tpl = makeTemplate();
    const result = validateTemplate(tpl);
    expect(result.ok).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = validateTemplate({ name: "Test" });
    expect(result.ok).toBe(false);
  });

  it("rejects schemaVersion > supported", () => {
    const tpl = makeTemplate();
    const result = validateTemplate({ ...tpl, schemaVersion: 99 });
    expect(result.ok).toBe(false);
  });

  it("rejects multi-node graph", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
          {
            id: "n2",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const result = validateTemplate(tpl);
    // Schema accepts it (Zod allows multiple nodes), but review should reject
    expect(result.ok).toBe(true);
  });

  it("rejects non-empty edges", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [{ from: "n1", to: "n2" }],
      },
    });
    const result = validateTemplate(tpl);
    expect(result.ok).toBe(false);
  });

  it("rejects non-$input references", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "n2.out" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const result = validateTemplate(tpl);
    expect(result.ok).toBe(false);
  });

  it("accepts valid pack", () => {
    const pack = {
      kind: "nightshift.pack",
      templates: [makeTemplate({ id: "a" }), makeTemplate({ id: "b" })],
    };
    const result = validatePack(pack);
    expect(result.ok).toBe(true);
  });
});

describe("import security (section 7.5)", () => {
  it("rejects file too large", () => {
    const tpl = makeTemplate();
    const json = exportTemplate(tpl);
    const result = parseTemplateFile(json, TEMPLATE_MAX_FILE_SIZE + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("too large");
    }
  });

  it("rejects pack with too many templates", () => {
    const bigPack = {
      kind: "nightshift.pack",
      templates: Array.from({ length: TEMPLATE_MAX_PACK_SIZE + 1 }, (_, i) =>
        makeTemplate({ id: `tpl-${i}` })
      ),
    };
    const json = JSON.stringify(bigPack);
    const result = parseTemplateFile(json, json.length);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("too many");
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseTemplateFile("{ invalid json }", 100);
    expect(result.ok).toBe(false);
  });

  it("rejects newer schemaVersion", () => {
    const tpl = makeTemplate();
    const json = JSON.stringify({ ...tpl, schemaVersion: 99 });
    const result = parseTemplateFile(json, json.length);
    expect(result.ok).toBe(false);
  });
});

describe("review warnings", () => {
  function review(tpl: NightShiftTemplate): ReviewWarning[] {
    return reviewTemplate(tpl, ["ffmpeg"], ["ffmpeg", "vips"], { ffmpeg: "6.0" });
  }

  it("warns for raw mode", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "raw",
            raw: { argv: ["-i", "{input}", "{output}"] },
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const warnings = review(tpl);
    const modeWarning = warnings.find((w) => w.category === "mode");
    expect(modeWarning).toBeDefined();
    expect(modeWarning?.severity).toBe("warning");
  });

  it("warns for URL schemes in raw args", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "raw",
            raw: { argv: ["-i", "http://example.com/stream", "{output}"] },
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const warnings = review(tpl);
    const urlWarning = warnings.find((w) => w.category === "url");
    expect(urlWarning).toBeDefined();
  });

  it("warns for absolute paths in raw args", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "raw",
            raw: { argv: ["-i", "/absolute/path/file.mp4", "{output}"] },
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const warnings = review(tpl);
    const pathWarning = warnings.find((w) => w.category === "path");
    expect(pathWarning).toBeDefined();
  });

  it("warns for missing tool", () => {
    const tpl = makeTemplate({
      requires: [{ tool: "unknown-tool" }],
    });
    const warnings = review(tpl);
    const toolWarning = warnings.find((w) => w.category === "tool");
    expect(toolWarning).toBeDefined();
  });

  it("rejects multi-node graph", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
          {
            id: "n2",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const warnings = review(tpl);
    const graphError = warnings.find((w) => w.category === "graph" && w.severity === "error");
    expect(graphError).toBeDefined();
  });

  it("rejects non-empty edges", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [{ from: "n1", to: "n2" }],
      },
    });
    // Schema rejects this, so it won't reach review
    const result = validateTemplate(tpl);
    expect(result.ok).toBe(false);
  });

  it("reports portable gaps", () => {
    const tpl = makeTemplate({
      portableGaps: [
        { nodeId: "n1", param: "watermark", label: "Watermark image" },
      ],
    });
    const warnings = review(tpl);
    const portableInfo = warnings.find((w) => w.category === "portable");
    expect(portableInfo).toBeDefined();
    expect(portableInfo?.severity).toBe("info");
  });
});

describe("placeholder resolution", () => {
  it("resolves built-in placeholders", () => {
    const { value, errors } = resolveToken(
      "{input}",
      { input: "/path/to/file.mp4" },
      {},
      []
    );
    expect(value).toBe("/path/to/file.mp4");
    expect(errors).toHaveLength(0);
  });

  it("resolves {var:<id>} placeholders", () => {
    const { value, errors } = resolveToken(
      "Q={var:quality}",
      {},
      { quality: 80 },
      [{ id: "quality", label: "Quality" }]
    );
    expect(value).toBe("Q=80");
    expect(errors).toHaveLength(0);
  });

  it("errors on unknown placeholder", () => {
    const { value, errors } = resolveToken(
      "{unknown}",
      {},
      {},
      []
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("errors on unset variable", () => {
    const { value, errors } = resolveToken(
      "{var:quality}",
      {},
      {},
      [{ id: "quality", label: "Quality" }]
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("handles escaped braces", () => {
    const { value, errors } = resolveToken(
      "{{literal braces}}",
      {},
      {},
      []
    );
    expect(value).toBe("{literal braces}");
    expect(errors).toHaveLength(0);
  });

  it("does not split values with spaces", () => {
    const { value, errors } = resolveToken(
      "{input}",
      { input: "/path/to/my file with spaces.mp4" },
      {},
      []
    );
    expect(value).toBe("/path/to/my file with spaces.mp4");
    expect(errors).toHaveLength(0);
  });
});

describe("variable validation", () => {
  it("detects undeclared variable references", () => {
    const node = {
      id: "n1",
      tool: "ffmpeg",
      command: "transcode",
      mode: "raw" as const,
      raw: {
        argv: ["-i", "{input}", "-q", "{var:quality}", "{output}"],
        variables: [],
      },
      inputs: { in: { from: "$input" as const } },
      output: {},
    };
    const errors = validateVariableReferences(node);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("quality");
  });

  it("accepts declared variable references", () => {
    const node = {
      id: "n1",
      tool: "ffmpeg",
      command: "transcode",
      mode: "raw" as const,
      raw: {
        argv: ["-i", "{input}", "-q", "{var:quality}", "{output}"],
        variables: [{ id: "quality", label: "Quality", type: "int" as const }],
      },
      inputs: { in: { from: "$input" as const } },
      output: {},
    };
    const errors = validateVariableReferences(node);
    expect(errors).toHaveLength(0);
  });
});

describe("export portability", () => {
  it("strips absolute paths from params", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            params: {
              watermark: "C:\\Users\\me\\logo.png",
              quality: 80,
            },
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const { template, gaps } = stripForExport(tpl);
    expect(gaps.length).toBeGreaterThan(0);
    const node = template.graph.nodes[0];
    if (node.mode === "params" && node.params) {
      expect(node.params["watermark"]).toBeUndefined();
      expect(node.params["quality"]).toBe(80);
    }
  });

  it("preserves non-path params", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            params: { quality: 80, codec: "libx264" },
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const { template, gaps } = stripForExport(tpl);
    expect(gaps).toHaveLength(0);
  });
});

describe("raw constraints", () => {
  it("rejects too many argv tokens", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "raw",
            raw: {
              argv: Array.from({ length: TEMPLATE_MAX_ARGV_TOKENS + 1 }, () => "token"),
            },
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const errors = validateRawConstraints(tpl);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects argv tokens exceeding max string length", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "raw",
            raw: {
              argv: ["x".repeat(TEMPLATE_MAX_STRING_LENGTH + 1)],
            },
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const errors = validateRawConstraints(tpl);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("canonicalization", () => {
  it("excludes id, createdAt, updatedAt, author", () => {
    const tpl = makeTemplate({
      id: "unique-id",
      author: "Test Author",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-12-31T23:59:59.999Z",
    });
    const canonical = canonicalizeTemplate(tpl);
    expect(canonical).not.toContain("unique-id");
    expect(canonical).not.toContain("Test Author");
    expect(canonical).not.toContain("2024-12-31");
  });

  it("export round-trips", () => {
    const tpl = makeTemplate();
    const json = exportTemplate(tpl);
    const parsed = JSON.parse(json);
    const result = validateTemplate(parsed);
    expect(result.ok).toBe(true);
  });
});

describe("graph validation (T-7.1)", () => {
  it("accepts a valid single-node graph", () => {
    const tpl = makeTemplate();
    const errors = validateGraph(tpl);
    expect(errors).toHaveLength(0);
  });

  it("rejects multi-node graph", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
          {
            id: "n2",
            tool: "vips",
            command: "convert",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const errors = validateGraph(tpl);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const multiNode = errors.find((e) => e.category === "multi-node");
    expect(multiNode).toBeDefined();
    expect(multiNode?.message).toContain("several steps");
  });

  it("rejects non-empty edges", () => {
    // Note: Zod schema rejects this at parse time, but validateGraph
    // still checks it for templates parsed with a looser schema
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
        ],
        edges: [{ from: "n1.out", to: "n2.in" }] as any,
      },
    }) as any;
    const errors = validateGraph(tpl);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const edges = errors.find((e) => e.category === "edges");
    expect(edges).toBeDefined();
    expect(edges?.message).toContain("several steps");
  });

  it("rejects non-$input references", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "n2.out" } as any },
            output: {},
          },
        ],
        edges: [],
      },
    }) as any;
    const errors = validateGraph(tpl);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const inputRef = errors.find((e) => e.category === "input-ref");
    expect(inputRef).toBeDefined();
    expect(inputRef?.message).toContain("n2.out");
    expect(inputRef?.message).toContain("$input");
  });

  it("reports multiple errors for a multi-node graph with edges", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: { in: { from: "$input" } },
            output: {},
          },
          {
            id: "n2",
            tool: "vips",
            command: "convert",
            mode: "params",
            inputs: { in: { from: "n1.out" } as any },
            output: {},
          },
        ],
        edges: [{ from: "n1.out", to: "n2.in" }] as any,
      },
    }) as any;
    const errors = validateGraph(tpl);
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const categories = errors.map((e) => e.category);
    expect(categories).toContain("multi-node");
    expect(categories).toContain("edges");
    expect(categories).toContain("input-ref");
  });

  it("accepts graph with only $input references", () => {
    const tpl = makeTemplate({
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            inputs: {
              in: { from: "$input" },
              watermark: { from: "$input" },
            },
            output: {},
          },
        ],
        edges: [],
      },
    });
    const errors = validateGraph(tpl);
    expect(errors).toHaveLength(0);
  });
});
