import { describe, it, expect } from "vitest";
import { validateVideo, parseTimeSeconds } from "./videoSchema";
import { DEFAULT_VIDEO_SETTINGS, VideoSliceState } from "./types";

describe("videoSchema and validateVideo", () => {
  const baseState: VideoSliceState = {
    inputFiles: ["C:\\Videos\\sample.mp4"],
    probes: {
      "C:\\Videos\\sample.mp4": {
        durationMs: 10000,
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
        videoCodec: "h264",
        audioCodec: "aac",
      },
    },
    settings: DEFAULT_VIDEO_SETTINGS,
    commandMode: "auto",
    manualCommand: "",
  };

  it("V1: Auto mode requires >= 1 input file", () => {
    const state: VideoSliceState = {
      ...baseState,
      inputFiles: [],
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "inputFiles" && i.severity === "error")).toBe(true);
  });

  it("V2: Invalid template characters produce error", () => {
    const state: VideoSliceState = {
      ...baseState,
      settings: {
        ...baseState.settings,
        output: {
          ...baseState.settings.output,
          nameTemplate: "invalid/name*template",
        },
      },
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "output.nameTemplate" && i.severity === "error")).toBe(true);
  });

  it("V3: Resolved output path cannot equal input path", () => {
    const state: VideoSliceState = {
      ...baseState,
      settings: {
        ...baseState.settings,
        output: {
          ...baseState.settings.output,
          nameTemplate: "{name}",
          format: "mp4",
          collision: "overwrite",
        },
      },
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "output.dir" && i.severity === "error")).toBe(true);
  });

  it("V4: Copy video codec cannot combine with filters", () => {
    const state: VideoSliceState = {
      ...baseState,
      settings: {
        ...baseState.settings,
        video: {
          ...baseState.settings.video,
          codec: "copy",
        },
        filters: {
          ...baseState.settings.filters,
          grayscale: true,
        },
      },
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "video.codec" && i.severity === "error")).toBe(true);
  });

  it("V5: CRF bounds checking", () => {
    const state: VideoSliceState = {
      ...baseState,
      settings: {
        ...baseState.settings,
        video: {
          ...baseState.settings.video,
          codec: "libx264",
          rateControl: "crf",
          crf: 55,
        },
      },
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "video.crf" && i.severity === "error")).toBe(true);
  });

  it("V7: Trim start >= 0 and end > start", () => {
    const state: VideoSliceState = {
      ...baseState,
      settings: {
        ...baseState.settings,
        trim: {
          enabled: true,
          start: "10",
          end: "5",
        },
      },
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "trim.end" && i.severity === "error")).toBe(true);
  });

  it("V8: Trim end beyond probed duration produces warning", () => {
    const state: VideoSliceState = {
      ...baseState,
      settings: {
        ...baseState.settings,
        trim: {
          enabled: true,
          start: "0",
          end: "15",
        },
      },
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "trim.end" && i.severity === "warning")).toBe(true);
  });

  it("V11: Watermark without filePath produces error", () => {
    const state: VideoSliceState = {
      ...baseState,
      settings: {
        ...baseState.settings,
        watermark: {
          ...baseState.settings.watermark,
          enabled: true,
          filePath: null,
        },
      },
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "watermark.filePath" && i.severity === "error")).toBe(true);
  });

  it("V16: Manual mode non-ffmpeg token produces error", () => {
    const state: VideoSliceState = {
      ...baseState,
      commandMode: "manual",
      manualCommand: "curl http://example.com",
    };
    const issues = validateVideo(state);
    expect(issues.some((i) => i.path === "manualCommand" && i.severity === "error")).toBe(true);
  });

  it("parseTimeSeconds helper handles numeric and HH:MM:SS", () => {
    expect(parseTimeSeconds("15.5")).toBe(15.5);
    expect(parseTimeSeconds("01:30")).toBe(90);
    expect(parseTimeSeconds("01:02:03.500")).toBe(3723.5);
    expect(parseTimeSeconds("invalid")).toBeNull();
  });
});
