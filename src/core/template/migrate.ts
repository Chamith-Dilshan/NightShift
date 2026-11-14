import { NightShiftTemplate, TemplateNode } from "./schema";
import { VideoTemplate } from "@/store/templates/types";

/**
 * Migrate v0.1 VideoTemplate to NightShiftTemplate format.
 * v0.1 templates are always ffmpeg, transcode command, params mode.
 */
export function migrateVideoTemplate(v1: VideoTemplate): NightShiftTemplate {
  const now = new Date().toISOString();
  const node: TemplateNode = {
    id: "n1",
    tool: "ffmpeg",
    command: "transcode",
    mode: "params",
    params: v1.settings as unknown as Record<string, unknown>,
    inputs: { in: { from: "$input" } },
    output: {
      namePattern: v1.settings.output.nameTemplate ?? "{name}_nightshift",
    },
  };

  return {
    schemaVersion: 1,
    kind: "nightshift.template",
    id: v1.id,
    name: v1.name,
    author: undefined,
    createdAt: new Date(v1.createdAt).toISOString(),
    updatedAt: now,
    requires: [{ tool: "ffmpeg" }],
    graph: {
      nodes: [node],
      edges: [],
    },
  };
}

/**
 * Migrate a batch of v0.1 templates. Skips built-in ones (they have dedicated presets).
 */
export function migrateVideoTemplates(
  templates: Record<string, VideoTemplate>,
  skipBuiltIn: boolean = true
): NightShiftTemplate[] {
  const migrated: NightShiftTemplate[] = [];

  for (const key of Object.keys(templates)) {
    const t = templates[key];
    if (skipBuiltIn && t.isBuiltIn) continue;
    migrated.push(migrateVideoTemplate(t));
  }

  return migrated;
}
