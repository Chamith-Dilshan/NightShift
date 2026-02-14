import { VideoSliceType } from "./videoSlice";

export function generateVideoCommand(opts: VideoSliceType): string[] {
  if (!opts.inputFiles?.length) return [];

  const args: string[] = ["ffmpeg"];

  // Inputs
  for (const inputFile of opts.inputFiles) {
    args.push("-i", inputFile);
  }

  // ----------------------------
  // VIDEO SETTINGS
  // ----------------------------
  if (opts.video.enabled) {
    if (opts.video.codec) args.push("-c:v", opts.video.codec);
    if (opts.video.crf) args.push("-crf", String(opts.video.crf));
    if (opts.video.preset) args.push("-preset", opts.video.preset);

    if (opts.video.bitrate) args.push("-b:v", opts.video.bitrate);
    if (opts.video.frameRate) args.push("-r", String(opts.video.frameRate));
  } else {
    args.push("-vn");
  }

  // ----------------------------
  // AUDIO SETTINGS
  // ----------------------------
  if (opts.audio.enabled) {
    if (opts.audio.codec) args.push("-c:a", opts.audio.codec);
    if (opts.audio.bitrate) args.push("-b:a", opts.audio.bitrate);
    if (opts.audio.channels) args.push("-ac", String(opts.audio.channels));
  } else {
    args.push("-an");
  }

  // ----------------------------
  // BUILD FILTER CHAIN (ONE -vf)
  // ----------------------------
  const vfFilters: string[] = [];

  // Resolution scaling
  if (opts.video.resolution) {
    vfFilters.push(`scale=${opts.video.resolution}`);
  }

  // Filters
  if (opts.filters.grayscale) {
    vfFilters.push("hue=s=0");
  }

  if (opts.filters.blur > 0) {
    vfFilters.push(`gblur=sigma=${opts.filters.blur}`);
  }

  if (opts.filters.sharpen > 0) {
    vfFilters.push(`unsharp=5:5:${opts.filters.sharpen}`);
  }

  if (opts.filters.saturation !== 1) {
    vfFilters.push(`eq=saturation=${opts.filters.saturation}`);
  }

  // Transforms
  if (opts.transforms.rotate !== 0) {
    const transposeValue = opts.transforms.rotate / 90;
    vfFilters.push(`transpose=${transposeValue}`);
  }

  if (opts.transforms.flipHorizontal) {
    vfFilters.push("hflip");
  }

  if (opts.transforms.flipVertical) {
    vfFilters.push("vflip");
  }

  // Apply filters only once
  if (vfFilters.length > 0) {
    args.push("-vf", vfFilters.join(","));
  }

  // ----------------------------
  // WATERMARK (FILTER COMPLEX)
  // ----------------------------
  if (opts.watermark.filePath) {
    args.push("-i", opts.watermark.filePath);

    args.push(
      "-filter_complex",
      `overlay=${opts.watermark.position}:format=auto:alpha=${opts.watermark.opacity}`,
    );
  }

  // ----------------------------
  // OUTPUT FORMAT
  // ----------------------------
  const outputFile = `${opts.outputDir}/${opts.outputName}.${opts.format}`;
  args.push(outputFile);

  return args;
}
