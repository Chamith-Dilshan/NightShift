import {
  NightShiftTemplate,
  NightShiftPack,
  validateTemplate,
  validatePack,
  TEMPLATE_MAX_FILE_SIZE,
  TEMPLATE_MAX_PACK_SIZE,
  TEMPLATE_MAX_ARGV_TOKENS,
  TEMPLATE_MAX_STRING_LENGTH,
} from "./schema";

/**
 * Parse a raw JSON string as a single template or pack.
 * Returns the parsed result or an error message.
 */
export function parseTemplateFile(
  raw: string,
  fileSize: number
):
  | { ok: true; templates: NightShiftTemplate[] }
  | { ok: false; error: string } {
  // Check file size limit
  if (fileSize > TEMPLATE_MAX_FILE_SIZE) {
    return { ok: false, error: `File too large (${fileSize} bytes). Maximum is ${TEMPLATE_MAX_FILE_SIZE} bytes.` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  // Check if it's a pack or single template
  if (typeof parsed === "object" && parsed !== null && "kind" in parsed) {
    const obj = parsed as Record<string, unknown>;
    if (obj.kind === "nightshift.pack") {
      const result = validatePack(parsed);
      if (!result.ok) {
        return { ok: false, error: `Invalid pack: ${result.errors.join("; ")}` };
      }
      if (result.pack.templates.length > TEMPLATE_MAX_PACK_SIZE) {
        return { ok: false, error: `Pack contains too many templates (${result.pack.templates.length}). Maximum is ${TEMPLATE_MAX_PACK_SIZE}.` };
      }
      return { ok: true, templates: result.pack.templates };
    }
  }

  // Try as single template
  const result = validateTemplate(parsed);
  if (!result.ok) {
    return { ok: false, error: `Invalid template: ${result.errors.join("; ")}` };
  }
  return { ok: true, templates: [result.template] };
}

/**
 * Canonicalize a template for hashing (exclude id, createdAt, updatedAt, author).
 */
export function canonicalizeTemplate(template: NightShiftTemplate): string {
  const { id, createdAt, updatedAt, author, ...rest } = template;
  return JSON.stringify(rest, Object.keys(rest).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
}

/**
 * Compute a SHA-256 content hash for a template.
 */
export async function hashTemplate(template: NightShiftTemplate): Promise<string> {
  const canonical = canonicalizeTemplate(template);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Export a single template to a JSON string.
 */
export function exportTemplate(template: NightShiftTemplate): string {
  return JSON.stringify(template, null, 2);
}

/**
 * Export multiple templates as a pack JSON string.
 */
export function exportPack(templates: NightShiftTemplate[]): string {
  const pack: NightShiftPack = {
    kind: "nightshift.pack",
    templates,
  };
  return JSON.stringify(pack, null, 2);
}

/**
 * Strip portable-sensitive params from a template for export.
 * Returns the stripped template and a list of gaps.
 */
export function stripForExport(
  template: NightShiftTemplate,
  paramDefs?: Record<string, { type?: string; portable?: boolean; label?: string }>
): { template: NightShiftTemplate; gaps: { nodeId: string; param: string; label: string }[] } {
  const gaps: { nodeId: string; param: string; label: string }[] = [];

  const updated = {
    ...template,
    graph: {
      ...template.graph,
      nodes: template.graph.nodes.map((node) => {
        if (node.mode !== "params" || !node.params) return node;

        const newParams = { ...node.params };
        for (const [key, value] of Object.entries(newParams)) {
          // Check if this param is marked non-portable
          const def = paramDefs?.[key];
          const isNonPortable = def?.type === "file" && def.portable === false;

          // Strip absolute paths (simple heuristic: starts with / or drive letter)
          const isAbsolutePath =
            typeof value === "string" &&
            (value.startsWith("/") || /^[A-Za-z]:\\/.test(value));

          if (isNonPortable || isAbsolutePath) {
            const label = def?.label ?? key;
            gaps.push({ nodeId: node.id, param: key, label });
            delete newParams[key];
          }
        }

        return { ...node, params: newParams };
      }),
    },
    portableGaps: gaps.length > 0 ? gaps : template.portableGaps,
  };

  return { template: updated, gaps };
}

/**
 * Validate argv token count and string lengths in raw mode templates.
 */
export function validateRawConstraints(
  template: NightShiftTemplate
): string[] {
  const errors: string[] = [];

  for (const node of template.graph.nodes) {
    if (node.mode !== "raw" || !node.raw) continue;

    // Check argv token count
    if (node.raw.argv.length > TEMPLATE_MAX_ARGV_TOKENS) {
      errors.push(
        `Node "${node.id}" has too many argv tokens (${node.raw.argv.length}). Maximum is ${TEMPLATE_MAX_ARGV_TOKENS}.`
      );
    }

    // Check string lengths
    for (const token of node.raw.argv) {
      if (token.length > TEMPLATE_MAX_STRING_LENGTH) {
        errors.push(
          `Node "${node.id}" has an argv token exceeding ${TEMPLATE_MAX_STRING_LENGTH} characters.`
        );
      }
    }
  }

  return errors;
}
