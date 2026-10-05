import { describe, it, expect } from "vitest";
import { generateVideoCommand } from "./commandBuilder";
import { DEFAULT_VIDEO_SETTINGS, VideoSettings } from "./types";

describe("commandBuilder golden tests", () => {
  it("Example 1: MP4 / H.264 defaults", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "mp4",
        collision: "suffix",
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "libx264",
        preset: "medium",
        crf: 23,
        webOptimized: true,
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        codec: "aac",
        bitrate: "128k",
        channels: 2,
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mov",
      output: "out.mp4",
    });

    expect(cmd).toEqual([
      "ffmpeg",
      "-n",
      "-i",
      "in.mov",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      "-sn",
      "-dn",
      "out.mp4",
    ]);
  });

  it("Example 2: WebM / VP9 at 720p", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "webm",
        collision: "suffix",
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "libvpx-vp9",
        crf: 31,
        cpuUsed: 1,
        resolutionHeight: 720,
        webOptimized: true,
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        codec: "libopus",
        bitrate: "128k",
        channels: 2,
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mov",
      output: "out.webm",
    });

    expect(cmd).toEqual([
      "ffmpeg",
      "-n",
      "-i",
      "in.mov",
      "-vf",
      "scale=-2:720",
      "-c:v",
      "libvpx-vp9",
      "-crf",
      "31",
      "-b:v",
      "0",
      "-cpu-used",
      "1",
      "-deadline",
      "good",
      "-row-mt",
      "1",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "libopus",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-sn",
      "-dn",
      "out.webm",
    ]);
  });

  it("Example 3: GIF", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "gif",
        collision: "suffix",
      },
      gif: {
        width: 480,
        fps: 15,
        loop: 0,
        dither: "bayer",
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mp4",
      output: "out.gif",
    });

    expect(cmd).toEqual([
      "ffmpeg",
      "-n",
      "-i",
      "in.mp4",
      "-vf",
      "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=bayer",
      "-an",
      "-loop",
      "0",
      "-sn",
      "-dn",
      "out.gif",
    ]);
  });

  it("Example 4: Scroll-driven video: trim + crop + 720p + all-intra + no audio", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "mp4",
        collision: "suffix",
      },
      trim: {
        enabled: true,
        start: "2",
        end: "8",
      },
      crop: {
        enabled: true,
        width: 1280,
        height: 720,
        x: null,
        y: null,
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "libx264",
        preset: "slow",
        crf: 20,
        resolutionHeight: 720,
        webOptimized: true,
        keyframe: {
          enabled: true,
          interval: 1,
        },
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        enabled: false,
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mp4",
      output: "out.mp4",
    });

    expect(cmd).toEqual([
      "ffmpeg",
      "-n",
      "-ss",
      "2",
      "-to",
      "8",
      "-i",
      "in.mp4",
      "-vf",
      "crop=1280:720,scale=-2:720",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-g",
      "1",
      "-keyint_min",
      "1",
      "-sc_threshold",
      "0",
      "-an",
      "-movflags",
      "+faststart",
      "-sn",
      "-dn",
      "out.mp4",
    ]);
  });

  it("Example 5: Watermark (bottom-right, 50%)", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "mp4",
        collision: "suffix",
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "libx264",
        preset: "medium",
        crf: 23,
        resolutionHeight: 720,
        webOptimized: true,
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        codec: "aac",
        bitrate: "128k",
        channels: 2,
      },
      watermark: {
        enabled: true,
        filePath: "logo.png",
        anchor: "br",
        margin: 10,
        opacity: 0.5,
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mp4",
      output: "out.mp4",
    });

    expect(cmd).toEqual([
      "ffmpeg",
      "-n",
      "-i",
      "in.mp4",
      "-i",
      "logo.png",
      "-filter_complex",
      "[1:v]format=rgba,colorchannelmixer=aa=0.5[wm];[0:v]scale=-2:720[base];[base][wm]overlay=W-w-10:H-h-10[vout]",
      "-map",
      "[vout]",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      "-sn",
      "-dn",
      "out.mp4",
    ]);
  });

  it("Example 6: Stream copy trim (no filters)", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "mp4",
        collision: "suffix",
      },
      trim: {
        enabled: true,
        start: "2",
        end: "8",
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "copy",
        webOptimized: true,
      },
      audio: {
        ...DEFAULT_VIDEO_SETTINGS.audio,
        codec: "copy",
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mp4",
      output: "out.mp4",
    });

    expect(cmd).toEqual([
      "ffmpeg",
      "-n",
      "-ss",
      "2",
      "-to",
      "8",
      "-i",
      "in.mp4",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-movflags",
      "+faststart",
      "-sn",
      "-dn",
      "out.mp4",
    ]);
  });

  it("Collision overwrite emits -y", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        collision: "overwrite",
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mp4",
      output: "out.mp4",
    });

    expect(cmd[1]).toBe("-y");
  });

  it("H.265 on MP4 emits -tag:v hvc1", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      output: {
        ...DEFAULT_VIDEO_SETTINGS.output,
        format: "mp4",
      },
      video: {
        ...DEFAULT_VIDEO_SETTINGS.video,
        codec: "libx265",
        webOptimized: true,
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mp4",
      output: "out.mp4",
    });

    expect(cmd).toContain("-tag:v");
    expect(cmd).toContain("hvc1");
  });

  it("Watermark opacity 1.0 omits colorchannelmixer", () => {
    const settings: VideoSettings = {
      ...DEFAULT_VIDEO_SETTINGS,
      watermark: {
        enabled: true,
        filePath: "logo.png",
        anchor: "tl",
        margin: 15,
        opacity: 1,
      },
    };

    const cmd = generateVideoCommand(settings, {
      input: "in.mp4",
      output: "out.mp4",
    });

    const filterComplexIdx = cmd.indexOf("-filter_complex");
    expect(filterComplexIdx).toBeGreaterThan(-1);
    const filterStr = cmd[filterComplexIdx + 1];
    expect(filterStr).not.toContain("colorchannelmixer");
    expect(filterStr).toContain("overlay=15:15");
  });
});
