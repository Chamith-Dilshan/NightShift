import { TemplateNode } from "./schema";

// ─── Built-in placeholders ───

export const BUILTIN_PLACEHOLDERS = [
  "input",
  "output",
  "name",
  "ext",
  "index",
  "inputDir",
] as const;

export type BuiltinPlaceholder = (typeof BUILTIN_PLACEHOLDERS)[number];

// ─── Variable placeholder pattern ───

const VAR_PLACEHOLDER_RE = /\{var:([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
const BUILTIN_PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
const ESCAPED_BRACE_RE = /\{\{|\}\}/g;

/**
 * Resolve placeholders in a single argv token.
 * Built-in placeholders are resolved from context values.
 * Variables are resolved from variableValues.
 * Unknown placeholders produce an error.
 */
export function resolveToken(
  token: string,
  context: Record<string, string>,
  variableValues: Record<string, unknown>,
  variables?: { id: string; label: string }[]
): { value: string; errors: string[] } {
  const errors: string[] = [];
  const varIds = new Set(variables?.map((v) => v.id));

  // First, protect escaped braces
  let resolved = token.replace(ESCAPED_BRACE_RE, (match) => {
    return match === "{{" ? "{" : "}";
  });

  // Resolve {var:<id>} placeholders
  resolved = resolved.replace(VAR_PLACEHOLDER_RE, (match, varId) => {
    if (!varIds.has(varId)) {
      errors.push(`Unknown variable: ${varId}`);
      return match;
    }
    const value = variableValues[varId];
    if (value === undefined || value === null) {
      errors.push(`Variable "${varId}" is not set`);
      return match;
    }
    return String(value);
  });

  // Resolve built-in placeholders {input}, {output}, etc.
  resolved = resolved.replace(BUILTIN_PLACEHOLDER_RE, (match, name) => {
    if (BUILTIN_PLACEHOLDERS.includes(name as BuiltinPlaceholder)) {
      const value = context[name];
      if (value === undefined) {
        errors.push(`Placeholder "${name}" has no value`);
        return match;
      }
      return value;
    }
    // Check if it's a variable name (without var: prefix)
    if (varIds.has(name)) {
      const value = variableValues[name];
      if (value === undefined || value === null) {
        errors.push(`Variable "${name}" is not set`);
        return match;
      }
      return String(value);
    }
    errors.push(`Unknown placeholder: ${name}`);
    return match;
  });

  return { value: resolved, errors };
}

/**
 * Resolve all argv tokens for a raw-mode node.
 * Returns the resolved argv and any errors.
 */
export function resolveRawArgv(
  node: TemplateNode,
  context: Record<string, string>,
  variableValues: Record<string, unknown>
): { argv: string[]; errors: string[] } {
  if (node.mode !== "raw" || !node.raw) {
    return { argv: [], errors: ["Node is not in raw mode"] };
  }

  const allErrors: string[] = [];
  const raw = node.raw!; // already checked above
  const argv = raw.argv.map((token) => {
    const { value, errors } = resolveToken(token, context, variableValues, raw.variables);
    allErrors.push(...errors);
    return value;
  });

  return { argv, errors: allErrors };
}

/**
 * Check if a token contains any placeholders.
 */
export function hasPlaceholders(token: string): boolean {
  return /\{[^}]+\}/.test(token);
}

/**
 * Extract all variable IDs referenced in argv tokens.
 */
export function extractVariableReferences(argv: string[]): string[] {
  const refs = new Set<string>();
  for (const token of argv) {
    const matches = token.matchAll(VAR_PLACEHOLDER_RE);
    for (const match of matches) {
      refs.add(match[1]);
    }
  }
  return Array.from(refs);
}

/**
 * Validate that all variable references in argv are declared.
 */
export function validateVariableReferences(
  node: TemplateNode
): string[] {
  const errors: string[] = [];
  if (node.mode !== "raw" || !node.raw) return errors;

  const declaredVars = new Set(node.raw.variables?.map((v) => v.id) ?? []);
  const refs = extractVariableReferences(node.raw.argv);

  for (const ref of refs) {
    if (!declaredVars.has(ref)) {
      errors.push(`Variable "${ref}" is used but not declared`);
    }
  }

  return errors;
}
