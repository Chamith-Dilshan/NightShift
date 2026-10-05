import {
  Executor,
  JobSpec,
  JobEvent,
  Tool,
  ToolStatus,
  Capabilities,
  InstallEvent,
  PathInfo,
  ProbeResult,
} from "./types";

export class MockExecutor implements Executor {
  private activeJobs = new Set<string>();

  async runJob(jobId: string, spec: JobSpec, onEvent: (e: JobEvent) => void): Promise<void> {
    this.activeJobs.add(jobId);
    const pid = Math.floor(Math.random() * 10000) + 1000;
    const commandLine = `${spec.tool} ${spec.args.join(" ")}`;

    onEvent({
      kind: "started",
      pid,
      commandLine,
    });

    onEvent({
      kind: "log",
      stream: "stdout",
      line: `[Mock] Started simulated ${spec.tool} execution`,
    });

    const totalSteps = 10;
    const durationMs = spec.durationMs || 5000;
    const stepInterval = 100;

    for (let i = 1; i <= totalSteps; i++) {
      if (!this.activeJobs.has(jobId)) {
        onEvent({
          kind: "exit",
          code: null,
          cancelled: true,
          durationMs: i * stepInterval,
          error: null,
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, stepInterval));

      const percent = (i / totalSteps) * 100;
      const outTimeMs = (durationMs * i) / totalSteps;

      onEvent({
        kind: "progress",
        outTimeMs,
        frame: i * 30,
        fps: 30,
        speed: 1.0,
        bitrateKbps: 2500,
        sizeBytes: i * 100000,
        percent,
      });

      if (i % 3 === 0) {
        onEvent({
          kind: "log",
          stream: "stderr",
          line: `[Mock ffmpeg] encoding frame ${i * 30} at 30 fps, percent ${percent.toFixed(1)}%`,
        });
      }
    }

    this.activeJobs.delete(jobId);
    onEvent({
      kind: "exit",
      code: 0,
      cancelled: false,
      durationMs: totalSteps * stepInterval,
      error: null,
    });
  }

  async cancelJob(jobId: string): Promise<void> {
    this.activeJobs.delete(jobId);
  }

  async probe(path: string): Promise<ProbeResult> {
    return {
      format: {
        filename: path,
        nb_streams: 2,
        format_name: "mov,mp4,m4a,3gp,3g2,mj2",
        format_long_name: "QuickTime / MOV",
        duration: "10.000000",
        size: "5242880",
        bit_rate: "4194304",
      },
      streams: [
        {
          index: 0,
          codec_name: "h264",
          codec_long_name: "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",
          codec_type: "video",
          width: 1920,
          height: 1080,
          r_frame_rate: "30/1",
          avg_frame_rate: "30/1",
          duration: "10.000000",
          pix_fmt: "yuv420p",
        },
        {
          index: 1,
          codec_name: "aac",
          codec_long_name: "AAC (Advanced Audio Coding)",
          codec_type: "audio",
          channels: 2,
          channel_layout: "stereo",
          duration: "10.000000",
          bit_rate: "128000",
        },
      ],
    };
  }

  async checkPaths(paths: string[]): Promise<PathInfo[]> {
    return paths.map((path) => ({
      path,
      exists: true,
      isDir: false,
      isFile: true,
      sizeBytes: 1048576,
    }));
  }

  tools = {
    async status(): Promise<ToolStatus[]> {
      return [
        {
          tool: "ffmpeg",
          source: "system",
          path: "/usr/bin/ffmpeg",
          version: "ffmpeg version 7.1",
        },
        {
          tool: "ffprobe",
          source: "system",
          path: "/usr/bin/ffprobe",
          version: "ffprobe version 7.1",
        },
      ];
    },

    async capabilities(): Promise<Capabilities> {
      return {
        videoEncoders: ["libx264", "libx265", "libvpx-vp9", "libaom-av1"],
        audioEncoders: ["aac", "libmp3lame", "libopus", "flac"],
      };
    },

    async install(tool: Tool, onEvent: (e: InstallEvent) => void): Promise<ToolStatus> {
      onEvent({ kind: "started", totalBytes: 1000 });
      onEvent({ kind: "progress", bytes: 500, total: 1000 });
      onEvent({ kind: "verifying" });
      onEvent({ kind: "extracting" });
      const status: ToolStatus = {
        tool,
        source: "managed",
        path: `/mock/tools/${tool}/${tool}`,
        version: `${tool} version 7.1 (mock managed)`,
      };
      onEvent({ kind: "done", status });
      return status;
    },

    async setCustomPath(tool: Tool, path: string): Promise<ToolStatus> {
      return {
        tool,
        source: "custom",
        path,
        version: `${tool} version 7.1 (mock custom)`,
      };
    },
  };
}
