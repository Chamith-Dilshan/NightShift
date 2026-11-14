/**
 * Batch scheduler thunk.
 *
 * Manages concurrent execution of batch jobs with failure policies.
 */

import { AppDispatch, RootState } from "../store";
import { getExecutor, JobEvent } from "@/lib/executor";
import { logStore } from "../jobs/logStore";
import {
  enqueueJobs,
  updateJobProgress,
  setJobRunning,
  setJobFinished,
  setQueueRunning,
  JobItem,
} from "../jobs/jobsSlice";
import {
  setBatchStatus,
  addBatchJob,
  updateBatchJobCount,
  recordJobError,
  setOutputBytes,
} from "../batches/batchesSlice";
import { BatchItem as BatchPlanItem } from "@/core/batch";

/**
 * Run a batch by executing all planned items with concurrency control.
 */
export const runBatch =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const batchId = state.batches.activeBatchId;
    if (!batchId) return;

    const batch = state.batches.batches[batchId];
    if (!batch || batch.status !== "ready") return;

    const { concurrency, failurePolicy, items, toolId } = batch;
    const runnableItems = items.filter((item) => !item.willSkip && !item.issues.some((i) => i.severity === "error"));

    if (runnableItems.length === 0) {
      dispatch(setBatchStatus({ id: batchId, status: "done" }));
      return;
    }

    // Mark skipped items
    const skippedCount = items.filter((i) => i.willSkip).length;
    if (skippedCount > 0) {
      dispatch(updateBatchJobCount({ id: batchId, skipped: skippedCount }));
    }

    // Create jobs for runnable items
    const jobs: JobItem[] = runnableItems.map((item, idx) => ({
      id: `batch_${batchId}_${idx}`,
      inputPath: item.input.path,
      outputPath: item.output,
      argv: [], // Will be filled by the adapter
      status: "queued" as const,
      percent: 0,
      speed: null,
      fps: null,
      bitrateKbps: null,
    }));

    dispatch(enqueueJobs(jobs));
    dispatch(setBatchStatus({ id: batchId, status: "running" }));
    dispatch(setQueueRunning(true));

    // Track running jobs for concurrency
    const runningJobs = new Set<string>();
    let jobIndex = 0;
    let hasFailure = false;

    const executor = getExecutor();

    /**
     * Start the next job if concurrency allows.
     */
    const startNextJob = async () => {
      if (hasFailure && failurePolicy === "stop-on-first-failure") {
        dispatch(setBatchStatus({ id: batchId, status: "failed" }));
        dispatch(setQueueRunning(false));
        return;
      }

      while (jobIndex < jobs.length && runningJobs.size < concurrency) {
        const job = jobs[jobIndex++];
        if (job.status !== "queued") continue;

        runningJobs.add(job.id);
        dispatch(setJobRunning(job.id));
        dispatch(addBatchJob({ batchId, jobId: job.id }));

        // Run the job
        runSingleJob(job, batchId, toolId, executor, dispatch, (finished: boolean, failed: boolean) => {
          runningJobs.delete(job.id);

          if (failed) {
            hasFailure = true;
            if (failurePolicy === "stop-on-first-failure") {
              // Cancel remaining queued jobs
              const remaining = jobs.slice(jobIndex);
              for (const rj of remaining) {
                if (rj.status === "queued") {
                  dispatch(setJobFinished({ id: rj.id, status: "cancelled" }));
                  dispatch(updateBatchJobCount({ id: batchId, cancelled: 1 }));
                }
              }
              dispatch(setBatchStatus({ id: batchId, status: "failed" }));
              dispatch(setQueueRunning(false));
              return;
            }
          }

          // Check if all jobs are done
          const allDone = jobs.every((j) =>
            j.status === "done" || j.status === "failed" || j.status === "cancelled"
          );

          if (allDone) {
            // Calculate output bytes
            let totalOutputBytes = 0;
            for (const j of jobs) {
              if (j.status === "done" && j.outputPath) {
                // Would need to check file size — for now skip
              }
            }
            if (totalOutputBytes > 0) {
              dispatch(setOutputBytes({ id: batchId, bytes: totalOutputBytes }));
            }

            const finalStatus = hasFailure ? "failed" : "done";
            dispatch(setBatchStatus({ id: batchId, status: finalStatus }));
            dispatch(setQueueRunning(false));
          } else {
            // Start next job
            startNextJob();
          }
        });
      }
    };

    startNextJob();
  };

