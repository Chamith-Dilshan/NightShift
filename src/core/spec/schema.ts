import { z } from "zod";

// ─── Schema Version ───

const SUPPORTED_SCHEMA_VERSION = 1;

// ─── ValueExpr (forward-declared type for recursion) ───

export type ValueExpr =
  | { param: string }
  | { in: string }
  | { out: string }
  | { literal: string | number | boolean }
  | { format: string }
  | { join: { sep: string; items: { when?: Expr; value: ValueExpr }[] } }
  | { map: { param: string; table: Record<string, string> } };

// ─── Expr (forward-declared type for recursion) ───

export type ExprValue =
  | { param: string }
  | { literal: string | number | boolean }
  | { in: string }
  | { out: string }
  | { toolVersion: true };

export type Expr =
  | { eq: [ExprValue, ExprValue] }
  | { ne: [ExprValue, ExprValue] }
  | { gt: [ExprValue, ExprValue] }
  | { gte: [ExprValue, ExprValue] }
  | { lt: [ExprValue, ExprValue] }
  | { lte: [ExprValue, ExprValue] }
  | { in: [ExprValue, (string | number | boolean)[]] }
  | { set: ExprValue }
  | { unset: ExprValue }
  | { has: { probe: string; value: ExprValue } }
  | { versionGte: string }
  | { and: Expr[] }
  | { or: Expr[] }
  | { not: Expr }
  | { literal: boolean };

// ─── ArgNode (forward-declared type for recursion) ───

export type ArgNode =
  | { kind: "flag"; flag: string; when?: Expr }
  | { kind: "option"; flag: string; value: ValueExpr; style?: "separate" | "equals" | "concat"; when?: Expr }
  | { kind: "positional"; value: ValueExpr; when?: Expr }
  | { kind: "group"; when?: Expr; args: ArgNode[] }
  | { kind: "repeat"; param: string; node: ArgNode };

// ─── Zod schemas (built from interfaces) ───

const ExprValueSchema = z.union([
  z.object({ param: z.string() }),
  z.object({ literal: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({ in: z.string() }),
  z.object({ out: z.string() }),
  z.object({ toolVersion: z.literal(true) }),
]);

function makeExprSchema(): z.ZodType<Expr> {
  return z.union([
    z.object({ eq: z.tuple([ExprValueSchema, ExprValueSchema]) }),
    z.object({ ne: z.tuple([ExprValueSchema, ExprValueSchema]) }),
    z.object({ gt: z.tuple([ExprValueSchema, ExprValueSchema]) }),
    z.object({ gte: z.tuple([ExprValueSchema, ExprValueSchema]) }),
    z.object({ lt: z.tuple([ExprValueSchema, ExprValueSchema]) }),
    z.object({ lte: z.tuple([ExprValueSchema, ExprValueSchema]) }),
    z.object({
      in: z.tuple([ExprValueSchema, z.array(z.union([z.string(), z.number(), z.boolean()]))]),
    }),
    z.object({ set: ExprValueSchema }),
    z.object({ unset: ExprValueSchema }),
    z.object({
      has: z.object({
        probe: z.string(),
        value: ExprValueSchema,
      }),
    }),
    z.object({ versionGte: z.string() }),
    z.object({ and: z.lazy(() => z.array(makeExprSchema())) }),
    z.object({ or: z.lazy(() => z.array(makeExprSchema())) }),
    z.object({ not: z.lazy(() => makeExprSchema()) }),
    z.object({ literal: z.boolean() }),
  ]);
}

export const ExprSchema = makeExprSchema();

function makeValueExprSchema(): z.ZodType<ValueExpr> {
  return z.union([
    z.object({ param: z.string() }),
    z.object({ in: z.string() }),
    z.object({ out: z.string() }),
    z.object({ literal: z.union([z.string(), z.number(), z.boolean()]) }),
    z.object({ format: z.string() }),
    z.object({
      join: z.object({
        sep: z.string(),
        items: z.array(
          z.object({
            when: ExprSchema.optional(),
            value: z.lazy(() => makeValueExprSchema()),
          })
        ),
      }),
    }),
    z.object({
      map: z.object({
        param: z.string(),
        table: z.record(z.string(), z.string()),
      }),
    }),
  ]);
}

export const ValueExprSchema = makeValueExprSchema();

function makeArgNodeSchema(): z.ZodType<ArgNode> {
  return z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("flag"),
      flag: z.string(),
      when: ExprSchema.optional(),
    }),
    z.object({
      kind: z.literal("option"),
      flag: z.string(),
      value: ValueExprSchema,
      style: z.enum(["separate", "equals", "concat"]).optional(),
      when: ExprSchema.optional(),
    }),
    z.object({
      kind: z.literal("positional"),
      value: ValueExprSchema,
      when: ExprSchema.optional(),
    }),
    z.object({
      kind: z.literal("group"),
      when: ExprSchema.optional(),
      args: z.lazy(() => z.array(makeArgNodeSchema())),
    }),
    z.object({
      kind: z.literal("repeat"),
      param: z.string(),
      node: z.lazy(() => makeArgNodeSchema()),
    }),
  ]);
}

