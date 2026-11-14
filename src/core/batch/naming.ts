/**
 * Output naming for batch processing.
 *
 * Pure TypeScript — no React, Redux, Tauri, or I/O.
 * Resolves name patterns like `{name}_{index}.{ext}` to actual output paths.
 */

import { PathInput } from "./expand-types";

/**
 * Context supplied by the caller for time-dependent tokens.
 */
export interface NamingCtx {
  /** ISO date string for `{date}` token, e.g. "2025-01-15" */
  date?: string;
}

/**
 * Tokens available in name patterns.
 */
export type NameToken =
  | "{name}"
  | "{index}"
  | "{ext}"
  | "{parent}"
  | "{date}";

const TOKEN_RE = /\{(?:name|index|ext|parent|date)\}/g;

/**
 * Check whether a string contains any name tokens.
 */
export function hasTokens(pattern: string): boolean {
  return TOKEN_RE.test(pattern);
}

/**
 * Reserved Windows filenames (case-insensitive).
 */
const RESERVED_WINDOWS_NAMES = new Set([
  "con", "prn", "aux", "nul",
  "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
  "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
]);

/**
 * Characters illegal in Windows filenames.
 */
const ILLEGAL_CHARS_RE = /[<>:"|?*]/g;

/**
 * Sanitize a basename by removing illegal characters and checking reserved names.
 */
export function sanitizeBasename(name: string): string {
  let sanitized = name.replace(ILLEGAL_CHARS_RE, "_");

  // Strip trailing dots and spaces
  sanitized = sanitized.replace(/[\.\s]+$/, "");

  // Empty after sanitization?
  if (sanitized.length === 0) {
    sanitized = "unnamed";
  }

  // Check reserved names
  const lower = sanitized.toLowerCase().split(".")[0];
  if (RESERVED_WINDOWS_NAMES.has(lower)) {
    sanitized = `_${sanitized}`;
  }

  return sanitized;
}

/**
 * Extract the basename without extension from a path.
 */
export function basenameWithoutExt(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  const filename = path.split(sep).pop() ?? path;
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
}

/**
 * Extract the extension (without dot) from a path.
 */
export function extension(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  const filename = path.split(sep).pop() ?? path;
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex > 0 ? filename.substring(dotIndex + 1).toLowerCase() : "";
}

/**
 * Extract the parent directory basename from a path.
 */
export function parentBasename(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  const parts = path.split(sep);
  if (parts.length <= 1) return "";
  return parts[parts.length - 2] ?? "";
}

/**
 * Resolve a name pattern for a single input file.
 *
 * @param pattern - e.g. "{name}_thumb_{index}"
 * @param input - the input file path
 * @param index - 1-based position in batch
 * @param ext - explicit extension override (e.g. from template output.ext)
 * @param ctx - context for date token
 */
export function resolveNamePattern(
  pattern: string,
  input: string,
  index: number,
  ext?: string,
  ctx?: NamingCtx
): string {
  const name = sanitizeBasename(basenameWithoutExt(input));
  const inputExt = extension(input);
  const finalExt = ext ?? inputExt;
  const parent = sanitizeBasename(parentBasename(input));
  const date = ctx?.date ?? "";

  let resolved = pattern.replace(TOKEN_RE, (match) => {
    switch (match as NameToken) {
      case "{name}":
        return name;
      case "{index}":
        return String(index);
      case "{ext}":
        return finalExt;
      case "{parent}":
        return parent;
      case "{date}":
        return date;
      default:
        return match;
    }
  });

  // If pattern didn't include {ext} and no explicit ext was given, append the extension
  if (!hasTokens(pattern.replace("{ext}", "")) || pattern.includes("{ext}")) {
    // Pattern already had {ext} or was a plain string — keep as-is
  } else if (finalExt && !resolved.endsWith(`.${finalExt}`)) {
    resolved = `${resolved}.${finalExt}`;
  }

  return sanitizeBasename(resolved);
}

/**
 * Build an output path for a batch item.
 *
 * @param input - input file info
 * @param outputDir - target directory (null means beside input)
 * @param structure - "flat" or "mirror"
 * @param namePattern - e.g. "{name}_thumb"
 * @param index - 1-based position
 * @param ext - explicit extension override
 * @param ctx - naming context
 */
export function buildOutputPath(
  input: PathInput,
  outputDir: string | null,
  structure: "flat" | "mirror",
  namePattern: string,
  index: number,
  ext?: string,
  ctx?: NamingCtx
): string {
  const name = resolveNamePattern(namePattern, input.path, index, ext, ctx);

  let dir: string;
  if (outputDir) {
    dir = outputDir;
  } else {
    // Beside input
    const sep = input.path.includes("\\") ? "\\" : "/";
    const parts = input.path.split(sep);
    dir = parts.slice(0, -1).join(sep);
  }

  if (structure === "mirror" && input.relativeTo) {
    // Mirror the folder structure relative to the source folder
    const sep = input.path.includes("\\") ? "\\" : "/";
    const relativePath = input.path.substring(input.relativeTo.length);
    // Normalize leading separator
    const relativeWithoutLeadingSep = relativePath.startsWith(sep)
      ? relativePath.substring(1)
      : relativePath;
    const relativeDir = relativeWithoutLeadingSep.split(sep).slice(0, -1).join(sep);
    if (relativeDir) {
      dir = `${dir}${sep}${relativeDir}`;
    }
  }

  const sep = dir.includes("\\") ? "\\" : "/";
  return `${dir}${sep}${name}`;
}
