/**
 * @file commandBuilder.ts
 * @description Generates the FFmpeg command line arguments from the Redux state.
 * This file handles all the complex logic of mapping UI state into a valid
 * FFmpeg array of arguments, including handling codec constraints, complex filter
 * graphs (e.g., combining watermarks and GIF palette generation), and proper
 * flag application based on the selected output format.
 */

import { VideoSliceState } from "./videoSlice";

/**
 * Generates an array of FFmpeg arguments based on the user's selected options in the Redux store.
 * 
 * @param opts - The current VideoSliceState containing all user selections.
 * @returns {string[]} An array of command line arguments ready to be passed to a spawned FFmpeg process.
 */
export function generateVideoCommand(opts: VideoSliceState): string[] {
  if (!opts.inputFiles?.length) return [];

  const args: string[] = ["ffmpeg"];

  // ----------------------------
  // INPUT FILES
  // ----------------------------
  for (const inputFile of opts.inputFiles) {
    args.push("-i", inputFile);
  }

  // ----------------------------
  // VIDEO SETTINGS
  // ----------------------------
  if (opts.video.enabled) {
    if (opts.video.codec) {
      args.push("-c:v", opts.video.codec);
    }

    // Only use CRF if no bitrate override and codec supports it
    if (!opts.video.bitrate && opts.video.crf !== undefined) {
      args.push("-crf", String(opts.video.crf));
    }

    // Presets are generally only for x264/x265 encoding, skip for copy
    if (opts.video.preset && opts.video.codec !== "copy") {
      args.push("-preset", opts.video.preset);
    }

    if (opts.video.bitrate) {
      args.push("-b:v", opts.video.bitrate);
    }

    // FPS Override
    if (opts.video.fps && opts.video.fps > 0) {
      args.push("-r", String(opts.video.fps));
    }
  } else {
    args.push("-vn"); // Disable video globally
  }

  // ----------------------------
  // AUDIO SETTINGS
  // ----------------------------
  // GIFs cannot contain audio tracks. We explicitly force -an if the format is gif.
  if (opts.audio.enabled && opts.format !== "gif") {
    if (opts.audio.codec) {
      args.push("-c:a", opts.audio.codec);
    }
    if (opts.audio.bitrate && opts.audio.codec !== "copy") {
      args.push("-b:a", opts.audio.bitrate);
    }
    if (opts.audio.channels) {
      args.push("-ac", String(opts.audio.channels));
    }
  } else {
    args.push("-an"); // Disable audio
  }

  // ----------------------------
  // BUILD STANDARD FILTER CHAIN (-vf)
  // ----------------------------
  const vfFilters: string[] = [];

  // Resolution scaling (skip if undefined or set to the custom 'original' enum)
  if (opts.video.resolution && opts.video.resolution !== "original") {
    vfFilters.push(`scale=${opts.video.resolution}`);
  }

  // Grayscale mapping
  if (opts.filters.grayscale) {
    vfFilters.push("hue=s=0");
  }

  // Gaussian Blur
  if (opts.filters.blur > 0) {
    vfFilters.push(`gblur=sigma=${opts.filters.blur}`);
  }

  // Unsharp mask (Sharpening)
  if (opts.filters.sharpen > 0) {
    vfFilters.push(`unsharp=5:5:${opts.filters.sharpen}`);
  }

  // Color Saturation (only apply if value differs from the default 1.0 baseline)
  if (Math.abs(opts.filters.saturation - 1) > 0.05) {
    vfFilters.push(`eq=saturation=${opts.filters.saturation}`);
  }

  // Rotation via transpose
  if (opts.transforms.rotate === 90) {
    vfFilters.push("transpose=1");
  } else if (opts.transforms.rotate === -90) {
    vfFilters.push("transpose=2");
  } else if (opts.transforms.rotate === 180) {
    // 180 degree rotation requires two consecutive 90 degree transposes.
    vfFilters.push("transpose=2,transpose=2");
  }

  // Flips
  if (opts.transforms.flipHorizontal) vfFilters.push("hflip");
  if (opts.transforms.flipVertical) vfFilters.push("vflip");

  // ----------------------------
  // WATERMARK AND FILTER COMPLEX
  // ----------------------------
  // FFmpeg only allows EITHER -vf OR -filter_complex.
  // We must merge our basic `vfFilters` into the complex graph if a watermark is used.
  // Outputting high-quality GIFs also requires a complex graph (palettegen + paletteuse).

  if (opts.watermark.filePath) {
    // Load watermark image as 2nd input stream
    args.push("-i", opts.watermark.filePath);

    // Process opacity
    const alphaStr = opts.watermark.opacity < 1
      ? `,format=rgba,colorchannelmixer=aa=${opts.watermark.opacity}`
      : "";

    // Build the merged complex graph
    if (opts.format === "gif") {
      // 1. apply basic filters, 2. overlay watermark, 3. generate & apply GIF palette
      const preFilter = vfFilters.length > 0 ? `[0:v]${vfFilters.join(",")}[v0];[v0]` : `[0:v]`;
      args.push("-filter_complex", `${preFilter}[1:v]overlay=${opts.watermark.position}${alphaStr}[x];[x]split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
    } else {
      // Standard MP4/WebM watermark overlay
      const preFilter = vfFilters.length > 0 ? `[0:v]${vfFilters.join(",")}[v0];[v0]` : `[0:v]`;
      args.push("-filter_complex", `${preFilter}[1:v]overlay=${opts.watermark.position}${alphaStr}`);
    }
  } else {
    // No watermark scenario
    if (opts.format === "gif") {
      // Standalone high-quality GIF generation
      const preFilter = vfFilters.length > 0 ? `[0:v]${vfFilters.join(",")}[x];[x]` : `[0:v]`;
      args.push("-filter_complex", `${preFilter}split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
    } else if (vfFilters.length > 0) {
      // Standard -vf graph for basic video formatting without watermark
      args.push("-vf", vfFilters.join(","));
    }
  }

  // ----------------------------
  // OUTPUT
  // ----------------------------
  const ext = opts.format === "custom" ? "" : `.${opts.format}`;
  const outputDir = opts.outputDir
    ? `${opts.outputDir}/${opts.outputName}${ext}`
    : `${opts.outputName}${ext}`;
  args.push(outputDir);

  return args;
}
