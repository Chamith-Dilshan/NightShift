/**
 * Batch planning logic.
 *
 * Pure TypeScript — no React, Redux, Tauri, or I/O.
 * Takes expanded inputs and output options, produces a plan with one item per input.
 */

import { PathInput } from "./expand-types";
import {
  buildOutputPath,
  NamingCtx,
  sanitizeBasename,
} from "./naming";

/**
 * Issue found during planning.
 */
export interface PlanIssue {
  severity: "error" | "warning" | "info";
  message: string;
}

/**
 * A single planned batch item.
 */
export interface BatchItem {
  input: PathInput;
  output: string;
  /** 1-based index in the batch */
  index: number;
  /** Display label for the UI */
  display: string;
  issues: PlanIssue[];
  /** Will be skipped due to conflict policy */
  willSkip: boolean;
  /** Output already existed before planning */
  existedBefore: boolean;
}

/**
 * Summary of the batch plan.
 */
export interface BatchSummary {
  total: number;
  runnable: number;
  skipped: number;
  errors: number;
  warnings: number;
}

/**
 * Full batch plan result.
 */
export interface BatchPlan {
  items: BatchItem[];
  summary: BatchSummary;
}

/**
 * Options for output planning.
 */
export interface OutputOptions {
  /** Output directory; null means beside each input */
  dir: string | null;
  /** "flat" or "mirror" structure */
  structure: "flat" | "mirror";
  /** Name pattern, e.g. "{name}_thumb" */
  namePattern: string;
  /** How to handle existing files */
  onConflict: "rename" | "overwrite" | "skip";
  /** Explicit extension override */
  ext?: string;
}

/**
 * Default name pattern.
 */
const DEFAULT_NAME_PATTERN = "{name}";

/**
 * Windows MAX_PATH warning threshold.
 */
const PATH_LENGTH_WARNING = 240;

/**
 * Check if a path looks like it could be a Windows reserved name.
 */
function isReservedName(basename: string): boolean {
  const name = basename.split(".")[0].toLowerCase();
  const reserved = new Set([
    "con", "prn", "aux", "nul",
    "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
    "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
  ]);
  return reserved.has(name);
}

/**
 * Generate a renamed output to avoid collision.
 * Appends a numeric suffix: file.jpg → file_1.jpg, file_1.jpg → file_2.jpg, etc.
 */
function renameForCollision(path: string, existing: Set<string>, index: number): string {
  const sep = path.includes("\\") ? "\\" : "/";
  const dir = path.substring(0, path.lastIndexOf(sep) + 1);
  const filename = path.substring(path.lastIndexOf(sep) + 1);
  const dotIndex = filename.lastIndexOf(".");
  const name = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  const ext = dotIndex > 0 ? filename.substring(dotIndex) : "";

  let candidate = path;
  let attempt = index;
  while (existing.has(candidate.toLowerCase())) {
    candidate = `${dir}${name}_${attempt}${ext}`;
    attempt++;
  }
  return candidate;
}

/**
 * Plan a batch from inputs and output options.
 *
 * @param inputs - expanded input files
 * @param options - output directory, structure, naming, conflict policy
 * @param existing - set of paths that already exist on disk
 * @param ctx - naming context (date, etc.)
 */
export function planBatch(
  inputs: PathInput[],
  options: OutputOptions,
  existing: Set<string>,
  ctx?: NamingCtx
): BatchPlan {
  const {
    dir,
    structure,
    namePattern = DEFAULT_NAME_PATTERN,
    onConflict,
    ext,
  } = options;

  const items: BatchItem[] = [];
  const plannedOutputs = new Set<string>();
  let errors = 0;
  let warnings = 0;
  let skipped = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const index = i + 1;
    const issues: PlanIssue[] = [];
    let willSkip = false;

    // Build output path
    let output = buildOutputPath(input, dir, structure, namePattern, index, ext, ctx);

    // Check: output equals input
    if (output.toLowerCase() === input.path.toLowerCase()) {
      issues.push({
        severity: "error",
        message: "Output path is the same as input",
      });
    }

    // Check: path length warning
    if (output.length > PATH_LENGTH_WARNING) {
      issues.push({
        severity: "warning",
        message: `Output path is ${output.length} characters (warning above ${PATH_LENGTH_WARNING})`,
      });
    }

    // Check: reserved Windows name
    const sep = output.includes("\\") ? "\\" : "/";
    const basename = output.split(sep).pop() ?? "";
    if (isReservedName(basename)) {
      issues.push({
        severity: "error",
        message: `"${basename}" is a reserved Windows name`,
      });
    }

    // Check: illegal characters in basename
    if (/[<>:"|?*]/.test(basename)) {
      issues.push({
        severity: "error",
        message: "Output filename contains illegal characters",
      });
    }

    // Check: collision with existing files
    const existedBefore = existing.has(output.toLowerCase());
    if (existedBefore) {
      if (onConflict === "skip") {
        willSkip = true;
        skipped++;
        issues.push({
          severity: "info",
          message: "Output already exists, will be skipped",
        });
      } else if (onConflict === "rename") {
        // Build a combined set of existing + planned for rename check
        const allExisting = new Set([...existing, ...plannedOutputs]);
        output = renameForCollision(output, allExisting, index);
        issues.push({
          severity: "info",
          message: `Output already exists, renamed to avoid collision`,
        });
      }
      // "overwrite" — no issue added
    }

    // Check: collision with other planned outputs
    const collisionWithPlanned = Array.from(plannedOutputs).find(
      (p) => p.toLowerCase() === output.toLowerCase()
    );
    if (collisionWithPlanned) {
      if (onConflict === "skip") {
        willSkip = true;
        skipped++;
        issues.push({
          severity: "info",
          message: "Duplicate output in batch, will be skipped",
        });
      } else if (onConflict === "rename") {
        output = renameForCollision(output, plannedOutputs, index);
        issues.push({
          severity: "info",
          message: `Duplicate output in batch, renamed`,
        });
      }
    }

    // Count errors and warnings
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    errors += errorCount;
    warnings += warningCount;

    // Display label
    const inputSep = input.path.includes("\\") ? "\\" : "/";
    const inputName = input.path.split(inputSep).pop() ?? input.path;
    const outputSep = output.includes("\\") ? "\\" : "/";
    const outputName = output.split(outputSep).pop() ?? output;
    const display = `${inputName} → ${outputName}`;

    items.push({
      input,
      output,
      index,
      display,
      issues,
      willSkip,
      existedBefore,
    });

    if (!willSkip) {
      plannedOutputs.add(output.toLowerCase());
    }
  }

  const total = items.length;
  const runnable = total - skipped - items.filter((i) =>
    i.issues.some((iss) => iss.severity === "error")
  ).length;

  const summary: BatchSummary = {
    total,
    runnable: Math.max(0, runnable),
    skipped,
    errors,
    warnings,
  };

  return { items, summary };
}
