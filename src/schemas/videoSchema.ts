interface VideoOptions {
  inputFile: File | null;
  outputName: string;
  outputDir: string;

  format: "mp4" | "webm" | "gif" | "custom";

  video: {
    enabled: boolean;
    codec: string;
    resolution: string;
    frameRate: number;
    bitrate: string;
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