export const ArgNodeSchema = makeArgNodeSchema();

// ─── MediaType ───

export const MediaTypeSchema = z.enum([
  "video",
  "audio",
  "image",
  "document",
  "text",
  "json",
  "archive",
  "any",
]);

export type MediaType = z.infer<typeof MediaTypeSchema>;

// ─── PortDef ───

export const PortDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["file", "files", "folder"]),
  accepts: z.object({
    types: MediaTypeSchema.array().optional(),
    extensions: z.string().array().optional(),
  }).optional(),
  required: z.boolean().optional().default(true),
  ext: z.unknown().optional(), // ValueExpr - validated at runtime
});

export type PortDef = {
  id: string;
  label: string;
  kind: "file" | "files" | "folder";
  accepts?: { types?: MediaType[]; extensions?: string[] };
  required?: boolean;
  ext?: ValueExpr;
};

// ─── ParamDef ───

export const ParamDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  help: z.string().optional(),
  group: z.string().optional(),
  type: z.enum([
    "string",
    "int",
    "float",
    "bool",
    "enum",
    "multienum",
    "file",
  ]),
  default: z.unknown().optional(),
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
  pattern: z.string().optional(),
  maxLength: z.number().optional(),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      when: ExprSchema.optional(),
    })
  ).optional(),
  optionsFrom: z.object({
    probe: z.string(),
    filter: z.string().array().optional(),
  }).optional(),
  visibleWhen: ExprSchema.optional(),
  enabledWhen: ExprSchema.optional(),
  portable: z.boolean().optional(),
  risky: z.boolean().optional(),
});

export type ParamDef = z.infer<typeof ParamDefSchema>;

// ─── ArgNode type alias ───

export type ArgNode = z.infer<typeof ArgNodeSchema>;

// ─── RuleDef ───

export const RuleDefSchema = z.object({
  id: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  when: ExprSchema,
  message: z.string(),
});

export type RuleDef = z.infer<typeof RuleDefSchema>;

// ─── ProgressDef ───

export const ProgressDefSchema = z.object({
  parser: z.enum(["none", "ffmpeg-progress", "regex"]),
  inject: z.string().array().optional(),
  regex: z.object({
    pattern: z.string(),
    percentGroup: z.string().optional(),
    currentGroup: z.string().optional(),
    totalGroup: z.string().optional(),
  }).optional(),
  cancel: z.enum(["stdin-q", "terminate"]).optional(),
  durationFrom: z.enum(["probe", "none"]).optional(),
});

export type ProgressDef = z.infer<typeof ProgressDefSchema>;

// ─── CommandDef ───

export const CommandDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  binary: z.string(),
  inputs: PortDefSchema.array(),
  outputs: PortDefSchema.array(),
  groups: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      order: z.number().optional(),
    })
  ).optional(),
  params: ParamDefSchema.array(),
  args: ArgNodeSchema.array(),
  rules: RuleDefSchema.array().optional(),
  endOfOptions: z.boolean().optional(),
  progress: ProgressDefSchema.optional(),
});

export type CommandDef = z.infer<typeof CommandDefSchema>;

// ─── BinaryDef ───

export const BinaryDefSchema = z.object({
  id: z.string(),
  role: z.enum(["primary", "helper"]),
  names: z.object({
    windows: z.string(),
    unix: z.string(),
  }),
});

export type BinaryDef = z.infer<typeof BinaryDefSchema>;

// ─── InstallDef ───

