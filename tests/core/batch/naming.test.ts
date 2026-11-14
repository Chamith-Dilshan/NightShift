import { describe, it, expect } from "vitest";
import {
  resolveNamePattern,
  buildOutputPath,
  sanitizeBasename,
  basenameWithoutExt,
  extension,
  parentBasename,
} from "@/core/batch/naming";
import { PathInput } from "@/core/batch/expand-types";

describe("naming - sanitizeBasename", () => {
  it("removes illegal Windows characters", () => {
    expect(sanitizeBasename("file<name>.txt")).toBe("file_name_.txt");
    expect(sanitizeBasename('file"name.txt')).toBe("file_name.txt");
    expect(sanitizeBasename("file|name.txt")).toBe("file_name.txt");
  });

  it("handles reserved Windows names", () => {
    expect(sanitizeBasename("con.txt")).toBe("_con.txt");
    expect(sanitizeBasename("prn")).toBe("_prn");
    expect(sanitizeBasename("aux.log")).toBe("_aux.log");
  });

  it("strips trailing dots and spaces", () => {
    expect(sanitizeBasename("file...")).toBe("file");
    expect(sanitizeBasename("file   ")).toBe("file");
  });

  it("returns 'unnamed' for empty result", () => {
    expect(sanitizeBasename("")).toBe("unnamed");
  });

  it("replaces illegal characters with underscores", () => {
    expect(sanitizeBasename("<>")).toBe("__");
  });
});

describe("naming - basenameWithoutExt", () => {
  it("extracts basename without extension", () => {
    expect(basenameWithoutExt("/path/to/file.jpg")).toBe("file");
    expect(basenameWithoutExt("C:\\path\\to\\file.jpg")).toBe("file");
    expect(basenameWithoutExt("file")).toBe("file");
  });

  it("handles files without extension", () => {
    expect(basenameWithoutExt("/path/to/Makefile")).toBe("Makefile");
  });

  it("handles multiple dots", () => {
    expect(basenameWithoutExt("/path/to/file.tar.gz")).toBe("file.tar");
  });
});

describe("naming - extension", () => {
  it("extracts extension", () => {
    expect(extension("/path/to/file.jpg")).toBe("jpg");
    expect(extension("C:\\path\\to\\file.PNG")).toBe("png");
  });

  it("returns empty string for no extension", () => {
    expect(extension("/path/to/Makefile")).toBe("");
  });
});

describe("naming - parentBasename", () => {
  it("extracts parent directory name", () => {
    expect(parentBasename("/path/to/file.jpg")).toBe("to");
    expect(parentBasename("C:\\path\\to\\file.jpg")).toBe("to");
  });

  it("returns empty for no parent", () => {
    expect(parentBasename("file.jpg")).toBe("");
  });
});

describe("naming - resolveNamePattern", () => {
  it("resolves {name} token", () => {
    const result = resolveNamePattern(
      "{name}_thumb",
      "/path/to/photo.jpg",
      1
    );
    expect(result).toBe("photo_thumb.jpg");
  });

  it("resolves {index} token", () => {
    const result = resolveNamePattern(
      "{name}_{index}",
      "/path/to/photo.jpg",
      5
    );
    expect(result).toBe("photo_5.jpg");
  });

  it("resolves {ext} token", () => {
    const result = resolveNamePattern(
      "{name}.{ext}",
      "/path/to/photo.jpg",
      1
    );
    expect(result).toBe("photo.jpg");
  });

  it("resolves {parent} token", () => {
    const result = resolveNamePattern(
      "{parent}_{name}",
      "/path/to/photo.jpg",
      1
    );
    expect(result).toBe("to_photo.jpg");
  });

  it("resolves {date} token from ctx", () => {
    const result = resolveNamePattern(
      "{name}_{date}",
      "/path/to/photo.jpg",
      1,
      undefined,
      { date: "2025-01-15" }
    );
    expect(result).toBe("photo_2025-01-15.jpg");
  });

  it("uses explicit extension override", () => {
    const result = resolveNamePattern(
      "{name}",
      "/path/to/photo.jpg",
      1,
      "png"
    );
    expect(result).toBe("photo.png");
  });

  it("sanitizes hostile input names", () => {
    const result = resolveNamePattern(
      "{name}",
      "/path/to/-weird name<>.jpg",
      1
    );
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});

describe("naming - buildOutputPath", () => {
  const makeInput = (path: string): PathInput => ({
    path,
    sizeBytes: 1000,
  });

  it("builds flat output in custom directory", () => {
    const result = buildOutputPath(
      makeInput("/input/photo.jpg"),
      "/output",
      "flat",
      "{name}_thumb",
      1
    );
    expect(result).toBe("/output/photo_thumb.jpg");
  });

  it("builds output beside input when dir is null", () => {
    const result = buildOutputPath(
      makeInput("/input/photo.jpg"),
      null,
      "flat",
      "{name}_thumb",
      1
    );
    expect(result).toBe("/input/photo_thumb.jpg");
  });

  it("mirrors folder structure", () => {
    const input: PathInput = {
      path: "/source/sub/photo.jpg",
      sizeBytes: 1000,
      relativeTo: "/source",
    };
    const result = buildOutputPath(
      input,
      "/output",
      "mirror",
      "{name}",
      1
    );
    expect(result).toBe("/output/sub/photo.jpg");
  });

  it("uses explicit extension override", () => {
    const result = buildOutputPath(
      makeInput("/input/photo.jpg"),
      "/output",
      "flat",
      "{name}",
      1,
      "png"
    );
    expect(result).toBe("/output/photo.png");
  });
});
