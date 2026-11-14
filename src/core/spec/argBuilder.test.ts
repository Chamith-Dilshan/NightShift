import { describe, it, expect } from "vitest";
import { buildCommand, BuildContext, BuildIO } from "@/core/spec/argBuilder";
import { ToolSpec } from "@/core/spec/schema";

const testSpec: ToolSpec = {
  schemaVersion: 1,
  id: "testtool",
  name: "Test Tool",
  description: "For testing",
  category: "other",
  binaries: [
    { id: "test", role: "primary", names: { windows: "test.exe", unix: "test" } },
  ],
  install: {
    sources: ["system"],
    detect: { binary: "test", versionArgs: ["--version"], versionRegex: "(\\d+)" },
  },
  commands: [
    {
      id: "convert",
      name: "Convert",
      binary: "test",
      inputs: [
        { id: "src", label: "Input", kind: "file", required: true, ext: undefined },
      ],
      outputs: [
        { id: "dst", label: "Output", kind: "file", required: true, ext: undefined },
      ],
      params: [
        { id: "format", label: "Format", type: "enum", default: "webp", options: [
          { value: "webp", label: "WebP" },
          { value: "jpg", label: "JPEG" },
        ]},
        { id: "quality", label: "Quality", type: "int", min: 1, max: 100, default: 80 },
        { id: "strip", label: "Strip metadata", type: "bool", default: true },
        { id: "watermark", label: "Watermark", type: "file" },
      ],
      args: [
        { kind: "positional", value: { literal: "copy" } },
        { kind: "positional", value: { in: "src" } },
        { kind: "positional", value: { out: "dst" } },
        { kind: "option", flag: "-q", value: { param: "quality" }, style: "concat" },
        { kind: "flag", flag: "--strip", when: { eq: [{ param: "strip" }, { literal: true }] } },
        { kind: "option", flag: "-wm", value: { param: "watermark" }, when: { set: { param: "watermark" } } },
      ],
    },
  ],
};

describe("buildCommand", () => {
  const ctx: BuildContext = { platform: "unix" };

  it("builds basic command", () => {
    const io: BuildIO = {
      inputs: { src: "/input.png" },
      outputs: { dst: "/output.webp" },
    };
    const params = { format: "webp", quality: 80, strip: true };

    const result = buildCommand(testSpec, "convert", params, io, ctx);

    expect(result.args).toEqual(["copy", "/input.png", "/output.webp", "-q80", "--strip"]);
    expect(result.binaryId).toBe("test");
    expect(result.issues).toHaveLength(0);
  });

  it("omits args when condition is false", () => {
    const io: BuildIO = {
      inputs: { src: "/input.png" },
      outputs: { dst: "/output.webp" },
    };
    const params = { format: "webp", quality: 80, strip: false };

    const result = buildCommand(testSpec, "convert", params, io, ctx);

    expect(result.args).toEqual(["copy", "/input.png", "/output.webp", "-q80"]);
    expect(result.args).not.toContain("--strip");
  });

  it("omits optional params when absent", () => {
    const io: BuildIO = {
      inputs: { src: "/input.png" },
      outputs: { dst: "/output.webp" },
    };
    const params = { format: "webp", quality: 80, strip: true };

    const result = buildCommand(testSpec, "convert", params, io, ctx);

    expect(result.args).not.toContain("-wm");
  });

  it("includes optional params when present", () => {
    const io: BuildIO = {
      inputs: { src: "/input.png" },
      outputs: { dst: "/output.webp" },
    };
    const params = { format: "webp", quality: 80, strip: true, watermark: "/logo.png" };

    const result = buildCommand(testSpec, "convert", params, io, ctx);

    expect(result.args).toContain("-wm");
    expect(result.args).toContain("/logo.png");
  });

  it("handles hostile values with spaces", () => {
    const io: BuildIO = {
      inputs: { src: "/path with spaces/file.png" },
      outputs: { dst: "/output.webp" },
    };
    const params = { format: "webp", quality: 80, strip: true };

    const result = buildCommand(testSpec, "convert", params, io, ctx);

    // The path should be a single argv element, not split
    expect(result.args).toContain("/path with spaces/file.png");
    expect(result.args.length).toBe(5);
  });

  it("handles values with quotes", () => {
    const io: BuildIO = {
      inputs: { src: '/path/"quoted".png' },
      outputs: { dst: "/output.webp" },
    };
    const params = { format: "webp", quality: 80, strip: true };

    const result = buildCommand(testSpec, "convert", params, io, ctx);

    expect(result.args).toContain('/path/"quoted".png');
  });

  it("returns error for unknown command", () => {
    const io: BuildIO = { inputs: {}, outputs: {} };
    const result = buildCommand(testSpec, "unknown", {}, io, ctx);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("error");
  });

  it("quotes display string for args with spaces", () => {
    const io: BuildIO = {
      inputs: { src: "/path with spaces/file.png" },
      outputs: { dst: "/output.webp" },
    };
    const params = { format: "webp", quality: 80, strip: true };

    const result = buildCommand(testSpec, "convert", params, io, ctx);

    expect(result.display).toContain('"/path with spaces/file.png"');
  });
});