export const InstallDefSchema = z.object({
  manifestId: z.string().optional(),
  sources: z.array(z.enum(["managed", "system", "custom"])),
  detect: z.object({
    binary: z.string(),
    versionArgs: z.string().array(),
    versionRegex: z.string(),
    minVersion: z.string().optional(),
  }),
  hints: z.object({
    windows: z.string().optional(),
    macos: z.string().optional(),
    linux: z.string().optional(),
  }).optional(),
});

export type InstallDef = z.infer<typeof InstallDefSchema>;

// ─── ProbeDef ───

export const ProbeDefSchema = z.object({
  binary: z.string(),
  args: z.string().array(),
  parse: z.object({
    kind: z.enum(["lines", "regex", "json"]),
    pattern: z.string().optional(),
    group: z.number().optional(),
    path: z.string().optional(),
  }),
});

export type ProbeDef = z.infer<typeof ProbeDefSchema>;

// ─── ToolSpec ───

const BundledIdSchema = z.string().regex(
  /^[a-z][a-z0-9-]{1,31}$/,
  "Bundled tool id must match ^[a-z][a-z0-9-]{1,31}$"
);

const UserIdSchema = z.string().regex(
  /^user\.[a-z0-9][a-z0-9-]{0,31}$/,
  "User tool id must start with 'user.'"
);

export const ToolSpecSchema = z.object({
  schemaVersion: z.literal(SUPPORTED_SCHEMA_VERSION),
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum([
    "video",
    "audio",
    "image",
    "document",
    "data",
    "forensics",
    "network",
    "other",
  ]),
  homepage: z.string().url().optional(),
  license: z.object({
    name: z.string(),
    url: z.string().url().optional(),
    note: z.string().optional(),
  }).optional(),
  testedWith: z.string().array().optional(),
  binaries: BinaryDefSchema.array().min(1),
  install: InstallDefSchema,
  probes: z.record(z.string(), ProbeDefSchema).optional(),
  commands: CommandDefSchema.array().min(1),
  builder: z.object({
    kind: z.literal("builtin"),
    id: z.string(),
  }).optional(),
  ui: z.object({
    panel: z.object({
      kind: z.literal("builtin"),
      id: z.string(),
    }).optional(),
  }).optional(),
  smoke: z.object({
    helpArgs: z.string().array().optional(),
    mustMention: z.string().array().optional(),
  }).optional(),
});

export type ToolSpec = z.infer<typeof ToolSpecSchema>;

// ─── Validation helpers ───

/**
 * Strict mode for bundled specs — rejects unknown keys.
 */
export function createStrictSpecSchema() {
  return ToolSpecSchema.strict();
}

/**
 * Tolerant mode for loading — allows unknown keys with a warning.
 */
export function createTolerantSpecSchema() {
  return ToolSpecSchema;
}

/**
 * Validate a spec and check that bundled-only fields are absent for user specs.
 */
export function validateSpecForTier(
  raw: unknown,
  tier: "bundled" | "user"
): { ok: true; spec: ToolSpec } | { ok: false; errors: string[] } {
  // First, parse with tolerant schema
  const parseResult = ToolSpecSchema.safeParse(raw);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return { ok: false, errors };
  }

  const spec = parseResult.data;

  // Validate id format for tier
  if (tier === "bundled") {
    const idResult = BundledIdSchema.safeParse(spec.id);
    if (!idResult.success) {
      return { ok: false, errors: [`id "${spec.id}" is not a valid bundled id`] };
    }
  } else {
    const idResult = UserIdSchema.safeParse(spec.id);
    if (!idResult.success) {
      return { ok: false, errors: [`id "${spec.id}" is not a valid user id`] };
    }
  }

  // User specs cannot have builder or ui.panel
  if (tier === "user") {
    const errors: string[] = [];
    if (spec.builder) {
      errors.push("User specs cannot define 'builder'");
    }
    if (spec.ui?.panel) {
      errors.push("User specs cannot define 'ui.panel'");
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }
  }

  // Check for duplicate param ids within each command
  for (const cmd of spec.commands) {
    const paramIds = new Set<string>();
    for (const param of cmd.params) {
      if (paramIds.has(param.id)) {
        return {
          ok: false,
          errors: [`Command "${cmd.id}" has duplicate param id "${param.id}"`],
        };
      }
      paramIds.add(param.id);
    }
  }

  return { ok: true, spec };
}
