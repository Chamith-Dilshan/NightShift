import { z } from "zod";
import {
  VideoSliceState,
  ProbeSummary,
} from "./types";
import { Capabilities, ToolStatus } from "@/lib/executor/types";
import { planOutputs } from "./outputPlanner";
import { resolveVideoCodec } from "./codecRules";
import { parseCommand } from "./commandParser";

export const VideoSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  output: z.object({
    dir: z.string().nullable(),
    nameTemplate: z.string(),
    format: z.enum(["mp4", "webm", "gif", "custom"]),
    customExt: z.string(),
    collision: z.enum(["suffix", "overwrite"]),
  }),
  video: z.object({
    enabled: z.boolean(),
    codec: z.enum(["libx264", "libx265", "libvpx-vp9", "libaom-av1", "copy"]),
    rateControl: z.enum(["crf", "bitrate"]),
    crf: z.number(),
    bitrate: z.string(),
    preset: z.enum([
      "ultrafast",
      "superfast",
      "veryfast",
      "faster",
      "fast",
      "medium",
      "slow",
      "slower",
      "veryslow",
    ]),
    cpuUsed: z.number(),
    resolutionHeight: z.number().nullable(),
    fps: z.number().nullable(),
    webOptimized: z.boolean(),
    keyframe: z.object({
      enabled: z.boolean(),
      interval: z.number(),
    }),
  }),
  audio: z.object({
    enabled: z.boolean(),
    codec: z.enum(["aac", "libmp3lame", "libopus", "flac", "copy"]),
    bitrate: z.string(),
    channels: z.union([z.literal(1), z.literal(2), z.literal(6)]),
  }),
  trim: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }),
  crop: z.object({
    enabled: z.boolean(),
    width: z.number(),
    height: z.number(),
    x: z.number().nullable(),
    y: z.number().nullable(),
  }),
  filters: z.object({
    grayscale: z.boolean(),
    blur: z.number(),
    sharpen: z.number(),
    saturation: z.number(),
  }),
  transforms: z.object({
    rotate: z.union([
      z.literal(-90),
      z.literal(0),
      z.literal(90),
      z.literal(180),
    ]),
    flipHorizontal: z.boolean(),
    flipVertical: z.boolean(),
  }),
  watermark: z.object({
    enabled: z.boolean(),
    filePath: z.string().nullable(),
    anchor: z.enum([
      "tl",
      "tc",
      "tr",
      "ml",
      "mc",
      "mr",
      "bl",
      "bc",
      "br",
    ]),
    margin: z.number(),
    opacity: z.number(),
  }),
  gif: z.object({
    width: z.number(),
    fps: z.number(),
    loop: z.number(),
    dither: z.enum(["bayer", "sierra2_4a", "none"]),
  }),
});

export interface Issue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationContext {
  probes?: Record<string, ProbeSummary>;
  capabilities?: Capabilities;
  toolStatus?: ToolStatus[];
}

export function parseTimeSeconds(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length === 2) {
      const min = parseFloat(parts[0]);
      const sec = parseFloat(parts[1]);
      if (isNaN(min) || isNaN(sec)) return null;
      return min * 60 + sec;
    }
    if (parts.length === 3) {
      const hr = parseFloat(parts[0]);
      const min = parseFloat(parts[1]);
      const sec = parseFloat(parts[2]);
      if (isNaN(hr) || isNaN(min) || isNaN(sec)) return null;
      return hr * 3600 + min * 60 + sec;
    }
    return null;
  }

  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

