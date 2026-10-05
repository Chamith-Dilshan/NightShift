import { VideoTemplate } from "./types";
import { DEFAULT_VIDEO_SETTINGS, VideoSettings, WatermarkAnchor } from "../videoTool/types";

export function migrateRawTemplate(raw: unknown): VideoTemplate | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name : "Imported Preset";
  const id = typeof obj.id === "string" ? obj.id : `template_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = typeof obj.createdAt === "number" ? obj.createdAt : Date.now();

  // If already v1 with nested settings
  if (obj.schemaVersion === 1 && obj.settings && typeof obj.settings === "object") {
    const s = obj.settings as Partial<VideoSettings>;
    return {
      id,
      name,
      createdAt,
      schemaVersion: 1,
      isBuiltIn: Boolean(obj.isBuiltIn),
      settings: {
        ...DEFAULT_VIDEO_SETTINGS,
        ...s,
        output: { ...DEFAULT_VIDEO_SETTINGS.output, ...(s.output || {}) },
        video: { ...DEFAULT_VIDEO_SETTINGS.video, ...(s.video || {}) },
        audio: { ...DEFAULT_VIDEO_SETTINGS.audio, ...(s.audio || {}) },
        trim: { ...DEFAULT_VIDEO_SETTINGS.trim, ...(s.trim || {}) },
        crop: { ...DEFAULT_VIDEO_SETTINGS.crop, ...(s.crop || {}) },
        filters: { ...DEFAULT_VIDEO_SETTINGS.filters, ...(s.filters || {}) },
        transforms: { ...DEFAULT_VIDEO_SETTINGS.transforms, ...(s.transforms || {}) },
        watermark: { ...DEFAULT_VIDEO_SETTINGS.watermark, ...(s.watermark || {}) },
        gif: { ...DEFAULT_VIDEO_SETTINGS.gif, ...(s.gif || {}) },
      },
    };
  }

  // Legacy flat format (v0)
  const legacyVideo = (obj.video as Record<string, unknown>) || {};
  const legacyAudio = (obj.audio as Record<string, unknown>) || {};
  const legacyFilters = (obj.filters as Record<string, unknown>) || {};
  const legacyTransforms = (obj.transforms as Record<string, unknown>) || {};
  const legacyWatermark = (obj.watermark as Record<string, unknown>) || {};

  // Convert resolution: "1920:1080" or "original" -> resolutionHeight: 1080 / null
  let resolutionHeight: number | null = null;
  if (typeof legacyVideo.resolution === "string") {
    if (legacyVideo.resolution === "original") {
      resolutionHeight = null;
    } else if (legacyVideo.resolution.includes(":")) {
      const parts = legacyVideo.resolution.split(":");
      const h = parseInt(parts[1], 10);
      resolutionHeight = isNaN(h) ? null : h;
    }
  }

  // Convert fps / frameRate
  let fps: number | null = null;
  if (typeof legacyVideo.fps === "number") {
    fps = legacyVideo.fps;
  } else if (typeof legacyVideo.frameRate === "number") {
    fps = legacyVideo.frameRate;
  }

  // Watermark position to anchor
  let anchor: WatermarkAnchor = "br";
  if (typeof legacyWatermark.position === "string") {
    const pos = legacyWatermark.position.toLowerCase();
    if (pos.includes("w-w") && pos.includes("h-h")) anchor = "br";
    else if (pos.includes("w-w") && pos.includes("(h-h)/2")) anchor = "mr";
    else if (pos.includes("w-w")) anchor = "tr";
    else if (pos.includes("(w-w)/2") && pos.includes("h-h")) anchor = "bc";
    else if (pos.includes("(w-w)/2") && pos.includes("(h-h)/2")) anchor = "mc";
    else if (pos.includes("(w-w)/2")) anchor = "tc";
    else if (pos.includes("h-h")) anchor = "bl";
    else if (pos.includes("(h-h)/2")) anchor = "ml";
    else anchor = "tl";
  }

  const migratedSettings: VideoSettings = {
    ...DEFAULT_VIDEO_SETTINGS,
    output: {
      dir: typeof obj.outputDir === "string" ? obj.outputDir : null,
      nameTemplate: typeof obj.outputName === "string" ? obj.outputName : "{name}_nightshift",
      format: (obj.format as VideoSettings["output"]["format"]) || "mp4",
      customExt: "mp4",
      collision: "suffix",
    },
    video: {
      ...DEFAULT_VIDEO_SETTINGS.video,
      enabled: legacyVideo.enabled !== false,
      codec: (legacyVideo.codec as VideoSettings["video"]["codec"]) || "libx264",
      crf: typeof legacyVideo.crf === "number" ? legacyVideo.crf : 23,
      preset: (legacyVideo.preset as VideoSettings["video"]["preset"]) || "medium",
      resolutionHeight,
      fps,
    },
    audio: {
      ...DEFAULT_VIDEO_SETTINGS.audio,
      enabled: legacyAudio.enabled !== false,
      codec: (legacyAudio.codec as VideoSettings["audio"]["codec"]) || "aac",
      bitrate: typeof legacyAudio.bitrate === "string" ? legacyAudio.bitrate : "128k",
      channels: legacyAudio.channels === 1 ? 1 : legacyAudio.channels === 6 ? 6 : 2,
    },
    filters: {
      grayscale: Boolean(legacyFilters.grayscale),
      blur: typeof legacyFilters.blur === "number" ? legacyFilters.blur : 0,
      sharpen: typeof legacyFilters.sharpen === "number" ? legacyFilters.sharpen : 0,
      saturation: typeof legacyFilters.saturation === "number" ? legacyFilters.saturation : 1,
    },
    transforms: {
      rotate: legacyTransforms.rotate === 90 ? 90 : legacyTransforms.rotate === -90 ? -90 : legacyTransforms.rotate === 180 ? 180 : 0,
      flipHorizontal: Boolean(legacyTransforms.flipHorizontal),
      flipVertical: Boolean(legacyTransforms.flipVertical),
    },
    watermark: {
      enabled: Boolean(legacyWatermark.filePath),
      filePath: typeof legacyWatermark.filePath === "string" ? legacyWatermark.filePath : null,
      anchor,
      margin: 10,
      opacity: typeof legacyWatermark.opacity === "number" ? legacyWatermark.opacity : 1,
    },
  };

  return {
    id,
    name,
    createdAt,
    schemaVersion: 1,
    settings: migratedSettings,
  };
}
