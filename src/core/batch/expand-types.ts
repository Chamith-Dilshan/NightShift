/**
 * Types for input expansion from Rust's `expand_inputs`.
 *
 * Pure TypeScript — no React, Redux, Tauri, or I/O.
 */

/**
 * A single input file returned by `expand_inputs`.
 */
export interface PathInput {
  /** Absolute path to the file */
  path: string;
  /** File size in bytes */
  sizeBytes: number;
  /** If from a folder source, the folder path used as the base for mirroring */
  relativeTo?: string;
}

/**
 * A skipped input with the reason.
 */
export interface SkippedInput {
  path: string;
  reason: string;
}

/**
 * Result of expanding input sources.
 */
export interface ExpandResult {
  items: PathInput[];
  /** True if the limit was hit and there may be more files */
  truncated: boolean;
  skipped: SkippedInput[];
}

/**
 * An input source specification.
 */
export interface InputSource {
  kind: "file" | "folder";
  path: string;
}

/**
 * Options for expanding inputs.
 */
export interface ExpandOptions {
  /** Recurse into subfolders for folder sources */
  recursive: boolean;
  /** Filter by extensions (e.g. [".jpg", ".png"]) */
  extensions?: string[];
  /** Name filter with * and ? wildcards */
  nameFilter?: string;
  /** Include hidden files */
  includeHidden: boolean;
  /** Maximum number of files */
  limit: number;
}
