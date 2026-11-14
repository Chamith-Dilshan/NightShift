import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TemplatesSliceState, StoredTemplate } from "./types";
import { NightShiftTemplate } from "@/core/template/schema";
import { BUILTIN_PRESETS } from "./presets";

const initialTemplates: Record<string, StoredTemplate> = {};
for (const preset of BUILTIN_PRESETS) {
  initialTemplates[preset.id] = { ...preset, isBuiltIn: true };
}

const initialState: TemplatesSliceState = {
  templates: initialTemplates,
  activeTemplateId: null,
};

export const templatesSlice = createSlice({
  name: "templates",
  initialState,
  reducers: {
    /** Save a new template (thunk generates id and timestamps) */
    saveTemplate: (
      state,
      action: PayloadAction<NightShiftTemplate>
    ) => {
      const tpl = action.payload;
      state.templates[tpl.id] = { ...tpl, isBuiltIn: false };
      state.activeTemplateId = tpl.id;
    },
    /** Delete a user template */
    deleteTemplate: (state, action: PayloadAction<string>) => {
      const t = state.templates[action.payload];
      if (t && !t.isBuiltIn) {
        delete state.templates[action.payload];
        if (state.activeTemplateId === action.payload) {
          state.activeTemplateId = null;
        }
      }
    },
    /** Rename a user template */
    renameTemplate: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      const t = state.templates[action.payload.id];
      if (t && !t.isBuiltIn) {
        t.name = action.payload.name;
        t.updatedAt = new Date().toISOString();
      }
    },
    /** Update template tags */
    updateTemplateTags: (
      state,
      action: PayloadAction<{ id: string; tags: string[] }>
    ) => {
      const t = state.templates[action.payload.id];
      if (t && !t.isBuiltIn) {
        t.tags = action.payload.tags;
        t.updatedAt = new Date().toISOString();
      }
    },
    /** Update template description */
    updateTemplateDescription: (
      state,
      action: PayloadAction<{ id: string; description: string }>
    ) => {
      const t = state.templates[action.payload.id];
      if (t && !t.isBuiltIn) {
        t.description = action.payload.description;
        t.updatedAt = new Date().toISOString();
      }
    },
    /** Duplicate a template */
    duplicateTemplate: (
      state,
      action: PayloadAction<string>
    ) => {
      const original = state.templates[action.payload];
      if (!original) return;

      const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const duplicated: StoredTemplate = {
        ...JSON.parse(JSON.stringify(original)),
        id,
        name: `${original.name} (copy)`,
        createdAt: now,
        updatedAt: now,
        isBuiltIn: false,
      };
      state.templates[id] = duplicated;
      state.activeTemplateId = id;
    },
    /** Import templates (after review) */
    importTemplates: (state, action: PayloadAction<StoredTemplate[]>) => {
      for (const t of action.payload) {
        state.templates[t.id] = t;
      }
    },
    /** Load all templates from disk (hydrate) */
    loadAllTemplates: (
      state,
      action: PayloadAction<Record<string, StoredTemplate>>
    ) => {
      state.templates = {
        ...initialTemplates,
        ...action.payload,
      };
    },
    /** Set the active template */
    setActiveTemplateId: (state, action: PayloadAction<string | null>) => {
      state.activeTemplateId = action.payload;
    },
    /** Apply a template's params to the workbench (thunk dispatches adapter.apply) */
    applyTemplate: (state, action: PayloadAction<string>) => {
      state.activeTemplateId = action.payload;
    },
  },
});

export const {
  saveTemplate,
  deleteTemplate,
  renameTemplate,
  updateTemplateTags,
  updateTemplateDescription,
  duplicateTemplate,
  importTemplates,
  loadAllTemplates,
  setActiveTemplateId,
  applyTemplate,
} = templatesSlice.actions;

export default templatesSlice.reducer;
