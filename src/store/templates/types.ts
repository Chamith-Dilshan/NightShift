import { VideoSettings } from "../videoTool/types";

export interface VideoTemplate {
  id: string;
  name: string;
  createdAt: number;
  schemaVersion: 1;
  isBuiltIn?: boolean;
  settings: VideoSettings;
}

export interface TemplatesSliceState {
  templates: Record<string, VideoTemplate>;
  activeTemplateId: string | null;
}
