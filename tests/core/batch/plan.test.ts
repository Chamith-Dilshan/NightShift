import { describe, it, expect } from "vitest";
import { planBatch, OutputOptions } from "@/core/batch/plan";
import { PathInput } from "@/core/batch/expand-types";

describe("planBatch - basic planning", () => {
  const makeInputs = (paths: string[]): PathInput[] =>
    paths.map((path) => ({ path, sizeBytes: 1000 }));

  it("plans a simple batch with no collisions", () => {
    const inputs = makeInputs(["/input/a.jpg", "/input/b.jpg", "/input/c.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}_thumb",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    expect(plan.summary.total).toBe(3);
    expect(plan.summary.runnable).toBe(3);
    expect(plan.summary.errors).toBe(0);
    expect(plan.items[0].output).toBe("/output/a_thumb.jpg");
    expect(plan.items[1].output).toBe("/output/b_thumb.jpg");
    expect(plan.items[2].output).toBe("/output/c_thumb.jpg");
  });

  it("detects collision with existing files (rename policy)", () => {
    const inputs = makeInputs(["/input/a.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}",
      onConflict: "rename",
    };
    const existing = new Set(["/output/a.jpg".toLowerCase()]);

    const plan = planBatch(inputs, options, existing);

    expect(plan.items[0].existedBefore).toBe(true);
    expect(plan.items[0].output).not.toBe("/output/a.jpg");
    expect(plan.items[0].output).toContain("_1");
  });

  it("skips files when onConflict is skip", () => {
    const inputs = makeInputs(["/input/a.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}",
      onConflict: "skip",
    };
    const existing = new Set(["/output/a.jpg".toLowerCase()]);

    const plan = planBatch(inputs, options, existing);

    expect(plan.items[0].willSkip).toBe(true);
    expect(plan.summary.skipped).toBe(1);
    expect(plan.summary.runnable).toBe(0);
  });

  it("allows overwrite without issues", () => {
    const inputs = makeInputs(["/input/a.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}",
      onConflict: "overwrite",
    };
    const existing = new Set(["/output/a.jpg".toLowerCase()]);

    const plan = planBatch(inputs, options, existing);

    expect(plan.items[0].willSkip).toBe(false);
    expect(plan.items[0].existedBefore).toBe(true);
    expect(plan.items[0].issues.length).toBe(0);
  });
});

describe("planBatch - collision detection", () => {
  const makeInputs = (paths: string[]): PathInput[] =>
    paths.map((path) => ({ path, sizeBytes: 1000 }));

  it("detects collision between planned outputs", () => {
    // Two inputs that would produce the same output
    const inputs = makeInputs(["/input/a.jpg", "/input/sub/a.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    // Second item should be renamed
    expect(plan.items[1].output).not.toBe(plan.items[0].output);
  });

  it("detects output equals input", () => {
    const inputs = makeInputs(["/input/a.jpg"]);
    const options: OutputOptions = {
      dir: null,
      structure: "flat",
      namePattern: "{name}",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    const errorIssue = plan.items[0].issues.find(
      (i) => i.severity === "error" && i.message.includes("same as input")
    );
    expect(errorIssue).toBeDefined();
  });
});

describe("planBatch - reserved names and illegal characters", () => {
  const makeInputs = (paths: string[]): PathInput[] =>
    paths.map((path) => ({ path, sizeBytes: 1000 }));

  it("sanitizes reserved Windows names in output", () => {
    const inputs = makeInputs(["/input/con.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    // sanitizeBasename prefixes reserved names with _
    expect(plan.items[0].output).toBe("/output/_con.jpg");
  });
});

describe("planBatch - mirror structure", () => {
  it("mirrors folder structure", () => {
    const inputs: PathInput[] = [
      { path: "/source/a/b/file.jpg", sizeBytes: 1000, relativeTo: "/source" },
    ];
    const options: OutputOptions = {
      dir: "/output",
      structure: "mirror",
      namePattern: "{name}",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    expect(plan.items[0].output).toBe("/output/a/b/file.jpg");
  });
});

describe("planBatch - name pattern tokens", () => {
  const makeInputs = (paths: string[]): PathInput[] =>
    paths.map((path) => ({ path, sizeBytes: 1000 }));

  it("resolves {index} token", () => {
    const inputs = makeInputs(["/input/a.jpg", "/input/b.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{index}_{name}",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    expect(plan.items[0].output).toBe("/output/1_a.jpg");
    expect(plan.items[1].output).toBe("/output/2_b.jpg");
  });

  it("resolves {date} token from ctx", () => {
    const inputs = makeInputs(["/input/a.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}_{date}",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing, { date: "2025-01-15" });

    expect(plan.items[0].output).toBe("/output/a_2025-01-15.jpg");
  });
});

describe("planBatch - extension override", () => {
  const makeInputs = (paths: string[]): PathInput[] =>
    paths.map((path) => ({ path, sizeBytes: 1000 }));

  it("uses explicit extension override", () => {
    const inputs = makeInputs(["/input/a.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}",
      onConflict: "rename",
      ext: "png",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    expect(plan.items[0].output).toBe("/output/a.png");
  });
});

describe("planBatch - summary counts", () => {
  const makeInputs = (paths: string[]): PathInput[] =>
    paths.map((path) => ({ path, sizeBytes: 1000 }));

  it("counts errors correctly", () => {
    // Output equals input is an error
    const inputs = makeInputs(["/input/a.jpg"]);
    const options: OutputOptions = {
      dir: null,
      structure: "flat",
      namePattern: "{name}",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    expect(plan.summary.errors).toBeGreaterThan(0);
    expect(plan.summary.runnable).toBe(0);
  });

  it("counts skipped correctly", () => {
    const inputs = makeInputs(["/input/a.jpg", "/input/b.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}",
      onConflict: "skip",
    };
    const existing = new Set([
      "/output/a.jpg".toLowerCase(),
      "/output/b.jpg".toLowerCase(),
    ]);

    const plan = planBatch(inputs, options, existing);

    expect(plan.summary.skipped).toBe(2);
    expect(plan.summary.runnable).toBe(0);
  });
});

describe("planBatch - display labels", () => {
  const makeInputs = (paths: string[]): PathInput[] =>
    paths.map((path) => ({ path, sizeBytes: 1000 }));

  it("generates display labels", () => {
    const inputs = makeInputs(["/input/photo.jpg"]);
    const options: OutputOptions = {
      dir: "/output",
      structure: "flat",
      namePattern: "{name}_thumb",
      onConflict: "rename",
    };
    const existing = new Set<string>();

    const plan = planBatch(inputs, options, existing);

    expect(plan.items[0].display).toContain("photo.jpg");
    expect(plan.items[0].display).toContain("photo_thumb.jpg");
  });
});
