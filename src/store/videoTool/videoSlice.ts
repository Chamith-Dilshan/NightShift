import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/* ================================
   1. STATE TYPE
================================ */

export type VideoTemplate = Omit<VideoSliceState, "inputFiles" | "templates">;

export interface VideoSliceState {
  inputFiles: string[];
  templates: Record<string, VideoTemplate>;

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
   2. Initial State Constants
================================ */

export const DEFAULT_VIDEO = {
  enabled: true,
  codec: "libx264",
  crf: 23,
  preset: "medium",
  resolution: "original",
  frameRate: 30,
  bitrate: "",
  fps: 30,
};

export const DEFAULT_AUDIO = {
  enabled: true,
  codec: "aac",
  bitrate: "128k",
  channels: 2,
};

export const DEFAULT_FILTERS = {
  grayscale: false,
  blur: 0,
  sharpen: 0,
  saturation: 1,
};

export const DEFAULT_TRANSFORMS = {
  rotate: 0,
  flipHorizontal: false,
  flipVertical: false,
};

export const DEFAULT_WATERMARK = {
  filePath: null as string | null,
  position: "10:10",
  opacity: 1,
};

/* ================================
   3. Initial State Loading
================================ */

function loadSavedTemplates(): Record<string, VideoTemplate> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem("nightshift_templates");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load templates", e);
  }
  return {};
}

const initialState: VideoSliceState = {
  inputFiles: [],
  templates: loadSavedTemplates(),
  outputName: "output",
  outputDir: "",

  format: "mp4",
  commandMode: "auto",
  manualCommand: "",

  video: { ...DEFAULT_VIDEO },
  audio: { ...DEFAULT_AUDIO },
  filters: { ...DEFAULT_FILTERS },
  transforms: { ...DEFAULT_TRANSFORMS },
  watermark: { ...DEFAULT_WATERMARK },
};

/* ================================
   4. Reducers & Actions
================================ */

