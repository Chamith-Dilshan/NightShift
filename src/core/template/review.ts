import { NightShiftTemplate } from "./schema";
import { SUPPORTED_TEMPLATE_SCHEMA_VERSION } from "./schema";

// ─── Warning types ───

export interface ReviewWarning {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
}

// ─── URL schemes to warn about ───

const URL_SCHEMES = [
  "http:",
  "https:",
  "ftp:",
  "tcp:",
  "udp:",
  "file:",
  "concat:",
  "pipe:",
  "rtp:",
  "rtsp:",
];

// ─── Absolute path detection ───

const ABSOLUTE_PATH_RE = /^\/|[A-Za-z]:\\/;

/**
 * Review a template for security warnings before importing.
 * Implements the rules from section 7.5.
 */
export function reviewTemplate(
  template: NightShiftTemplate,
  installedTools: string[],
  bundledToolIds: string[],
  installedVersions?: Record<string, string>
): ReviewWarning[] {
  const warnings: ReviewWarning[] = [];
  const node = template.graph.nodes[0]; // v0.2: exactly one node

  // 1. Check schema version
  if (template.schemaVersion > SUPPORTED_TEMPLATE_SCHEMA_VERSION) {
    warnings.push({
      severity: "error",
      category: "schema",
      message: `This template requires a newer version of NightShift (schema v${template.schemaVersion}).`,
    });
  }

  // 2. Check for multi-node graph (v0.2 rejects)
  if (template.graph.nodes.length > 1) {
    warnings.push({
      severity: "error",
      category: "graph",
      message: "Workflows with several steps need a newer NightShift.",
    });
  }

  // 3. Check for non-empty edges (v0.2 rejects)
  if (template.graph.edges.length > 0) {
    warnings.push({
      severity: "error",
      category: "graph",
      message: "Workflows with several steps need a newer NightShift.",
    });
  }

  // 4. Check tool requirements
  for (const req of template.requires) {
    if (!installedTools.includes(req.tool)) {
      const isBundled = bundledToolIds.includes(req.tool);
      if (isBundled) {
        warnings.push({
          severity: "warning",
          category: "tool",
          message: `Requires "${req.tool}" which is not installed. You can install it from the catalog.`,
        });
      } else {
        warnings.push({
          severity: "warning",
          category: "tool",
          message: `Requires "${req.tool}" which is unknown to this install.`,
        });
      }
    }

    // Check version requirement
    if (req.version && installedVersions?.[req.tool]) {
      const installed = installedVersions[req.tool];
      const versionOk = checkVersionRequirement(installed, req.version);
      if (!versionOk) {
        warnings.push({
          severity: "warning",
          category: "version",
          message: `Installed "${req.tool}" version ${installed} may not satisfy requirement ${req.version}.`,
        });
      }
    }
  }

  // 5. Raw mode warning
  if (node.mode === "raw") {
    warnings.push({
      severity: "warning",
      category: "mode",
      message: "This template uses raw command mode — review the arguments carefully.",
    });

    // 6. Check for URL schemes in raw args
    if (node.raw) {
      for (const token of node.raw.argv) {
        for (const scheme of URL_SCHEMES) {
          if (token.includes(scheme)) {
            warnings.push({
              severity: "warning",
              category: "url",
              message: `Argument contains URL scheme "${scheme}" — this may access network resources.`,
            });
            break;
          }
        }

        // 7. Check for absolute paths in raw args
        if (ABSOLUTE_PATH_RE.test(token)) {
          warnings.push({
            severity: "warning",
            category: "path",
            message: `Argument contains an absolute path: "${token.substring(0, 50)}${token.length > 50 ? "..." : ""}"`,
          });
        }
      }
    }
  }

  // 8. Check for risky params (if spec provides risky flag)
  // This is checked at the spec level; templates just carry the values

  // 9. Portable gaps info
  if (template.portableGaps && template.portableGaps.length > 0) {
    warnings.push({
      severity: "info",
      category: "portable",
      message: `${template.portableGaps.length} file path(s) were stripped for portability. You will need to select them.`,
    });
  }

  return warnings;
}

/**
 * Simple version requirement check (supports >=, <=, >, <, = prefixes).
 */
function checkVersionRequirement(installed: string, requirement: string): boolean {
  let op = ">=";
  let version = requirement;

  if (requirement.startsWith(">=")) {
    op = ">=";
    version = requirement.slice(2);
  } else if (requirement.startsWith("<=")) {
    op = "<=";
    version = requirement.slice(2);
  } else if (requirement.startsWith(">")) {
    op = ">";
    version = requirement.slice(1);
  } else if (requirement.startsWith("<")) {
    op = "<";
    version = requirement.slice(1);
  } else if (requirement.startsWith("=")) {
    op = "=";
    version = requirement.slice(1);
  }

  const compare = compareVersions(installed, version);

  switch (op) {
    case ">=":
      return compare >= 0;
    case "<=":
      return compare <= 0;
    case ">":
      return compare > 0;
    case "<":
      return compare < 0;
    case "=":
      return compare === 0;
    default:
      return true;
  }
}

/**
 * Compare two version strings (lenient, same as core/spec/versions).
 */
function compareVersions(a: string, b: string): number {
  const partsA = parseVersion(a);
  const partsB = parseVersion(b);

  if (partsA.length === 0 || partsB.length === 0) {
    return 0;
  }

  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const pa = i < partsA.length ? partsA[i] : 0;
    const pb = i < partsB.length ? partsB[i] : 0;
    if (pa > pb) return 1;
    if (pa < pb) return -1;
  }
  return 0;
}

function parseVersion(v: string): number[] {
  const match = v.match(/^(\d+(?:\.\d+)*)/);
  if (!match) return [];
  return match[1].split(".").map(Number);
}

/**
 * Get the tools required by a template.
 */
export function getRequiredTools(template: NightShiftTemplate): string[] {
  return template.requires.map((r) => r.tool);
}

/**
 * Get the mode badge text for display.
 */
export function getModeBadge(template: NightShiftTemplate): string {
  const node = template.graph.nodes[0];
  return node.mode === "raw" ? "Raw command" : "Params";
}
