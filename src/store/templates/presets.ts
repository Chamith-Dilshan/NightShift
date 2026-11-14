import { NightShiftTemplate } from "@/core/template/schema";
import { DEFAULT_VIDEO_SETTINGS } from "../videoTool/types";

const BUILTIN_CREATED = "2024-01-15T00:00:00.000Z";

/**
 * Built-in presets migrated from v0.1 to NightShiftTemplate format.
 * These are read-only templates that ship with the app.
 */
export const BUILTIN_PRESETS: NightShiftTemplate[] = [
  {
    schemaVersion: 1,
    kind: "nightshift.template",
    id: "builtin_web_mp4",
    name: "Web MP4 (H.264, 1080p)",
    description: "Standard web-ready MP4 with H.264 video and AAC audio at 1080p.",
    tags: ["web", "mp4", "h264"],
    createdAt: BUILTIN_CREATED,
    updatedAt: BUILTIN_CREATED,
    requires: [{ tool: "ffmpeg", version: ">=5" }],
    graph: {
      nodes: [
        {
          id: "n1",
          tool: "ffmpeg",
          command: "transcode",
          mode: "params",
          params: {
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
          inputs: { in: { from: "$input" } },
          output: { namePattern: "{name}_web" },
        },
      ],
      edges: [],
    },
  },
  {
    schemaVersion: 1,
    kind: "nightshift.template",
    id: "builtin_web_webm",
    name: "Web WebM (VP9)",
    description: "Modern web format with VP9 video and Opus audio.",
    tags: ["web", "webm", "vp9"],
    createdAt: BUILTIN_CREATED,
    updatedAt: BUILTIN_CREATED,
    requires: [{ tool: "ffmpeg", version: ">=5" }],
    graph: {
      nodes: [
        {
          id: "n1",
          tool: "ffmpeg",
          command: "transcode",
          mode: "params",
          params: {
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
          inputs: { in: { from: "$input" } },
          output: { namePattern: "{name}_webm" },
        },
      ],
      edges: [],
    },
  },
  {
    schemaVersion: 1,
    kind: "nightshift.template",
    id: "builtin_scroll_scrub",
    name: "Scroll-scrub MP4 (all-intra, no audio)",
    description: "All-keyframe MP4 for smooth scrubbing, no audio, 720p.",
    tags: ["scrub", "mp4", "keyframe"],
    createdAt: BUILTIN_CREATED,
    updatedAt: BUILTIN_CREATED,
    requires: [{ tool: "ffmpeg", version: ">=5" }],
    graph: {
      nodes: [
        {
          id: "n1",
          tool: "ffmpeg",
          command: "transcode",
          mode: "params",
          params: {
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
          inputs: { in: { from: "$input" } },
          output: { namePattern: "{name}_scrub" },
        },
      ],
      edges: [],
    },
  },
  {
    schemaVersion: 1,
    kind: "nightshift.template",
    id: "builtin_small_gif",
    name: "Small GIF (480px, 15fps)",
    description: "Compact animated GIF at 480px wide, 15fps.",
    tags: ["gif", "small"],
    createdAt: BUILTIN_CREATED,
    updatedAt: BUILTIN_CREATED,
    requires: [{ tool: "ffmpeg", version: ">=5" }],
    graph: {
      nodes: [
        {
          id: "n1",
          tool: "ffmpeg",
          command: "transcode",
          mode: "params",
          params: {
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
          inputs: { in: { from: "$input" } },
          output: { namePattern: "{name}_gif" },
        },
      ],
      edges: [],
    },
  },
];
