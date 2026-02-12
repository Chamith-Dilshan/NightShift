import { z } from "zod";

export const videoSchema = z.object({
  inputFiles: z.array(z.string()).min(1, "Select at least one file"),

  outputName: z.string().min(1),
  outputDir: z.string().min(1),

  format: z.enum(["mp4", "webm", "gif", "custom"]),

  commandMode: z.enum(["auto", "manual"]),
  manualCommand: z.string(),

  video: z.object({
    enabled: z.boolean(),
    codec: z.string(),
    crf: z.number().min(0).max(51),
    preset: z.string(),
    resolution: z.string(),
    frameRate: z.number().min(1).max(240),
    bitrate: z.string(),
    fps: z.number(),
  }),

  audio: z.object({
    enabled: z.boolean(),
    codec: z.string(),
    bitrate: z.string(),
    channels: z.number().min(1).max(8),
  }),

  filters: z.object({
    grayscale: z.boolean(),
    blur: z.number().min(0).max(20),
    sharpen: z.number().min(0).max(10),
    saturation: z.number().min(0).max(3),
  }),

  transforms: z.object({
    rotate: z.number().multipleOf(90),
    flipHorizontal: z.boolean(),
    flipVertical: z.boolean(),
  }),

  watermark: z.object({
    file: z.any().nullable(),
    position: z.string(),
    opacity: z.number().min(0).max(1),
  }),
});

export type VideoSliceType = z.infer<typeof videoSchema>;
