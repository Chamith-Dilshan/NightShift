export type VideoFormat = "mp4" | "webm" | "gif" | "custom";
export type VideoCodec = "libx264" | "libx265" | "libvpx-vp9" | "libaom-av1" | "copy";
export type AudioCodec = "aac" | "libmp3lame" | "libopus" | "flac" | "copy";
export type Preset =
  | "ultrafast"
  | "superfast"
  | "veryfast"
  | "faster"
  | "fast"
  | "medium"
  | "slow"
  | "slower"
  | "veryslow";

export type WatermarkAnchor =
  | "tl"
  | "tc"
  | "tr"
  | "ml"
  | "mc"
  | "mr"
  | "bl"
  | "bc"
  | "br";

export type GifDither = "bayer" | "sierra2_4a" | "none";

export interface VideoSettings {
  schemaVersion: 1;
  output: {
    dir: string | null;
    nameTemplate: string;
    format: VideoFormat;
    customExt: string;
    collision: "suffix" | "overwrite";
  };
  video: {
    enabled: boolean;
    codec: VideoCodec;
    rateControl: "crf" | "bitrate";
    crf: number;
    bitrate: string;
    preset: Preset;
    cpuUsed: number;
    resolutionHeight: number | null;
    fps: number | null;
    webOptimized: boolean;
    keyframe: { enabled: boolean; interval: number };
  };
  audio: {
    enabled: boolean;
    codec: AudioCodec;
    bitrate: string;
    channels: 1 | 2 | 6;
  };
  trim: { enabled: boolean; start: string; end: string };
  crop: {
    enabled: boolean;
    width: number;
    height: number;
    x: number | null;
    y: number | null;
  };
  filters: {
    grayscale: boolean;
    blur: number;
    sharpen: number;
    saturation: number;
  };
  transforms: {
    rotate: -90 | 0 | 90 | 180;
    flipHorizontal: boolean;
    flipVertical: boolean;
  };
  watermark: {
    enabled: boolean;
    filePath: string | null;
    anchor: WatermarkAnchor;
    margin: number;
    opacity: number;
  };
  gif: {
    width: number;
    fps: number;
    loop: number;
    dither: GifDither;
  };
}

export interface ProbeSummary {
  durationMs: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  hasAudio: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
}

export interface VideoSliceState {
  inputFiles: string[];
  probes: Record<string, ProbeSummary>;
  settings: VideoSettings;
  commandMode: "auto" | "manual";
  manualCommand: string;
}

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  schemaVersion: 1,
  output: {
    dir: null,
    nameTemplate: "{name}_nightshift",
    format: "mp4",
    customExt: "mp4",
    collision: "suffix",
  },
  video: {
    enabled: true,
    codec: "libx264",
    rateControl: "crf",
    crf: 23,
    bitrate: "4M",
    preset: "medium",
    cpuUsed: 1,
    resolutionHeight: null,
    fps: null,
    webOptimized: true,
    keyframe: { enabled: false, interval: 24 },
  },
  audio: {
    enabled: true,
    codec: "aac",
    bitrate: "128k",
    channels: 2,
  },
  trim: { enabled: false, start: "0", end: "0" },
  crop: { enabled: false, width: 1280, height: 720, x: null, y: null },
  filters: { grayscale: false, blur: 0, sharpen: 0, saturation: 1 },
  transforms: { rotate: 0, flipHorizontal: false, flipVertical: false },
  watermark: {
    enabled: false,
    filePath: null,
    anchor: "br",
    margin: 10,
    opacity: 1,
  },
  gif: { width: 480, fps: 15, loop: 0, dither: "bayer" },
};
