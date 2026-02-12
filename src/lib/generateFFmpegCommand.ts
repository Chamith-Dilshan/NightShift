function generateFFmpegCommand(opts: VideoOptions): string[] {
  const args: string[] = [];

  if (!opts.inputFile) return [];

  args.push("ffmpeg", "-i", opts.inputFile.name);

  if (opts.video.enabled) {
    if (opts.video.codec) args.push("-c:v", opts.video.codec);
    if (opts.video.bitrate) args.push("-b:v", opts.video.bitrate);
    if (opts.video.frameRate) args.push("-r", `${opts.video.frameRate}`);
    if (opts.video.resolution)
      args.push("-vf", `scale=${opts.video.resolution}`);
  } else {
    args.push("-vn");
  }

  if (opts.audio.enabled) {
    if (opts.audio.codec) args.push("-c:a", opts.audio.codec);
    if (opts.audio.bitrate) args.push("-b:a", opts.audio.bitrate);
    if (opts.audio.channels) args.push("-ac", `${opts.audio.channels}`);
  } else {
    args.push("-an");
  }

  // Add filters
  const filterList: string[] = [];
  if (opts.filters.grayscale) filterList.push("hue=s=0");
  if (opts.filters.blur > 0)
    filterList.push(`gblur=sigma=${opts.filters.blur}`);
  if (opts.filters.saturation !== 1)
    filterList.push(`eq=saturation=${opts.filters.saturation}`);

  if (filterList.length > 0) {
    args.push("-vf", filterList.join(","));
  }

  // Transforms
  if (opts.transforms.rotate)
    args.push("-vf", `transpose=${opts.transforms.rotate / 90}`);

  // Watermark
  if (opts.watermark.file) {
    args.push(
      "-i",
      opts.watermark.file.name,
      "-filter_complex",
      `overlay=${opts.watermark.position}:format=auto,format=yuv420p`,
    );
  }

  args.push(`${opts.outputDir}/${opts.outputName}`);

  return args;
}
