"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Wrench,
  FolderOpen,
  RefreshCw,
  Sparkles,
  DownloadCloud,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchToolStatus } from "@/store/tools/toolsSlice";
import { getExecutor } from "@/lib/executor";
import { isTauri } from "@/lib/isTauri";
import { Button } from "@/components/ui/button";
import PanelBlock from "@/components/PanelBlock";

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { status, capabilities, loading } = useAppSelector(
    (state) => state.tools
  );

  const [updaterMsg, setUpdaterMsg] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    dispatch(fetchToolStatus());
  }, [dispatch]);

  const handlePickCustomPath = async (tool: "ffmpeg" | "ffprobe") => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          multiple: false,
          filters: [
            {
              name: `${tool.toUpperCase()} Executable`,
              extensions: ["exe", "*"],
            },
          ],
        });

        if (selected && typeof selected === "string") {
          const executor = getExecutor();
          await executor.tools.setCustomPath(tool, selected);
          dispatch(fetchToolStatus());
        }
        return;
      } catch (e) {
        console.warn("Custom path dialog error:", e);
      }
    }
  };

  const handleCheckAppUpdates = async () => {
    setCheckingUpdate(true);
    setUpdaterMsg("Checking for new releases...");

    if (isTauri()) {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update?.available) {
          setUpdaterMsg(`New version available: v${update.version}!`);
        } else {
          setUpdaterMsg("You are running the latest version of NightShift.");
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setUpdaterMsg(`Update check failed: ${msg}`);
      } finally {
        setCheckingUpdate(false);
      }
      return;
    }

    setTimeout(() => {
      setUpdaterMsg("Browser demo mode: application is up to date.");
      setCheckingUpdate(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/80 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/video"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Video Studio</span>
          </Link>
          <div className="h-4 w-px bg-muted" />
          <span className="font-bold text-sm tracking-wide text-foreground">
            System &amp; Tool Settings
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch(fetchToolStatus())}
          disabled={loading}
          className="h-8 text-xs font-mono border-border hover:bg-muted text-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto my-6 p-6 space-y-6 bg-background/80 backdrop-blur-md border border-border/80">
        {/* Tools Configuration */}
        <PanelBlock title="Binary Environment & Codec Engines">
          <div className="space-y-4 font-mono text-xs">
            {status.map((tool) => (
              <div
                key={tool.tool}
                className="p-4 bg-muted/60 border border-border rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-foreground uppercase">
                      {tool.tool}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border capitalize ${
                        tool.source === "missing"
                          ? "bg-destructive/10 border-destructive/50 text-destructive"
                          : "bg-primary/10 border-primary/50 text-primary"
                      }`}
                    >
                      {tool.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePickCustomPath(tool.tool)}
                      className="h-7 text-xs border-border hover:bg-muted text-foreground"
                    >
                      <FolderOpen className="w-3 h-3 mr-1" /> Custom Path
                    </Button>
                    <Link href="/setup">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-muted hover:bg-muted-foreground/20 text-foreground"
                      >
                        <DownloadCloud className="w-3 h-3 mr-1" /> Reinstall
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="space-y-1 text-muted-foreground text-[11px]">
                  <p>
                    <span className="text-muted-foreground">Resolved Path: </span>
                    <span className="text-foreground">{tool.path || "(Not found)"}</span>
                  </p>
                  {tool.version && (
                    <p className="truncate">
                      <span className="text-muted-foreground">Version: </span>
                      <span className="text-foreground">{tool.version}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Capabilities Summary */}
            <div className="p-4 bg-muted/40 border border-border/80 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">
                  Detected Hardware / Codec Capabilities
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div className="space-y-1.5">
                  <span className="text-muted-foreground font-semibold">Video Encoders:</span>
                  <div className="flex flex-wrap gap-1">
                    {capabilities.videoEncoders.length > 0 ? (
                      capabilities.videoEncoders.map((enc) => (
                        <span
                          key={enc}
                          className="bg-muted/80 text-foreground px-2 py-0.5 rounded border border-border/60"
                        >
                          {enc}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">None detected</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-muted-foreground font-semibold">Audio Encoders:</span>
                  <div className="flex flex-wrap gap-1">
                    {capabilities.audioEncoders.length > 0 ? (
                      capabilities.audioEncoders.map((enc) => (
                        <span
                          key={enc}
                          className="bg-muted/80 text-foreground px-2 py-0.5 rounded border border-border/60"
                        >
                          {enc}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">None detected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PanelBlock>

        {/* Application Updates */}
        <PanelBlock title="Application Updates">
          <div className="flex items-center justify-between p-2 font-mono text-xs">
            <div>
              <p className="text-sm font-semibold text-foreground">NightShift Desktop</p>
              <p className="text-xs text-muted-foreground">Current Release: v0.1.0</p>
              {updaterMsg && (
                <p className="text-[11px] text-primary mt-1 font-medium">{updaterMsg}</p>
              )}
            </div>

            <Button
              size="sm"
              onClick={handleCheckAppUpdates}
              disabled={checkingUpdate}
              className="h-8 text-xs bg-primary text-primary-foreground font-mono"
            >
              {checkingUpdate ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Checking...
                </>
              ) : (
                "Check for Updates"
              )}
            </Button>
          </div>
        </PanelBlock>
      </main>
    </div>
  );
}