/**
 * Run a single job and call the callback when finished.
 */
function runSingleJob(
  job: JobItem,
  batchId: string,
  toolId: string,
  executor: ReturnType<typeof getExecutor>,
  dispatch: AppDispatch,
  callback: (finished: boolean, failed: boolean) => void
) {
  const tool = toolId === "ffprobe" ? "ffprobe" : "ffmpeg";
  const actualArgs = job.argv.length > 0 ? job.argv : [];

  logStore.appendLog(job.id, "system", `$ ${job.argv.join(" ")}`);

  try {
    executor.runJob(
      job.id,
      {
        tool,
        args: actualArgs,
        outputPath: job.outputPath || null,
        outputExisted: false,
        durationMs: null,
      },
      (event: JobEvent) => {
        switch (event.kind) {
          case "started":
            logStore.appendLog(job.id, "system", `[System] Process started with PID ${event.pid}`);
            break;

          case "log":
            logStore.appendLog(job.id, event.stream, event.line);
            break;

          case "progress":
            dispatch(updateJobProgress({
              id: job.id,
              percent: event.percent,
              speed: event.speed,
              fps: event.fps,
              bitrateKbps: event.bitrateKbps,
            }));
            break;

          case "exit": {
            const status = event.cancelled
              ? "cancelled"
              : event.code === 0
              ? "done"
              : "failed";

            dispatch(setJobFinished({
              id: job.id,
              status,
              exitCode: event.code,
              durationMs: event.durationMs,
              errorSummary: event.error,
            }));

            if (status === "done") {
              logStore.appendLog(
                job.id,
                "system",
                `[System] Job completed successfully in ${(event.durationMs / 1000).toFixed(2)}s`
              );
              dispatch(updateBatchJobCount({ id: batchId, completed: 1 }));
            } else if (status === "cancelled") {
              logStore.appendLog(job.id, "system", "[System] Job cancelled by user");
              dispatch(updateBatchJobCount({ id: batchId, cancelled: 1 }));
            } else {
              const errorMsg = event.error || `Exit code ${event.code ?? "?"}`;
              logStore.appendLog(job.id, "stderr", `[Error] ${errorMsg}`);
              dispatch(updateBatchJobCount({ id: batchId, failed: 1 }));
              dispatch(recordJobError({ batchId, jobId: job.id, error: errorMsg }));
            }

            callback(true, status === "failed");
            break;
          }
        }
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logStore.appendLog(job.id, "stderr", `[System Error] ${msg}`);
    dispatch(setJobFinished({
      id: job.id,
      status: "failed",
      exitCode: 1,
      durationMs: 0,
      errorSummary: msg,
    }));
    dispatch(updateBatchJobCount({ id: batchId, failed: 1 }));
    dispatch(recordJobError({ batchId, jobId: job.id, error: msg }));
    callback(true, true);
  }
}

/**
 * Cancel all jobs in a batch.
 */
export const cancelBatch =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const batchId = state.batches.activeBatchId;
    if (!batchId) return;

    const batch = state.batches.batches[batchId];
    if (!batch) return;

    const executor = getExecutor();

    // Cancel running job
    const runningId = state.jobs.runningJobId;
    if (runningId && batch.jobIds.includes(runningId)) {
      try {
        await executor.cancelJob(runningId);
      } catch (e) {
        console.warn("Failed to cancel job:", e);
      }
    }

    // Mark all queued/running jobs as cancelled
    for (const jobId of batch.jobIds) {
      const job = state.jobs.jobs[jobId];
      if (job && (job.status === "queued" || job.status === "running")) {
        dispatch(setJobFinished({ id: jobId, status: "cancelled" }));
      }
    }

    dispatch(setBatchStatus({ id: batchId, status: "done" }));
    dispatch(setQueueRunning(false));
  };

/**
 * Retry failed jobs in a batch.
 */
export const retryFailedBatch =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const batchId = state.batches.activeBatchId;
    if (!batchId) return;

    const batch = state.batches.batches[batchId];
    if (!batch) return;

    // Reset failed jobs to queued
    for (const jobId of batch.jobIds) {
      const job = state.jobs.jobs[jobId];
      if (job && job.status === "failed") {
        dispatch(setJobRunning(jobId)); // This will reset the job state
        job.status = "queued";
        job.percent = 0;
        job.errorSummary = null;
      }
    }

    dispatch(setBatchStatus({ id: batchId, status: "running" }));
    dispatch(setQueueRunning(true));
  };
