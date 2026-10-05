import { VideoSettings, ProbeSummary } from "./types";
import { resolveVideoCodec, resolveAudioCodec } from "./codecRules";

export interface CommandIO {
  input: string;
  output: string;
  probe?: ProbeSummary;
}

export function generateVideoCommand(settings: VideoSettings, io: CommandIO): string[] {
  const args: string[] = ["ffmpeg"];

  // 1. Collision flag: exactly one of -n (suffix mode) or -y (overwrite mode)
  if (settings.output.collision === "overwrite") {
    args.push("-y");
  } else {
    args.push("-n");
  }

  // 2. Input options: trim before -i
  if (settings.trim.enabled) {
    args.push("-ss", settings.trim.start, "-to", settings.trim.end);
  }

  // 3. Main input file
  args.push("-i", io.input);

  // 4. Watermark input file
  const hasWatermark =
    settings.watermark.enabled && !!settings.watermark.filePath;
  if (hasWatermark && settings.watermark.filePath) {
    args.push("-i", settings.watermark.filePath);
  }

  const isGif = settings.output.format === "gif";
  const resolvedVideo = resolveVideoCodec(
    settings.output.format,
    settings.video.codec
  ).codec;

  // 5. Build filter chains
  const simpleFilters: string[] = [];

  // If copy mode, no filters allowed per V4
  if (resolvedVideo !== "copy") {
    // crop -> transpose (rotate) -> hflip -> vflip -> scale -> hue=s=0 -> eq -> gblur -> unsharp
    if (settings.crop.enabled) {
      if (settings.crop.x != null && settings.crop.y != null) {
        simpleFilters.push(
          `crop=${settings.crop.width}:${settings.crop.height}:${settings.crop.x}:${settings.crop.y}`
        );
      } else {
        simpleFilters.push(`crop=${settings.crop.width}:${settings.crop.height}`);
      }
    }

    if (settings.transforms.rotate === 90) {
      simpleFilters.push("transpose=1");
    } else if (settings.transforms.rotate === -90) {
      simpleFilters.push("transpose=2");
    } else if (settings.transforms.rotate === 180) {
      simpleFilters.push("transpose=1,transpose=1");
    }

    if (settings.transforms.flipHorizontal) {
      simpleFilters.push("hflip");
    }

    if (settings.transforms.flipVertical) {
      simpleFilters.push("vflip");
    }

    if (settings.video.resolutionHeight != null) {
      simpleFilters.push(`scale=-2:${settings.video.resolutionHeight}`);
    }

    if (settings.filters.grayscale) {
      simpleFilters.push("hue=s=0");
    }

    if (settings.filters.saturation !== 1) {
      simpleFilters.push(`eq=saturation=${settings.filters.saturation}`);
    }

    if (settings.filters.blur > 0) {
      simpleFilters.push(`gblur=sigma=${settings.filters.blur}`);
    }

    if (settings.filters.sharpen > 0) {
      simpleFilters.push(`unsharp=5:5:${settings.filters.sharpen}`);
    }
  }

  const gifTail = `fps=${settings.gif.fps},scale=${settings.gif.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=${settings.gif.dither}`;

  // 6. Assemble filter args and stream mapping
  if (hasWatermark) {
    const wmOpacity = settings.watermark.opacity;
    const wmChain =
      wmOpacity === 1
        ? "[1:v]"
        : `[1:v]format=rgba,colorchannelmixer=aa=${wmOpacity}[wm];`;

    const wmLabel = wmOpacity === 1 ? "[1:v]" : "[wm]";

    const simpleChainStr =
      simpleFilters.length > 0 ? simpleFilters.join(",") : "null";
    const baseGraph = `[0:v]${simpleChainStr}[base];`;

    const m = settings.watermark.margin;
    let overlayX = "W-w-m";
    let overlayY = "H-h-m";

    switch (settings.watermark.anchor) {
      case "tl":
        overlayX = `${m}`;
        overlayY = `${m}`;
        break;
      case "tc":
        overlayX = "(W-w)/2";
        overlayY = `${m}`;
        break;
      case "tr":
        overlayX = `W-w-${m}`;
        overlayY = `${m}`;
        break;
      case "ml":
        overlayX = `${m}`;
        overlayY = "(H-h)/2";
        break;
      case "mc":
        overlayX = "(W-w)/2";
        overlayY = "(H-h)/2";
        break;
      case "mr":
        overlayX = `W-w-${m}`;
        overlayY = "(H-h)/2";
        break;
      case "bl":
        overlayX = `${m}`;
        overlayY = `H-h-${m}`;
        break;
      case "bc":
        overlayX = "(W-w)/2";
        overlayY = `H-h-${m}`;
        break;
      case "br":
        overlayX = `W-w-${m}`;
        overlayY = `H-h-${m}`;
        break;
    }

    let filterComplex = "";
    if (wmOpacity === 1) {
      filterComplex = `${baseGraph}[base]${wmLabel}overlay=${overlayX}:${overlayY}`;
    } else {
      filterComplex = `${wmChain}${baseGraph}[base]${wmLabel}overlay=${overlayX}:${overlayY}`;
    }

    if (isGif) {
      filterComplex += `[vwm];[vwm]${gifTail}[vout]`;
    } else {
      filterComplex += "[vout]";
    }

    args.push("-filter_complex", filterComplex);
    args.push("-map", "[vout]");

    if (settings.audio.enabled && !isGif) {
      args.push("-map", "0:a:0?");
    }
  } else if (isGif) {
    if (simpleFilters.length > 0) {
      args.push("-vf", `${simpleFilters.join(",")},${gifTail}`);
    } else {
      args.push("-vf", gifTail);
    }
  } else if (simpleFilters.length > 0) {
    args.push("-vf", simpleFilters.join(","));
  }

  // 7. Video codec options
  if (!isGif) {
    if (!settings.video.enabled) {
      args.push("-vn");
    } else if (resolvedVideo === "copy") {
      args.push("-c:v", "copy");
    } else {
      args.push("-c:v", resolvedVideo);

      if (resolvedVideo === "libx264" || resolvedVideo === "libx265") {
        args.push("-preset", settings.video.preset);
      }

      if (settings.video.rateControl === "crf") {
        args.push("-crf", settings.video.crf.toString());
        if (
          resolvedVideo === "libvpx-vp9" ||
          resolvedVideo === "libaom-av1"
        ) {
          args.push("-b:v", "0");
        }
      } else {
        args.push("-b:v", settings.video.bitrate);
      }

      if (resolvedVideo === "libvpx-vp9") {
        args.push(
          "-cpu-used",
          settings.video.cpuUsed.toString(),
          "-deadline",
          "good",
          "-row-mt",
          "1"
        );
      } else if (resolvedVideo === "libaom-av1") {
        args.push(
          "-cpu-used",
          settings.video.cpuUsed.toString(),
          "-row-mt",
          "1"
        );
      }

      if (settings.video.webOptimized) {
        args.push("-pix_fmt", "yuv420p");
        if (
          resolvedVideo === "libx265" &&
          settings.output.format === "mp4"
        ) {
          args.push("-tag:v", "hvc1");
        }
      }

      if (settings.video.fps != null) {
        args.push("-r", settings.video.fps.toString());
      }

      if (settings.video.keyframe.enabled) {
        const interval = settings.video.keyframe.interval;
        if (resolvedVideo === "libx264") {
          args.push(
            "-g",
            interval.toString(),
            "-keyint_min",
            interval.toString(),
            "-sc_threshold",
            "0"
          );
        } else if (resolvedVideo === "libx265") {
          args.push(
            "-x265-params",
            `keyint=${interval}:min-keyint=${interval}:scenecut=0`
          );
        } else if (
          resolvedVideo === "libvpx-vp9" ||
          resolvedVideo === "libaom-av1"
        ) {
          args.push("-g", interval.toString(), "-keyint_min", interval.toString());
        }
      }
    }
  }

  // 8. Audio options
  if (isGif || !settings.audio.enabled) {
    args.push("-an");
  } else {
    const resolvedAudio = resolveAudioCodec(
      settings.output.format,
      settings.audio.codec
    ).codec;

    if (resolvedAudio === "copy") {
      args.push("-c:a", "copy");
    } else {
      args.push("-c:a", resolvedAudio);
      if (resolvedAudio !== "flac") {
        args.push("-b:a", settings.audio.bitrate);
      }
      args.push("-ac", settings.audio.channels.toString());
    }
  }

  // 9. Container flags
  if (settings.output.format === "mp4" && settings.video.webOptimized) {
    args.push("-movflags", "+faststart");
  } else if (isGif) {
    args.push("-loop", settings.gif.loop.toString());
  }

  // 10. Stream hygiene
  args.push("-sn", "-dn");

  // 11. Output path
  args.push(io.output);

  return args;
}
