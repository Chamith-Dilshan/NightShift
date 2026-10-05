export type Tool = "ffmpeg" | "ffprobe";

export interface JobSpec {
  tool: Tool;
  args: string[];
  outputPath?: string | null;
  outputExisted?: boolean;
  durationMs?: number | null;
}

export type JobEvent =
  | { kind: "started"; pid: number; commandLine: string }
  | { kind: "log"; stream: "stdout" | "stderr"; line: string }
  | {
      kind: "progress";
      outTimeMs: number;
      frame?: number | null;
      fps?: number | null;
      speed?: number | null;
      bitrateKbps?: number | null;
      sizeBytes?: number | null;
      percent?: number | null;
    }
  | {
      kind: "exit";
      code?: number | null;
      cancelled: boolean;
      durationMs: number;
      error?: string | null;
    };

export interface ToolStatus {
  tool: Tool;
  source: "managed" | "system" | "custom" | "missing";
  path?: string | null;
  version?: string | null;
}

export interface Capabilities {
  videoEncoders: string[];
  audioEncoders: string[];
}

export type InstallEvent =
  | { kind: "started"; totalBytes?: number | null }
  | { kind: "progress"; bytes: number; total?: number | null }
  | { kind: "verifying" }
  | { kind: "extracting" }
  | { kind: "done"; status: ToolStatus }
  | { kind: "error"; message: string };

export interface PathInfo {
  path: string;
  exists: boolean;
  isDir: boolean;
  isFile: boolean;
  sizeBytes?: number | null;
}

export interface ProbeFormat {
  filename?: string;
  nb_streams?: number;
  format_name?: string;
  format_long_name?: string;
  start_time?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
  probe_score?: number;
  tags?: Record<string, string>;
}

export interface ProbeStream {
  index: number;
  codec_name?: string;
  codec_long_name?: string;
  codec_type?: "video" | "audio" | "subtitle" | "data" | string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  duration?: string;
  bit_rate?: string;
  channels?: number;
  channel_layout?: string;
  pix_fmt?: string;
}

export interface ProbeResult {
  format?: ProbeFormat;
  streams?: ProbeStream[];
}

export interface Executor {
  runJob(jobId: string, spec: JobSpec, onEvent: (e: JobEvent) => void): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
  probe(path: string): Promise<ProbeResult>;
  checkPaths(paths: string[]): Promise<PathInfo[]>;
  tools: {
    status(): Promise<ToolStatus[]>;
    capabilities(): Promise<Capabilities>;
    install(tool: Tool, onEvent: (e: InstallEvent) => void): Promise<ToolStatus>;
    setCustomPath(tool: Tool, path: string): Promise<ToolStatus>;
  };
}
