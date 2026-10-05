import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { RootState } from "../store";
import {
  saveTemplate,
  deleteTemplate,
  renameTemplate,
  importTemplates,
} from "../templates/templatesSlice";
import {
  setSettings,
  updateOutputSettings,
  updateVideoSettings,
  updateAudioSettings,
  updateTrimSettings,
  updateCropSettings,
  updateFiltersSettings,
  updateTransformsSettings,
  updateWatermarkSettings,
  updateGifSettings,
  resetSettings,
} from "../videoTool/videoSlice";
import { saveTemplatesToDisk, saveLastSettingsToDisk } from "./storage";

export const persistenceListener = createListenerMiddleware();

// Listen to template changes
persistenceListener.startListening({
  matcher: isAnyOf(
    saveTemplate,
    deleteTemplate,
    renameTemplate,
    importTemplates
  ),
  effect: async (_action, listenerApi) => {
    listenerApi.cancelActiveListeners();
    await listenerApi.delay(300);
    const state = listenerApi.getState() as RootState;
    await saveTemplatesToDisk(state.templates.templates);
  },
});

// Listen to video settings changes
persistenceListener.startListening({
  matcher: isAnyOf(
    setSettings,
    updateOutputSettings,
    updateVideoSettings,
    updateAudioSettings,
    updateTrimSettings,
    updateCropSettings,
    updateFiltersSettings,
    updateTransformsSettings,
    updateWatermarkSettings,
    updateGifSettings,
    resetSettings
  ),
  effect: async (_action, listenerApi) => {
    listenerApi.cancelActiveListeners();
    await listenerApi.delay(300);
    const state = listenerApi.getState() as RootState;
    await saveLastSettingsToDisk(state.video.settings);
  },
});
