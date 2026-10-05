import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TemplatesSliceState, VideoTemplate } from "./types";
import { BUILTIN_PRESETS } from "./presets";
import { VideoSettings } from "../videoTool/types";

const initialTemplates: Record<string, VideoTemplate> = {};
for (const preset of BUILTIN_PRESETS) {
  initialTemplates[preset.id] = preset;
}

const initialState: TemplatesSliceState = {
  templates: initialTemplates,
  activeTemplateId: null,
};

export const templatesSlice = createSlice({
  name: "templates",
  initialState,
  reducers: {
    saveTemplate: (
      state,
      action: PayloadAction<{ name: string; settings: VideoSettings }>
    ) => {
      const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      state.templates[id] = {
        id,
        name: action.payload.name,
        createdAt: Date.now(),
        schemaVersion: 1,
        isBuiltIn: false,
        settings: action.payload.settings,
      };
      state.activeTemplateId = id;
    },
    deleteTemplate: (state, action: PayloadAction<string>) => {
      const t = state.templates[action.payload];
      if (t && !t.isBuiltIn) {
        delete state.templates[action.payload];
        if (state.activeTemplateId === action.payload) {
          state.activeTemplateId = null;
        }
      }
    },
    renameTemplate: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      const t = state.templates[action.payload.id];
      if (t && !t.isBuiltIn) {
        t.name = action.payload.name;
      }
    },
    importTemplates: (state, action: PayloadAction<VideoTemplate[]>) => {
      for (const t of action.payload) {
        state.templates[t.id] = t;
      }
    },
    loadAllTemplates: (
      state,
      action: PayloadAction<Record<string, VideoTemplate>>
    ) => {
      state.templates = {
        ...initialTemplates,
        ...action.payload,
      };
    },
    setActiveTemplateId: (state, action: PayloadAction<string | null>) => {
      state.activeTemplateId = action.payload;
    },
  },
});

export const {
  saveTemplate,
  deleteTemplate,
  renameTemplate,
  importTemplates,
  loadAllTemplates,
  setActiveTemplateId,
} = templatesSlice.actions;

export default templatesSlice.reducer;