export const videoSlice = createSlice({
  name: "videoTool",
  initialState,

  reducers: {
    /* INPUT FILES */
    addInputFiles(state, action: PayloadAction<string[]>) {
      // Deduplicate before adding
      const existing = new Set(state.inputFiles);
      action.payload.forEach((f) => {
        if (!existing.has(f)) state.inputFiles.push(f);
      });
    },

    removeInputFile(state, action: PayloadAction<string>) {
      state.inputFiles = state.inputFiles.filter(
        (file) => file !== action.payload,
      );
    },

    removeAllInputFiles(state) {
      state.inputFiles = [];
    },

    /* OUTPUT */
    setOutputDir(state, action: PayloadAction<string>) {
      state.outputDir = action.payload;
    },

    setOutputName(state, action: PayloadAction<string>) {
      state.outputName = action.payload;
    },

    setFormat(state, action: PayloadAction<"mp4" | "webm" | "gif" | "custom">) {
      const newFormat = action.payload;
      state.format = newFormat;

      // Smart format reactivity: Adjust codecs based on the selected format container
      if (newFormat === "webm") {
        if (state.video.codec.includes("libx")) {
          state.video.codec = "libvpx-vp9";
        }
        if (state.audio.codec === "aac" || state.audio.codec === "mp3") {
          state.audio.codec = "opus";
        }
      } else if (newFormat === "mp4") {
        if (state.video.codec === "libvpx-vp9" || state.video.codec === "libaom-av1") {
          state.video.codec = "libx264";
        }
        if (state.audio.codec === "opus" || state.audio.codec === "flac") {
          state.audio.codec = "aac";
        }
      } else if (newFormat === "gif") {
        // GIFs cannot contain audio
        state.audio.enabled = false;
      }
    },

    /* COMMAND MODE */
    setCommandMode(state, action: PayloadAction<"auto" | "manual">) {
      state.commandMode = action.payload;
    },

    setManualCommand(state, action: PayloadAction<string>) {
      state.manualCommand = action.payload;
    },

    /* VIDEO SETTINGS */
    setVideoEnabled(state, action: PayloadAction<boolean>) {
      state.video.enabled = action.payload;
    },

    setVideoCodec(state, action: PayloadAction<string>) {
      state.video.codec = action.payload;
    },

    setCRF(state, action: PayloadAction<number>) {
      state.video.crf = action.payload;
    },

    setVideoPreset(state, action: PayloadAction<string>) {
      state.video.preset = action.payload;
    },

    setVideoResolution(state, action: PayloadAction<string>) {
      state.video.resolution = action.payload;
    },

    setVideoFps(state, action: PayloadAction<number>) {
      state.video.fps = action.payload;
      state.video.frameRate = action.payload;
    },

    setVideoBitrate(state, action: PayloadAction<string>) {
      state.video.bitrate = action.payload;
    },

    /* AUDIO SETTINGS */
    setAudioEnabled(state, action: PayloadAction<boolean>) {
      state.audio.enabled = action.payload;
    },

    setAudioCodec(state, action: PayloadAction<string>) {
      state.audio.codec = action.payload;
    },

    setAudioBitrate(state, action: PayloadAction<string>) {
      state.audio.bitrate = action.payload;
    },

    setAudioChannels(state, action: PayloadAction<number>) {
      state.audio.channels = action.payload;
    },

    /* FILTERS */
    setGrayscale(state, action: PayloadAction<boolean>) {
      state.filters.grayscale = action.payload;
    },

    setBlur(state, action: PayloadAction<number>) {
      state.filters.blur = action.payload;
    },

    setSharpen(state, action: PayloadAction<number>) {
      state.filters.sharpen = action.payload;
    },

    setSaturation(state, action: PayloadAction<number>) {
      state.filters.saturation = action.payload;
    },

    /* TRANSFORMS */
    setRotate(state, action: PayloadAction<number>) {
      state.transforms.rotate = action.payload;
    },

    setFlipHorizontal(state, action: PayloadAction<boolean>) {
      state.transforms.flipHorizontal = action.payload;
    },

    setFlipVertical(state, action: PayloadAction<boolean>) {
      state.transforms.flipVertical = action.payload;
    },

    /* WATERMARK */
    setWatermarkFile(state, action: PayloadAction<string | null>) {
      state.watermark.filePath = action.payload;
    },

    setWatermarkPosition(state, action: PayloadAction<string>) {
      state.watermark.position = action.payload;
    },

    setWatermarkOpacity(state, action: PayloadAction<number>) {
      state.watermark.opacity = action.payload;
    },

    /* TEMPLATES */
    saveTemplate(state, action: PayloadAction<string>) {
      const name = action.payload;
      const { inputFiles, templates, ...templateData } = state;
      state.templates[name] = JSON.parse(JSON.stringify(templateData));

      if (typeof window !== "undefined") {
        localStorage.setItem("nightshift_templates", JSON.stringify(state.templates));
      }
    },

    loadTemplate(state, action: PayloadAction<string>) {
      const name = action.payload;
      const template = state.templates[name];
      if (template) {
        // Keep inputs and existing templates, overwrite the rest
        Object.assign(state, template);
      }
    },

    deleteTemplate(state, action: PayloadAction<string>) {
      const name = action.payload;
      delete state.templates[name];

      if (typeof window !== "undefined") {
        localStorage.setItem("nightshift_templates", JSON.stringify(state.templates));
      }
    },

    /* RESETS */
    resetInput(state) {
      state.inputFiles = [];
    },
    resetOutput(state) {
      state.outputName = "output";
      state.outputDir = "";
      state.format = "mp4";
    },
    resetVideo(state) {
      state.video = { ...DEFAULT_VIDEO };
    },
    resetAudio(state) {
      state.audio = { ...DEFAULT_AUDIO };
    },
    resetFilters(state) {
      state.filters = { ...DEFAULT_FILTERS };
    },
    resetTransforms(state) {
      state.transforms = { ...DEFAULT_TRANSFORMS };
    },
    resetWatermark(state) {
      state.watermark = { ...DEFAULT_WATERMARK };
    },
    resetAllPanels(state) {
      state.outputName = "output";
      state.outputDir = "";
      state.format = "mp4";
      state.commandMode = "auto";
      state.manualCommand = "";
      state.video = { ...DEFAULT_VIDEO };
      state.audio = { ...DEFAULT_AUDIO };
      state.filters = { ...DEFAULT_FILTERS };
      state.transforms = { ...DEFAULT_TRANSFORMS };
      state.watermark = { ...DEFAULT_WATERMARK };
      // Does not wipe inputs or templates
    },
  },
});

export const {
  addInputFiles,
  removeInputFile,
  removeAllInputFiles,
  setOutputDir,
  setOutputName,
  setFormat,
  setCommandMode,
  setManualCommand,
  setVideoEnabled,
  setVideoCodec,
  setCRF,
  setVideoPreset,
  setVideoResolution,
  setVideoFps,
  setVideoBitrate,
  setAudioEnabled,
  setAudioCodec,
  setAudioBitrate,
  setAudioChannels,
  setGrayscale,
  setBlur,
  setSharpen,
  setSaturation,
  setRotate,
  setFlipHorizontal,
  setFlipVertical,
  setWatermarkFile,
  setWatermarkPosition,
  setWatermarkOpacity,
  saveTemplate,
  loadTemplate,
  deleteTemplate,
  resetInput,
  resetOutput,
  resetVideo,
  resetAudio,
  resetFilters,
  resetTransforms,
  resetWatermark,
  resetAllPanels,
} = videoSlice.actions;

export default videoSlice.reducer;
