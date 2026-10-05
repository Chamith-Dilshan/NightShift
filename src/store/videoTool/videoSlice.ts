import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  VideoSliceState,
  DEFAULT_VIDEO_SETTINGS,
  VideoSettings,
  ProbeSummary,
} from "./types";

const initialState: VideoSliceState = {
  inputFiles: [],
  probes: {},
  settings: DEFAULT_VIDEO_SETTINGS,
  commandMode: "auto",
  manualCommand: "",
};

export const videoSlice = createSlice({
  name: "video",
  initialState,
  reducers: {
    setInputFiles: (state, action: PayloadAction<string[]>) => {
      state.inputFiles = action.payload;
    },
    addInputFiles: (state, action: PayloadAction<string[]>) => {
      for (const file of action.payload) {
        if (!state.inputFiles.includes(file)) {
          state.inputFiles.push(file);
        }
      }
    },
    removeInputFile: (state, action: PayloadAction<number>) => {
      const removed = state.inputFiles.splice(action.payload, 1);
      if (removed.length > 0 && removed[0]) {
        delete state.probes[removed[0]];
      }
    },
    clearInputFiles: (state) => {
      state.inputFiles = [];
      state.probes = {};
    },
    setProbe: (
      state,
      action: PayloadAction<{ path: string; probe: ProbeSummary }>
    ) => {
      state.probes[action.payload.path] = action.payload.probe;
    },
    setSettings: (state, action: PayloadAction<VideoSettings>) => {
      state.settings = action.payload;
    },
    updateOutputSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["output"]>>
    ) => {
      state.settings.output = {
        ...state.settings.output,
        ...action.payload,
      };
    },
    updateVideoSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["video"]>>
    ) => {
      state.settings.video = {
        ...state.settings.video,
        ...action.payload,
      };
    },
    updateAudioSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["audio"]>>
    ) => {
      state.settings.audio = {
        ...state.settings.audio,
        ...action.payload,
      };
    },
    updateTrimSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["trim"]>>
    ) => {
      state.settings.trim = {
        ...state.settings.trim,
        ...action.payload,
      };
    },
    updateCropSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["crop"]>>
    ) => {
      state.settings.crop = {
        ...state.settings.crop,
        ...action.payload,
      };
    },
    updateFiltersSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["filters"]>>
    ) => {
      state.settings.filters = {
        ...state.settings.filters,
        ...action.payload,
      };
    },
    updateTransformsSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["transforms"]>>
    ) => {
      state.settings.transforms = {
        ...state.settings.transforms,
        ...action.payload,
      };
    },
    updateWatermarkSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["watermark"]>>
    ) => {
      state.settings.watermark = {
        ...state.settings.watermark,
        ...action.payload,
      };
    },
    updateGifSettings: (
      state,
      action: PayloadAction<Partial<VideoSettings["gif"]>>
    ) => {
      state.settings.gif = {
        ...state.settings.gif,
        ...action.payload,
      };
    },
    resetSettings: (state) => {
      state.settings = DEFAULT_VIDEO_SETTINGS;
    },
    setCommandMode: (state, action: PayloadAction<"auto" | "manual">) => {
      state.commandMode = action.payload;
    },
    setManualCommand: (state, action: PayloadAction<string>) => {
      state.manualCommand = action.payload;
      state.commandMode = "manual";
    },
    resetToAuto: (state) => {
      state.commandMode = "auto";
      state.manualCommand = "";
    },
  },
});

export const {
  setInputFiles,
  addInputFiles,
  removeInputFile,
  clearInputFiles,
  setProbe,
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
  setCommandMode,
  setManualCommand,
  resetToAuto,
} = videoSlice.actions;

export default videoSlice.reducer;
