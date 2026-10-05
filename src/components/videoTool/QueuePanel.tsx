"use client";

import React, { useState } from "react";
import {
  ListOrdered,
  Play,
  StopCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Terminal,
  Loader2,
  Trash2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  cancelJobThunk,
  cancelAllJobsThunk,
  processNextJob,
} from "@/store/jobs/queueThunks";
import {
  retryJob,
  removeJob,
  clearAllJobs,
} from "@/store/jobs/jobsSlice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isTauri } from "@/lib/isTauri";
import { logStore, useJobLogs } from "@/store/jobs/logStore";

export function QueuePanel() {
  const dispatch = useAppDispatch();
  const { jobs, order, isQueueRunning } = useAppSelector((state) => state.jobs);
  const [selectedLogJobId, setSelectedLogJobId] = useState<string | null>(null);

  const jobList = order.map((id) => jobs[id]).filter(Boolean);

  const handleReveal = async (outputPath: string) => {
    if (isTauri()) {
      try {
        const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
        await revealItemInDir(outputPath);
        return;
      } catch (e) {
        console.warn("Reveal in folder failed:", e);
      }
    }
    console.log("Mock reveal:", outputPath);
  };

  const selectedJobLogs = useJobLogs(selectedLogJobId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-primary" />
          <LabelText className="text-sm font-semibold text-zinc-200">
            Batch Queue ({jobList.length})
          </LabelText>
        </div>

        <div className="flex items-center gap-2">
          {isQueueRunning ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => dispatch(cancelAllJobsThunk())}
              className="h-7 text-xs font-mono"
            >
              <StopCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel All
            </Button>
          ) : (
            jobList.some((j) => j.status === "queued") && (
              <Button
                size="sm"
                onClick={() => dispatch(processNextJob())}
                className="h-7 text-xs font-mono bg-primary text-primary-foreground"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" /> Start Queue
              </Button>
            )
          )}

          {jobList.length > 0 && !isQueueRunning && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                dispatch(clearAllJobs());
                logStore.clearAll();
              }}
              className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400 font-mono"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {jobList.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 font-mono text-xs text-zinc-500">
          No jobs in queue. Configure your settings and click &quot;Add & Run Queue&quot;.
        </div>
      ) : (
        <div className="space-y-2 font-mono text-xs max-h-72 overflow-y-auto pr-1">
          {jobList.map((job) => {
            const isRunning = job.status === "running";
            const isDone = job.status === "done";
            const isFailed = job.status === "failed";
            const isCancelled = job.status === "cancelled";

            return (
              <div
                key={job.id}
                className={`p-3 rounded-xl border transition-all ${
                  isRunning
                    ? "bg-primary/5 border-primary/50 shadow-sm"
                    : isDone
                    ? "bg-zinc-900/60 border-green-900/40"
                    : isFailed
                    ? "bg-red-950/20 border-red-900/40"
                    : "bg-zinc-900/40 border-zinc-800/80"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 truncate flex-1">
                    {isRunning ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    ) : isFailed ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-zinc-600 shrink-0 ml-1" />
                    )}

                    <div className="truncate">
                      <p className="text-xs font-semibold text-zinc-200 truncate">
                        {job.outputPath.split(/[\\/]/).pop() || job.outputPath}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        From: {job.inputPath.split(/[\\/]/).pop() || job.inputPath}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLogJobId(job.id)}
                      className="h-6 px-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                      title="View Process Log"
                    >
                      <Terminal className="w-3 h-3 mr-1" /> Log
                    </Button>

                    {isDone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReveal(job.outputPath)}
                        className="h-6 px-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                        title="Reveal in folder"
                      >
                        <FolderOpen className="w-3 h-3 mr-1" /> Reveal
                      </Button>
                    )}

                    {isRunning && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dispatch(cancelJobThunk(job.id))}
                        className="h-6 px-1.5 text-[10px] text-red-400 hover:text-red-300"
                      >
                        Cancel
                      </Button>
                    )}

                    {(isFailed || isCancelled) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          dispatch(retryJob(job.id));
                          dispatch(processNextJob());
                        }}
                        className="h-6 px-1.5 text-[10px] text-primary hover:text-primary/90"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    )}

                    {!isRunning && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dispatch(removeJob(job.id))}
                        className="h-6 w-6 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress bar and statistics */}
                <div className="space-y-1">
                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isDone
                          ? "bg-green-500"
                          : isFailed
                          ? "bg-red-500"
                          : isCancelled
                          ? "bg-yellow-500"
                          : "bg-primary"
                      }`}
                      style={{ width: `${job.percent.toFixed(1)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>
                      {isRunning
                        ? `Encoding: ${job.percent.toFixed(1)}%`
                        : isDone
                        ? "Completed"
                        : isFailed
                        ? `Failed (Code ${job.exitCode ?? "?"})`
                        : isCancelled
                        ? "Cancelled"
                        : "Queued"}
                    </span>

                    <div className="flex items-center gap-2">
                      {job.fps != null && <span>{job.fps.toFixed(0)} fps</span>}
                      {job.speed != null && <span>{job.speed.toFixed(2)}x</span>}
                      {job.durationMs != null && (
                        <span>{(job.durationMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  </div>

                  {job.errorSummary && (
                    <p className="text-[10px] text-red-400 truncate pt-0.5">
                      {job.errorSummary}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log modal for individual job */}
      {selectedLogJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="flex flex-col w-full max-w-3xl h-[70vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              <span className="font-semibold text-zinc-200">
                Log Output — {selectedLogJobId}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLogJobId(null)}
                className="h-7 px-2 text-xs"
              >
                Close
              </Button>
            </div>

            <div
              className="flex-1 p-4 overflow-y-auto space-y-1 text-zinc-300 leading-relaxed select-text"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}
            >
              {selectedJobLogs.length === 0 ? (
                <p className="text-zinc-600 italic">No log entries recorded for this job yet.</p>
              ) : (
                selectedJobLogs.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`whitespace-pre-wrap break-all ${
                      entry.stream === "stderr"
                        ? "text-red-400"
                        : entry.stream === "system"
                        ? "text-blue-400"
                        : "text-zinc-300"
                    }`}
                  >
                    {entry.text}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function LabelText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}
