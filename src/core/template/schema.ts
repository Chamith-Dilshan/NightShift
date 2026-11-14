import { z } from "zod";
import { ParamDefSchema } from "../spec/schema";

// ─── Schema Version ───

export const SUPPORTED_TEMPLATE_SCHEMA_VERSION = 1;

// ─── TemplateNode ───

export const TemplateNodeSchema = z.object({
  id: z.string(),
  tool: z.string(),
  binary: z.string().optional(),
  command: z.string(),
  mode: z.enum(["params", "raw"]),
  params: z.record(z.string(), z.unknown()).optional(),
  raw: z.object({
    argv: z.array(z.string()),
    variables: ParamDefSchema.array().optional(),
  }).optional(),
  inputs: z.record(z.string(), z.object({ from: z.literal("$input") })),
  output: z.object({
    namePattern: z.string().optional(),
    ext: z.string().optional(),
  }),
});

export type TemplateNode = z.infer<typeof TemplateNodeSchema>;

// ─── NightShiftTemplate ───

export const NightShiftTemplateSchema = z.object({
  schemaVersion: z.literal(SUPPORTED_TEMPLATE_SCHEMA_VERSION),
  kind: z.literal("nightshift.template"),
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  requires: z.array(
    z.object({
      tool: z.string(),
      version: z.string().optional(),
      features: z.array(z.string()).optional(),
    })
  ),
  portableGaps: z
    .array(
      z.object({
        nodeId: z.string(),
        param: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  graph: z.object({
    nodes: TemplateNodeSchema.array().min(1),
    edges: z.array(z.unknown()).length(0),
  }),
});

export type NightShiftTemplate = z.infer<typeof NightShiftTemplateSchema>;

// ─── TemplatePack (multiple templates in one file) ───

export const NightShiftPackSchema = z.object({
  kind: z.literal("nightshift.pack"),
  templates: NightShiftTemplateSchema.array().min(1),
});

export type NightShiftPack = z.infer<typeof NightShiftPackSchema>;

// ─── Validation helpers ───

/**
 * Validate a template object. Returns structured errors on failure.
 */
export function validateTemplate(
  raw: unknown
): { ok: true; template: NightShiftTemplate } | { ok: false; errors: string[] } {
  const result = NightShiftTemplateSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    return { ok: false, errors };
  }
  return { ok: true, template: result.data };
}

/**
 * Validate a pack file. Returns structured errors on failure.
 */
export function validatePack(
  raw: unknown
): { ok: true; pack: NightShiftPack } | { ok: false; errors: string[] } {
  const result = NightShiftPackSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    return { ok: false, errors };
  }
  return { ok: true, pack: result.data };
}

// ─── Limits (section 7.5) ───

export const TEMPLATE_MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
export const TEMPLATE_MAX_PACK_SIZE = 200;
export const TEMPLATE_MAX_ARGV_TOKENS = 10_000;
export const TEMPLATE_MAX_STRING_LENGTH = 8 * 1024; // 8 KB
