import { VideoTemplate } from "./types";
import { DEFAULT_VIDEO_SETTINGS } from "../videoTool/types";

export const BUILTIN_PRESETS: VideoTemplate[] = [
  {
    id: "builtin_web_mp4",
    name: "Web MP4 (H.264, 1080p)",
    createdAt: 1700000000000,
    schemaVersion: 1,
    isBuiltIn: true,
    settings: {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "mp4",
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "libx264",
        crf: 23,
        preset: "medium",
        resolutionHeight: 1080,
        webOptimized: true,
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        enabled: true,
        codec: "aac",
        bitrate: "128k",
      },
    },
  },
  {
    id: "builtin_web_webm",
    name: "Web WebM (VP9)",
    createdAt: 1700000000000,
    schemaVersion: 1,
    isBuiltIn: true,
    settings: {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "webm",
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "libvpx-vp9",
        crf: 31,
        cpuUsed: 1,
        webOptimized: true,
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        enabled: true,
        codec: "libopus",
        bitrate: "128k",
      },
    },
  },
  {
    id: "builtin_scroll_scrub",
    name: "Scroll-scrub MP4 (all-intra, no audio)",
    createdAt: 1700000000000,
    schemaVersion: 1,
    isBuiltIn: true,
    settings: {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "mp4",
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "libx264",
        crf: 20,
        preset: "slow",
        resolutionHeight: 720,
        webOptimized: true,
        keyframe: { enabled: true, interval: 1 },
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        enabled: false,
      },
    },
  },
  {
    id: "builtin_small_gif",
    name: "Small GIF (480px, 15fps)",
    createdAt: 1700000000000,
    schemaVersion: 1,
    isBuiltIn: true,
    settings: {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "gif",
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        enabled: false,
      },
      gif: {
        width: 480,
        fps: 15,
        loop: 0,
        dither: "bayer",
      },
    },
  },
];
