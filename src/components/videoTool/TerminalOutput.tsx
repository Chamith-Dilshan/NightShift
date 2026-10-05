"use client";

import { useState, useRef, useEffect } from "react";
import { X, PlayCircle, Loader2, StopCircle, CheckCircle2, AlertCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getExecutor, JobEvent, Tool } from "@/lib/executor";

interface TerminalOutputProps {
  command: string[];
  tool?: Tool;
  onClose: () => void;
}

export default function TerminalOutput({
  command,
  tool = "ffmpeg",
  onClose,
}: TerminalOutputProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [progressStats, setProgressStats] = useState<string>("");
  const [exitInfo, setExitInfo] = useState<{
    code?: number | null;
    cancelled: boolean;
    durationMs: number;
    error?: string | null;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRun = async () => {
    setIsRunning(true);
    setExitInfo(null);
    setProgressPercent(null);
    setProgressStats("");

    const jobId = `job_${Date.now()}`;
    activeJobIdRef.current = jobId;

    const actualCommandArgs = command[0] === tool ? command.slice(1) : command;
    setLogs(["$ " + [tool, ...actualCommandArgs].join(" "), "Initializing native process..."]);

    const executor = getExecutor();

    try {
      await executor.runJob(
        jobId,
        {
          tool,
          args: actualCommandArgs,
        },
        (event: JobEvent) => {
          switch (event.kind) {
            case "started":
              setLogs((prev) => [...prev, `[System] Spawned PID ${event.pid}`]);
              break;
            case "log":
              setLogs((prev) => [...prev, `[${event.stream}] ${event.line}`]);
              break;
            case "progress": {
              if (event.percent != null) {
                setProgressPercent(event.percent);
              }
              const statsParts: string[] = [];
              if (event.fps != null) statsParts.push(`${event.fps.toFixed(1)} fps`);
              if (event.speed != null) statsParts.push(`${event.speed.toFixed(2)}x speed`);
              if (event.bitrateKbps != null) statsParts.push(`${event.bitrateKbps.toFixed(0)} kbps`);
              if (statsParts.length > 0) {
                setProgressStats(statsParts.join(" | "));
              }
              break;
            }
            case "exit": {
              setExitInfo({
                code: event.code,
                cancelled: event.cancelled,
                durationMs: event.durationMs,
                error: event.error,
              });
              if (event.cancelled) {
                setLogs((prev) => [...prev, `[System] Process cancelled by user.`]);
              } else if (event.code === 0) {
                setLogs((prev) => [
                  ...prev,
                  `[System] Process finished successfully in ${(event.durationMs / 1000).toFixed(2)}s.`,
                ]);
              } else {
                setLogs((prev) => [
                  ...prev,
                  `[Error] Process exited with code ${event.code ?? "unknown"}: ${event.error || "Execution failed"}`,
                ]);
              }
              setIsRunning(false);
              break;
            }
          }
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs((prev) => [...prev, `[System Error] ${msg}`]);
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    if (activeJobIdRef.current) {
      const executor = getExecutor();
      try {
        await executor.cancelJob(activeJobIdRef.current);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setLogs((prev) => [...prev, `[System Error] Cancel failed: ${msg}`]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="flex flex-col w-full max-w-4xl h-[80vh] overflow-hidden border shadow-2xl bg-card rounded-2xl">
        {/* Fake Window Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 ml-1">
              <div className="w-3 h-3 rounded-full bg-destructive/80 border border-destructive/50" />
              <div className="w-3 h-3 rounded-full bg-accent/80 border border-accent/50" />
              <div className="w-3 h-3 rounded-full bg-primary/80 border border-primary/50" />
            </div>
            <span className="text-xs font-mono text-muted-foreground ml-4 font-semibold tracking-wide">
              nightshift-runner — {tool}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isRunning && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                className="h-7 text-xs rounded-lg transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
              </Button>
            )}
            {!isRunning && logs.length === 0 && (
              <Button
                size="sm"
                onClick={handleRun}
                className="h-7 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Start Execution
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-white hover:bg-muted"
              disabled={isRunning}
              title={isRunning ? "Cannot close while process is running" : "Close Terminal"}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress header if active */}
        {progressPercent != null && (
          <div className="px-5 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-200"
                  style={{ width: `${progressPercent.toFixed(1)}%` }}
                />
              </div>
              <span className="text-foreground w-12 text-right">{progressPercent.toFixed(1)}%</span>
            </div>
            {progressStats && <span className="text-muted-foreground">{progressStats}</span>}
          </div>
        )}

        {/* Live Output Log Area */}
        <div
          ref={scrollRef}
          className="flex-1 p-5 overflow-y-auto font-mono text-[13px] leading-relaxed text-foreground selection:bg-primary/30"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/70 space-y-3">
              <p>Ready to execute native FFmpeg process.</p>
              <p className="text-xs text-muted-foreground/70">Click &quot;Start Execution&quot; to begin.</p>
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {logs.map((log, i) => {
                const isError = log.includes("[Error]") || log.includes("[stderr]");
                const isSystem = log.includes("[System]");
                const isProgress = log.includes("frame=") || log.includes("time=");

                return (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap break-all ${
                      isError
                        ? "text-destructive font-semibold"
                        : isSystem
                        ? "text-secondary-foreground"
                        : isProgress
                        ? "text-primary/80"
                        : "text-foreground"
                    }`}
                  >
                    {log}
                  </div>
                );
              })}

              {isRunning && (
                <div className="flex items-center gap-2 mt-4 text-primary animate-pulse font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" /> Execution in progress...
                </div>
              )}

              {exitInfo && (
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs">
                  {exitInfo.code === 0 ? (
                    <span className="text-primary flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Finished (Exit Code 0)
                    </span>
                  ) : exitInfo.cancelled ? (
                    <span className="text-accent-foreground flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="w-4 h-4" /> Cancelled
                    </span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="w-4 h-4" /> Failed (Exit Code {exitInfo.code ?? "?"})
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    Duration: {(exitInfo.durationMs / 1000).toFixed(2)}s
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
