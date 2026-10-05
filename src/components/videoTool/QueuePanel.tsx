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
          <LabelText className="text-sm font-semibold text-foreground">
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
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive font-mono"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {jobList.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/20 font-mono text-xs text-muted-foreground">
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
                    ? "bg-muted/60 border-primary/40"
                    : isFailed
                    ? "bg-destructive/10 border-destructive/40"
                    : "bg-muted/40 border-border/80"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 truncate flex-1">
                    {isRunning ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : isFailed ? (
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/20 shrink-0 ml-1" />
                    )}

                    <div className="truncate">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {job.outputPath.split(/[\\/]/).pop() || job.outputPath}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        From: {job.inputPath.split(/[\\/]/).pop() || job.inputPath}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLogJobId(job.id)}
                      className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      title="View Process Log"
                    >
                      <Terminal className="w-3 h-3 mr-1" /> Log
                    </Button>

                    {isDone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReveal(job.outputPath)}
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
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
                        className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive"
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
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress bar and statistics */}
                <div className="space-y-1">
                  <div className="w-full bg-muted/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isDone
                          ? "bg-primary"
                          : isFailed
                          ? "bg-destructive"
                          : isCancelled
                          ? "bg-accent"
                          : "bg-primary"
                      }`}
                      style={{ width: `${job.percent.toFixed(1)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-muted-foreground">
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
                    <p className="text-[10px] text-destructive truncate pt-0.5">
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
          <Card className="flex flex-col w-full max-w-3xl h-[70vh] bg-card border border-border rounded-2xl overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
              <span className="font-semibold text-foreground">
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
              className="flex-1 p-4 overflow-y-auto space-y-1 text-foreground leading-relaxed select-text"
              style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
            >
              {selectedJobLogs.length === 0 ? (
                <p className="text-muted-foreground/70 italic">No log entries recorded for this job yet.</p>
              ) : (
                selectedJobLogs.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`whitespace-pre-wrap break-all ${
                      entry.stream === "stderr"
                        ? "text-destructive"
                        : entry.stream === "system"
                        ? "text-secondary-foreground"
                        : "text-foreground"
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
