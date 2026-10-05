import { AppDispatch, RootState } from "../store";
import { getExecutor, JobEvent, Tool } from "@/lib/executor";
import { planOutputs } from "../videoTool/outputPlanner";
import { generateVideoCommand } from "../videoTool/commandBuilder";
import { parseCommand } from "../videoTool/commandParser";
import { logStore } from "./logStore";
import {
  JobItem,
  enqueueJobs,
  updateJobProgress,
  setJobRunning,
  setJobFinished,
  setQueueRunning,
} from "./jobsSlice";

export const enqueueAndRunJobs =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const video = state.video;
    const executor = getExecutor();

    if (video.commandMode === "manual") {
      const rawCmd = video.manualCommand.trim();
      if (!rawCmd) return;
      const tokens = parseCommand(rawCmd);
      const jobId = `job_${Date.now()}`;

      const job: JobItem = {
        id: jobId,
        inputPath: "manual",
        outputPath: "manual",
        argv: tokens,
        status: "queued",
        percent: 0,
        speed: null,
        fps: null,
        bitrateKbps: null,
      };

      dispatch(enqueueJobs([job]));
      dispatch(processNextJob());
      return;
    }

    if (video.inputFiles.length === 0) return;

    // Probe-aware output planning with existing paths check
    // 1. Generate naive candidate output paths
    const initialPlanned = planOutputs(video.settings, video.inputFiles, new Set());
    const candidatePaths = initialPlanned.map((p) => p.output);

    // 2. Query filesystem for existence
    const pathInfos = await executor.checkPaths(candidatePaths);
    const existingSet = new Set(
      pathInfos.filter((info) => info.exists).map((info) => info.path)
    );

    // 3. Plan actual outputs resolving collisions
    const planned = planOutputs(video.settings, video.inputFiles, existingSet);

    // 4. Build jobs
    const newJobs: JobItem[] = planned.map((item, idx) => {
      const probe = video.probes[item.input];
      const argv = generateVideoCommand(video.settings, {
        input: item.input,
        output: item.output,
        probe,
      });

      return {
        id: `job_${Date.now()}_${idx}`,
        inputPath: item.input,
        outputPath: item.output,
        argv,
        status: "queued",
        percent: 0,
        speed: null,
        fps: null,
        bitrateKbps: null,
      };
    });

    dispatch(enqueueJobs(newJobs));
    dispatch(processNextJob());
  };

export const processNextJob =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.jobs.runningJobId) {
      // Already running a job
      return;
    }

    // Find next queued job in order
    const nextId = state.jobs.order.find(
      (id) => state.jobs.jobs[id]?.status === "queued"
    );

    if (!nextId) {
      dispatch(setQueueRunning(false));
      return;
    }

    const job = state.jobs.jobs[nextId];
    if (!job) return;

    dispatch(setJobRunning(nextId));

    const executor = getExecutor();
    const tool = (job.argv[0]?.toLowerCase() === "ffprobe" ? "ffprobe" : "ffmpeg") as Tool;
    const actualArgs = job.argv.slice(1);

    const probe = state.video.probes[job.inputPath];
    const durationMs = probe?.durationMs || null;

    logStore.appendLog(
      job.id,
      "system",
      `$ ${job.argv.join(" ")}`
    );

    try {
      await executor.runJob(
        job.id,
        {
          tool,
          args: actualArgs,
          outputPath: job.outputPath === "manual" ? null : job.outputPath,
          outputExisted: false,
          durationMs,
        },
        (event: JobEvent) => {
          switch (event.kind) {
            case "started":
              logStore.appendLog(
                job.id,
                "system",
                `[System] Process started with PID ${event.pid}`
              );
              break;

            case "log":
              logStore.appendLog(job.id, event.stream, event.line);
              break;

            case "progress":
              dispatch(
                updateJobProgress({
                  id: job.id,
                  percent: event.percent,
                  speed: event.speed,
                  fps: event.fps,
                  bitrateKbps: event.bitrateKbps,
                })
              );
              break;

            case "exit": {
              const status = event.cancelled
                ? "cancelled"
                : event.code === 0
                ? "done"
                : "failed";

              dispatch(
                setJobFinished({
                  id: job.id,
                  status,
                  exitCode: event.code,
                  durationMs: event.durationMs,
                  errorSummary: event.error,
                })
              );

              if (status === "done") {
                logStore.appendLog(
                  job.id,
                  "system",
                  `[System] Job completed successfully in ${(event.durationMs / 1000).toFixed(2)}s`
                );
              } else if (status === "cancelled") {
                logStore.appendLog(job.id, "system", "[System] Job cancelled by user");
              } else {
                logStore.appendLog(
                  job.id,
                  "stderr",
                  `[Error] Job failed with exit code ${event.code ?? "?"}: ${event.error || "Unknown error"}`
                );
              }

              // Process next queued job in batch
              setTimeout(() => {
                dispatch(processNextJob());
              }, 50);
              break;
            }
          }
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logStore.appendLog(job.id, "stderr", `[System Error] ${msg}`);
      dispatch(
        setJobFinished({
          id: job.id,
          status: "failed",
          exitCode: 1,
          durationMs: 0,
          errorSummary: msg,
        })
      );
      setTimeout(() => {
        dispatch(processNextJob());
      }, 50);
    }
  };

export const cancelJobThunk =
  (jobId: string) => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const job = state.jobs.jobs[jobId];
    if (!job) return;

    if (job.status === "queued") {
      dispatch(
        setJobFinished({
          id: jobId,
          status: "cancelled",
        })
      );
      return;
    }

    if (job.status === "running") {
      const executor = getExecutor();
      try {
        await executor.cancelJob(jobId);
      } catch (e) {
        console.warn("Failed to cancel job:", e);
      }
    }
  };

export const cancelAllJobsThunk =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const runningId = state.jobs.runningJobId;
    if (runningId) {
      const executor = getExecutor();
      try {
        await executor.cancelJob(runningId);
      } catch (e) {
        console.warn("Failed to cancel running job:", e);
      }
    }

    for (const id of state.jobs.order) {
      const job = state.jobs.jobs[id];
      if (job && (job.status === "queued" || job.status === "running")) {
        dispatch(
          setJobFinished({
            id,
            status: "cancelled",
          })
        );
      }
    }

    dispatch(setQueueRunning(false));
  };
