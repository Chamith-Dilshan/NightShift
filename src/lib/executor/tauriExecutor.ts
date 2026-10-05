import { invoke, Channel } from "@tauri-apps/api/core";
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

export class TauriExecutor implements Executor {
  async runJob(jobId: string, spec: JobSpec, onEvent: (e: JobEvent) => void): Promise<void> {
    const channel = new Channel<JobEvent>();
    let exitPromiseResolve: () => void;
    const exitPromise = new Promise<void>((resolve) => {
      exitPromiseResolve = resolve;
    });

    channel.onmessage = (event: JobEvent) => {
      onEvent(event);
      if (event.kind === "exit") {
        exitPromiseResolve();
      }
    };

    try {
      await invoke("run_job", {
        jobId,
        spec,
        onEvent: channel,
      });
    } catch (err) {
      onEvent({
        kind: "exit",
        code: 1,
        cancelled: false,
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    await exitPromise;
  }

  async cancelJob(jobId: string): Promise<void> {
    await invoke("cancel_job", { jobId });
  }

  async probe(path: string): Promise<ProbeResult> {
    return await invoke<ProbeResult>("probe_media", { path });
  }

  async checkPaths(paths: string[]): Promise<PathInfo[]> {
    return await invoke<PathInfo[]>("check_paths", { paths });
  }

  tools = {
    async status(): Promise<ToolStatus[]> {
      return await invoke<ToolStatus[]>("tool_status");
    },

    async capabilities(): Promise<Capabilities> {
      return await invoke<Capabilities>("tool_capabilities");
    },

    async install(tool: Tool, onEvent: (e: InstallEvent) => void): Promise<ToolStatus> {
      const channel = new Channel<InstallEvent>();
      channel.onmessage = onEvent;
      return await invoke<ToolStatus>("tool_install", {
        tool,
        onEvent: channel,
      });
    },

    async setCustomPath(tool: Tool, path: string): Promise<ToolStatus> {
      return await invoke<ToolStatus>("tool_set_custom_path", {
        tool,
        path,
      });
    },
  };
}
