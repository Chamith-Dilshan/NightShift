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

// Keep VideoTemplate for v0.1 migration only
import { VideoSettings } from "../videoTool/types";

export interface VideoTemplate {
  id: string;
  name: string;
  createdAt: number;
  schemaVersion: 1;
  isBuiltIn?: boolean;
  settings: VideoSettings;
}
