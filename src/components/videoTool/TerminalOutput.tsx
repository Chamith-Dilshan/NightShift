"use client";

import { useState, useRef, useEffect } from "react";
import { X, PlayCircle, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TerminalOutputProps {
  command: string[];
  tool?: string;
  onClose: () => void;
}

/**
 * TerminalOutput is a live streaming terminal component that connects to the
 * FastAPI sidecar via Server-Sent Events (SSE) and displays the execution 
 * logs of FFmpeg line-by-line as they occur natively on the machine.
 */
export default function TerminalOutput({ command, tool = "ffmpeg", onClose }: TerminalOutputProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new logs stream in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRun = async () => {
    setIsRunning(true);
    // Remove the binary name ("ffmpeg") from the display log if present in the command array
    const actualCommandArgs = command[0] === tool ? command.slice(1) : command;
    setLogs(["$ " + [tool, ...actualCommandArgs].join(" "), "Connecting to execution sidecar..."]);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/run-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args: actualCommandArgs }),
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported by browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const msg = line.substring(6);
              if (msg === "[DONE]") {
                done = true;
                break;
              }
              setLogs(prev => [...prev, msg]);
            }
          }
        }
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `[System Error] Client-side failure: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="flex flex-col w-full max-w-4xl h-[80vh] overflow-hidden border shadow-2xl bg-zinc-950 rounded-2xl">
        {/* Fake Window Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 ml-1">
              <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-600/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-600/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/80 border border-green-600/50" />
            </div>
            <span className="text-xs font-mono text-zinc-400 ml-4 font-semibold tracking-wide">
              nightshift-sidecar — {tool}
            </span>
          </div>
          <div className="flex items-center gap-3">
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
              className="h-7 w-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              disabled={isRunning}
              title={isRunning ? "Cannot close while process is running" : "Close Terminal"}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Live Output Log Area */}
        <div 
          ref={scrollRef}
          className="flex-1 p-5 overflow-y-auto font-mono text-[13px] leading-relaxed text-zinc-300 selection:bg-primary/30"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3">
              <p>Ready to stream live execution logs from FastAPI sidecar.</p>
              <p className="text-xs text-zinc-700">Click &quot;Start Execution&quot; to begin.</p>
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {logs.map((log, i) => {
                const isError = log.includes("[Error]");
                const isSystem = log.includes("[System]");
                const isProgress = log.includes("frame=") || log.includes("time=");
                
                return (
                  <div 
                    key={i} 
                    className={`whitespace-pre-wrap break-all ${
                      isError ? "text-red-400 font-semibold" : 
                      isSystem ? "text-blue-400" : 
                      isProgress ? "text-green-400/80" : 
                      "text-zinc-300"
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
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
