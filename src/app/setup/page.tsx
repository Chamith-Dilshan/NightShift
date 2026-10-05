"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchToolStatus } from "@/store/tools/toolsSlice";
import { getExecutor, InstallEvent } from "@/lib/executor";
import { isTauri } from "@/lib/isTauri";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SetupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { status, loading } = useAppSelector((state) => state.tools);

  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<{
    stage: string;
    percent?: number;
    bytes?: number;
    total?: number;
  }>({ stage: "idle" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchToolStatus());
  }, [dispatch]);

  const ffmpegStatus = status.find((t) => t.tool === "ffmpeg");
  const ffprobeStatus = status.find((t) => t.tool === "ffprobe");
  const isInstalled =
    ffmpegStatus &&
    ffmpegStatus.source !== "missing" &&
    ffprobeStatus &&
    ffprobeStatus.source !== "missing";

  const handleInstall = async () => {
    setInstalling(true);
    setErrorMessage(null);
    setInstallProgress({ stage: "Connecting to static binary source..." });

    const executor = getExecutor();

    try {
      await executor.tools.install("ffmpeg", (event: InstallEvent) => {
        switch (event.kind) {
          case "started":
            setInstallProgress({
              stage: "Downloading FFmpeg static build...",
              total: event.totalBytes ?? undefined,
            });
            break;
          case "progress": {
            const pct =
              event.total && event.total > 0
                ? (event.bytes / event.total) * 100
                : undefined;
            setInstallProgress({
              stage: "Downloading binary package...",
              percent: pct,
              bytes: event.bytes,
              total: event.total ?? undefined,
            });
            break;
          }
          case "verifying":
            setInstallProgress({ stage: "Verifying SHA-256 integrity checksum..." });
            break;
          case "extracting":
            setInstallProgress({ stage: "Extracting binaries into app data directory..." });
            break;
          case "done":
            setInstallProgress({ stage: "Installation complete!" });
            dispatch(fetchToolStatus());
            setInstalling(false);
            break;
          case "error":
            setErrorMessage(event.message);
            setInstalling(false);
            break;
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setInstalling(false);
    }
  };

  const handleChooseCustom = async () => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          multiple: false,
          filters: [
            {
              name: "FFmpeg Binary",
              extensions: ["exe", "*"],
            },
          ],
        });

        if (selected && typeof selected === "string") {
          const executor = getExecutor();
          await executor.tools.setCustomPath("ffmpeg", selected);
          dispatch(fetchToolStatus());
        }
        return;
      } catch (e) {
        console.warn("Custom path picker error:", e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6 selection:bg-primary/30 font-sans">
      <Card className="w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
              <DownloadCloud className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Tool Environment Setup
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              NightShift uses verified static FFmpeg &amp; FFprobe binaries without bundling them in the installer.
            </p>
          </div>

          {/* Current Status */}
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">FFmpeg Status:</span>
                <span className="font-semibold">
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 inline" />
                  ) : ffmpegStatus?.source !== "missing" ? (
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Detected ({ffmpegStatus?.source})
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Not Found
                    </span>
                  )}
                </span>
              </div>

              {ffmpegStatus?.version && (
                <p className="text-[10px] text-zinc-500 truncate">
                  {ffmpegStatus.version}
                </p>
              )}
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs">
                <p className="font-semibold text-red-400 mb-0.5">Installation Error:</p>
                <p className="text-[11px]">{errorMessage}</p>
              </div>
            )}

            {/* Progress Bar */}
            {installing && (
              <div className="space-y-2 p-4 bg-zinc-900/80 border border-primary/30 rounded-xl">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    {installProgress.stage}
                  </span>
                  {installProgress.percent != null && (
                    <span className="font-bold text-primary">
                      {installProgress.percent.toFixed(0)}%
                    </span>
                  )}
                </div>

                {installProgress.percent != null && (
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-200"
                      style={{ width: `${installProgress.percent}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {isInstalled ? (
              <Button
                onClick={() => router.push("/video")}
                className="w-full h-10 font-mono text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <span>Launch Video Studio</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full h-10 font-mono text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <DownloadCloud className="w-4 h-4 mr-2" />
                  {installing ? "Downloading..." : "Download Verified FFmpeg Build (≈ 50 MB)"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleChooseCustom}
                  disabled={installing}
                  className="w-full h-9 font-mono text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-2" />
                  Locate Existing FFmpeg Binary
                </Button>
              </div>
            )}
          </div>

          {/* License & Source Notice */}
          <div className="pt-2 text-center text-[10px] text-zinc-500 space-y-1">
            <p className="flex items-center justify-center gap-1 text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Official builds downloaded from GitHub static releases.
            </p>
            <p>FFmpeg is licensed under GPL-3.0 / LGPL-3.0.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