export function validateVideo(
  state: VideoSliceState,
  ctx?: ValidationContext
): Issue[] {
  const issues: Issue[] = [];
  const settings = state.settings;

  // V15: FFmpeg/ffprobe not installed
  if (ctx?.toolStatus) {
    const ffmpegStatus = ctx.toolStatus.find((t) => t.tool === "ffmpeg");
    const ffprobeStatus = ctx.toolStatus.find((t) => t.tool === "ffprobe");
    if (!ffmpegStatus || ffmpegStatus.source === "missing") {
      issues.push({
        path: "tools.ffmpeg",
        message: "FFmpeg is not installed or detected on your system.",
        severity: "error",
      });
    }
    if (!ffprobeStatus || ffprobeStatus.source === "missing") {
      issues.push({
        path: "tools.ffprobe",
        message: "FFprobe is not installed or detected on your system.",
        severity: "error",
      });
    }
  }

  // Manual Mode validation (V16)
  if (state.commandMode === "manual") {
    const trimmed = state.manualCommand.trim();
    if (!trimmed) {
      issues.push({
        path: "manualCommand",
        message: "Manual command cannot be empty.",
        severity: "error",
      });
    } else {
      const tokens = parseCommand(trimmed);
      const firstToken = tokens[0]?.toLowerCase();
      if (firstToken !== "ffmpeg" && firstToken !== "ffprobe") {
        issues.push({
          path: "manualCommand",
          message: "Manual command must start with 'ffmpeg' or 'ffprobe'.",
          severity: "error",
        });
      }
    }
    return issues;
  }

  // V1: Auto mode requires >= 1 input file
  if (!state.inputFiles || state.inputFiles.length === 0) {
    issues.push({
      path: "inputFiles",
      message: "Please add at least one input file to process.",
      severity: "error",
    });
  }

  // V2: Output name template validation
  const template = settings.output.nameTemplate || "";
  const invalidChars = /[<>:"/\\|?*]/;
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

  if (invalidChars.test(template)) {
    issues.push({
      path: "output.nameTemplate",
      message: 'Output name template cannot contain path separators or invalid characters (<>:"/\\|?*).',
      severity: "error",
    });
  }
  if (/[. ]$/.test(template)) {
    issues.push({
      path: "output.nameTemplate",
      message: "Output name template cannot end with a period or space.",
      severity: "error",
    });
  }
  if (reservedNames.test(template.replace(/\{name\}/g, ""))) {
    issues.push({
      path: "output.nameTemplate",
      message: "Output name template uses a reserved system filename.",
      severity: "error",
    });
  }

  // V17: Template placeholder {name} missing with > 1 inputs
  if (state.inputFiles.length > 1 && !template.includes("{name}")) {
    issues.push({
      path: "output.nameTemplate",
      message: "Template does not contain '{name}'. Sequential suffixes (_1, _2...) will be automatically appended.",
      severity: "warning",
    });
  }

  // V3: Resolved output path must not equal any input path
  if (state.inputFiles.length > 0) {
    const planned = planOutputs(settings, state.inputFiles, new Set());
    const inputSet = new Set(state.inputFiles.map((p) => p.toLowerCase()));
    for (const p of planned) {
      if (inputSet.has(p.output.toLowerCase())) {
        issues.push({
          path: "output.dir",
          message: `Output path '${p.output}' conflicts directly with an input source file.`,
          severity: "error",
        });
        break;
      }
    }
  }

  const resolvedVideo = resolveVideoCodec(
    settings.output.format,
    settings.video.codec
  ).codec;

  // V4: 'copy' video codec cannot combine with scale, fps, filters, transforms, crop, watermark, or GIF
  if (resolvedVideo === "copy") {
    const hasFilters =
      settings.video.resolutionHeight != null ||
      settings.video.fps != null ||
      settings.crop.enabled ||
      settings.transforms.rotate !== 0 ||
      settings.transforms.flipHorizontal ||
      settings.transforms.flipVertical ||
      settings.filters.grayscale ||
      settings.filters.saturation !== 1 ||
      settings.filters.blur > 0 ||
      settings.filters.sharpen > 0 ||
      (settings.watermark.enabled && !!settings.watermark.filePath) ||
      settings.output.format === "gif";

    if (hasFilters) {
      issues.push({
        path: "video.codec",
        message: "Stream copy ('copy') cannot be used together with filters, cropping, scaling, transforms, watermark, or GIF conversion.",
        severity: "error",
      });
    }
  }

  // V5: CRF range
  if (settings.video.enabled && settings.video.rateControl === "crf") {
    if (resolvedVideo === "libx264" || resolvedVideo === "libx265") {
      if (settings.video.crf < 0 || settings.video.crf > 51) {
        issues.push({
          path: "video.crf",
          message: "CRF value for H.264 / H.265 must be between 0 and 51.",
          severity: "error",
        });
      }
    } else if (
      resolvedVideo === "libvpx-vp9" ||
      resolvedVideo === "libaom-av1"
    ) {
      if (settings.video.crf < 0 || settings.video.crf > 63) {
        issues.push({
          path: "video.crf",
          message: "CRF value for VP9 / AV1 must be between 0 and 63.",
          severity: "error",
        });
      }
    }
  }

  // V6: FPS range
  if (settings.output.format === "gif") {
    if (settings.gif.fps < 1 || settings.gif.fps > 50) {
      issues.push({
        path: "gif.fps",
        message: "GIF frame rate must be between 1 and 50 FPS.",
        severity: "error",
      });
    }
  } else if (settings.video.fps != null) {
    if (settings.video.fps < 1 || settings.video.fps > 240) {
      issues.push({
        path: "video.fps",
        message: "Video frame rate must be between 1 and 240 FPS.",
        severity: "error",
      });
    }
  }

  // V7 & V8: Trim validation
  if (settings.trim.enabled) {
    if (state.inputFiles.length > 1) {
      issues.push({
        path: "trim",
        message: "Trim can only be applied when processing a single input file.",
        severity: "error",
      });
    }

    const startSec = parseTimeSeconds(settings.trim.start);
    const endSec = parseTimeSeconds(settings.trim.end);

    if (startSec == null || startSec < 0) {
      issues.push({
        path: "trim.start",
        message: "Trim start time must be a non-negative number or valid time (HH:MM:SS).",
        severity: "error",
      });
    }

    if (endSec == null || (startSec != null && endSec <= startSec)) {
      issues.push({
        path: "trim.end",
        message: "Trim end time must be greater than start time.",
        severity: "error",
      });
    }

    // V8: Check against probe duration
    if (state.inputFiles.length === 1 && endSec != null) {
      const probe = (ctx?.probes || state.probes)[state.inputFiles[0]];
      if (probe?.durationMs != null) {
        const durationSec = probe.durationMs / 1000;
        if (endSec > durationSec) {
          issues.push({
            path: "trim.end",
            message: `Trim end time (${endSec}s) extends beyond the media duration (${durationSec.toFixed(1)}s).`,
            severity: "warning",
          });
        }
      }
    }
  }

  // V9 & V10: Crop validation
  if (settings.crop.enabled) {
    if (settings.crop.width < 2 || settings.crop.height < 2) {
      issues.push({
        path: "crop",
        message: "Crop width and height must each be at least 2 pixels.",
        severity: "error",
      });
    }

    if (
      (settings.crop.x != null && settings.crop.x < 0) ||
      (settings.crop.y != null && settings.crop.y < 0)
    ) {
      issues.push({
        path: "crop",
        message: "Crop coordinates (X and Y) cannot be negative.",
        severity: "error",
      });
    }

    if (state.inputFiles.length === 1) {
      const probe = (ctx?.probes || state.probes)[state.inputFiles[0]];
      if (probe?.width && probe?.height) {
        const x = settings.crop.x ?? Math.floor((probe.width - settings.crop.width) / 2);
        const y = settings.crop.y ?? Math.floor((probe.height - settings.crop.height) / 2);

        if (x + settings.crop.width > probe.width || y + settings.crop.height > probe.height) {
          issues.push({
            path: "crop",
            message: `Crop area (${settings.crop.width}x${settings.crop.height} at ${x},${y}) exceeds source resolution (${probe.width}x${probe.height}).`,
            severity: "error",
          });
        }
      }
    }

    if (
      settings.video.webOptimized &&
      (settings.crop.width % 2 !== 0 || settings.crop.height % 2 !== 0)
    ) {
      issues.push({
        path: "crop",
        message: "Odd crop dimensions may fail or cause chroma artifacts with yuv420p pixel format.",
        severity: "warning",
      });
    }
  }

  // V11: Watermark validation
  if (settings.watermark.enabled) {
    if (!settings.watermark.filePath) {
      issues.push({
        path: "watermark.filePath",
        message: "Please select an image file for the watermark overlay.",
        severity: "error",
      });
    }
    if (settings.watermark.opacity <= 0 || settings.watermark.opacity > 1) {
      issues.push({
        path: "watermark.opacity",
        message: "Watermark opacity must be greater than 0 and at most 1.",
        severity: "error",
      });
    }
  }

  // V12: Keyframe interval
  if (settings.video.keyframe.enabled) {
    if (
      settings.video.keyframe.interval < 1 ||
      settings.video.keyframe.interval > 1000
    ) {
      issues.push({
        path: "video.keyframe.interval",
        message: "Keyframe interval must be between 1 and 1000 frames.",
        severity: "error",
      });
    }
  }

  // V13: GIF width
  if (settings.output.format === "gif") {
    if (settings.gif.width < 16 || settings.gif.width > 4096) {
      issues.push({
        path: "gif.width",
        message: "GIF width must be between 16 and 4096 pixels.",
        severity: "error",
      });
    }
  }

  // V14: Encoder missing from FFmpeg build
  if (ctx?.capabilities && settings.output.format !== "gif") {
    if (
      settings.video.enabled &&
      resolvedVideo !== "copy" &&
      !ctx.capabilities.videoEncoders.includes(resolvedVideo)
    ) {
      issues.push({
        path: "video.codec",
        message: `Encoder '${resolvedVideo}' is not available in your current FFmpeg build.`,
        severity: "error",
      });
    }
  }

  return issues;
}
