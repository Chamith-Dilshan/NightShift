import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/* ================================
   1. STATE TYPE
================================ */

export interface VideoSliceType {
  inputFiles: string[];
  outputName: string;
  outputDir: string;

  format: "mp4" | "webm" | "gif" | "custom";
  commandMode: "auto" | "manual";
  manualCommand: string;

  video: {
    enabled: boolean;
    codec: string;
    crf: number;
    preset: string;
    resolution: string;
    frameRate: number;
    bitrate: string;
    fps: number;
  };

  audio: {
    enabled: boolean;
    codec: string;
    bitrate: string;
    channels: number;
  };

  filters: {
    grayscale: boolean;
    blur: number;
    sharpen: number;
    saturation: number;
  };

  transforms: {
    rotate: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
  };

  watermark: {
    filePath: string | null;
    position: string;
    opacity: number;
  };
}

/* ================================
   2. Initial State
================================ */

const initialState: VideoSliceType = {
  inputFiles: [],
  outputName: "output.mp4",
  outputDir: "",

  format: "mp4",
  commandMode: "auto",
  manualCommand: "",

  video: {
    enabled: true,
    codec: "libx264",
    crf: 23,
    preset: "medium",
    resolution: "",
    frameRate: 30,
    bitrate: "",
    fps: 30,
  },

  audio: {
    enabled: true,
    codec: "aac",
    bitrate: "128k",
    channels: 2,
  },

  filters: {
    grayscale: false,
    blur: 0,
    sharpen: 0,
    saturation: 1,
  },

  transforms: {
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
  },

  watermark: {
    filePath: null,
    position: "10:10",
    opacity: 1,
  },
};

/* ================================
   3. Reducers & Actions
================================ */

export const videoSlice = createSlice({
  name: "videoTool",
  initialState,

  reducers: {
    /* INPUT FILES */
    addInputFiles(state, action: PayloadAction<string[]>) {
      state.inputFiles.push(...action.payload);
    },

    removeInputFile(state, action: PayloadAction<string>) {
      state.inputFiles = state.inputFiles.filter((f) => f !== action.payload);
    },

    /* OUTPUT */
    setOutputDir(state, action: PayloadAction<string>) {
      state.outputDir = action.payload;
    },

    setOutputName(state, action: PayloadAction<string>) {
      state.outputName = action.payload;
    },

    /* VIDEO SETTINGS */
    setVideoCodec(state, action: PayloadAction<string>) {
      state.video.codec = action.payload;
    },

    setCRF(state, action: PayloadAction<number>) {
      state.video.crf = action.payload;
    },

    /* COMMAND MODE */
    setCommandMode(state, action: PayloadAction<"auto" | "manual">) {
      state.commandMode = action.payload;
    },

    setManualCommand(state, action: PayloadAction<string>) {
      state.manualCommand = action.payload;
    },
  },
});

export const {
  addInputFiles,
  removeInputFile,
  setOutputDir,
  setOutputName,
  setVideoCodec,
  setCRF,
  setCommandMode,
  setManualCommand,
} = videoSlice.actions;

export default videoSlice.reducer;
