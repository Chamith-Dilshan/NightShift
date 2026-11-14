import { NightShiftTemplate } from "@/core/template/schema";

/**
 * Store-level template wraps the core type with metadata.
 */
export interface StoredTemplate extends NightShiftTemplate {
  isBuiltIn?: boolean;
}

export interface TemplatesSliceState {
  templates: Record<string, StoredTemplate>;
  activeTemplateId: string | null;
}
