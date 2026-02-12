interface VideoSlice {
  inputFiles: string[];
  outputName: string;
  outputDir: string;

  format: "mp4" | "webm" | "gif" | "custom";
  commandMode: "auto" | "manual";
  manualCommand: string;

  video: {
    enabled: boolean;
    codec: string;
    crf: number;
    preset: string;
    resolution: string;
    frameRate: number;
    bitrate: string;
    fps: number;
  };

  audio: {
    enabled: boolean;
    codec: string;
    bitrate: string;
    channels: number;
  };

  filters: {
    grayscale: boolean;
    blur: number;
    sharpen: number;
    saturation: number;
  };

  transforms: {
    rotate: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
  };

  watermark: {
    file: File | null;
    position: string;
    opacity: number;
  };
}
