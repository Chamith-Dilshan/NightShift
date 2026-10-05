import { VideoFormat, VideoCodec, AudioCodec } from "./types";

export interface ResolvedCodec<T> {
  codec: T;
  adjusted: boolean;
}

export function resolveVideoCodec(
  format: VideoFormat,
  selected: VideoCodec
): ResolvedCodec<VideoCodec> {
  if (format === "mp4") {
    if (selected === "libvpx-vp9") {
      return { codec: "libx264", adjusted: true };
    }
    return { codec: selected, adjusted: false };
  }

  if (format === "webm") {
    if (selected === "libx264" || selected === "libx265") {
      return { codec: "libvpx-vp9", adjusted: true };
    }
    return { codec: selected, adjusted: false };
  }

  return { codec: selected, adjusted: false };
}

export function resolveAudioCodec(
  format: VideoFormat,
  selected: AudioCodec
): ResolvedCodec<AudioCodec> {
  if (format === "mp4") {
    if (selected === "libopus" || selected === "flac") {
      return { codec: "aac", adjusted: true };
    }
    return { codec: selected, adjusted: false };
  }

  if (format === "webm") {
    if (selected === "aac" || selected === "libmp3lame" || selected === "flac") {
      return { codec: "libopus", adjusted: true };
    }
    return { codec: selected, adjusted: false };
  }

  return { codec: selected, adjusted: false };
}

export function getAllowedVideoCodecs(format: VideoFormat): VideoCodec[] {
  switch (format) {
    case "mp4":
      return ["libx264", "libx265", "libaom-av1", "copy"];
    case "webm":
      return ["libvpx-vp9", "libaom-av1", "copy"];
    case "gif":
      return [];
    case "custom":
      return ["libx264", "libx265", "libvpx-vp9", "libaom-av1", "copy"];
  }
}

export function getAllowedAudioCodecs(format: VideoFormat): AudioCodec[] {
  switch (format) {
    case "mp4":
      return ["aac", "libmp3lame", "copy"];
    case "webm":
      return ["libopus", "copy"];
    case "gif":
      return [];
    case "custom":
      return ["aac", "libmp3lame", "libopus", "flac", "copy"];
  }
}
