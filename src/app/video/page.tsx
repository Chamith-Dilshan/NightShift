"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Copy,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectVideoState,
  selectGeneratedCommand,
  selectPlannedOutputs,
  selectValidation,
} from "@/store/videoTool/selectors";
import {
  setManualCommand,
  resetToAuto,
} from "@/store/videoTool/videoSlice";
import { enqueueAndRunJobs } from "@/store/jobs/queueThunks";
import { isTauri } from "@/lib/isTauri";
import { formatCommand } from "@/store/videoTool/commandParser";

import InputPanel from "@/components/videoTool/InputPanel";
import OutputPanel from "@/components/videoTool/OutputPanel";
import VideoPanel from "@/components/videoTool/VideoPanel";
import AudioPanel from "@/components/videoTool/AudioPanel";
import FiltersPanel from "@/components/videoTool/FiltersPanel";
import TransformPanel from "@/components/videoTool/TransformPanel";
import WatermarkPanel from "@/components/videoTool/WatermarkPanel";
import { TrimPanel } from "@/components/videoTool/TrimPanel";
import { CropPanel } from "@/components/videoTool/CropPanel";
import { KeyframePanel } from "@/components/videoTool/KeyframePanel";
import TemplateManager from "@/components/videoTool/TemplateManager";
import { QueuePanel } from "@/components/videoTool/QueuePanel";
import { ValidationSummary } from "@/components/videoTool/ValidationSummary";
import TerminalOutput from "@/components/videoTool/TerminalOutput";
import PanelBlock from "@/components/PanelBlock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function VideoToolPage() {
  const dispatch = useAppDispatch();
  const videoState = useAppSelector(selectVideoState);
  const generatedArgv = useAppSelector(selectGeneratedCommand);
  const plannedOutputs = useAppSelector(selectPlannedOutputs);
  const toolStatus = useAppSelector((state) => state.tools.status);
  const capabilities = useAppSelector((state) => state.tools.capabilities);
  const isQueueRunning = useAppSelector((state) => state.jobs.isQueueRunning);

  const issues = useAppSelector(
    selectValidation({
      probes: videoState.probes,
      capabilities,
      toolStatus,
    })
  );

  const hasErrors = issues.some((i) => i.severity === "error");

  const [copied, setCopied] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const displayCommandStr =
    videoState.commandMode === "manual"
      ? videoState.manualCommand
      : formatCommand(generatedArgv);

  const handleCopy = useCallback(async () => {
    if (isTauri()) {
      try {
        const { writeText } = await import(
          "@tauri-apps/plugin-clipboard-manager"
        );
        await writeText(displayCommandStr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (e) {
        console.warn("Clipboard plugin error:", e);
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(displayCommandStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [displayCommandStr]);

  const handleManualEdit = (val: string) => {
    dispatch(setManualCommand(val));
  };

  const handleRunQueue = () => {
    if (hasErrors || isQueueRunning) return;
    dispatch(enqueueAndRunJobs());
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/80 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-muted" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-foreground">
              Video Studio
            </span>
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono font-medium">
              v0.1
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">

          <div className="w-6 h-6 text-primary flex items-center justify-center">
                     <AnimatedThemeToggler  variant="circle"/>
                   </div>
                   
          <Link
            href="/settings"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            Settings
          </Link>

          <Button
            size="sm"
            onClick={handleRunQueue}
            disabled={hasErrors || isQueueRunning}
            className="h-8 text-xs font-mono font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            {isQueueRunning ? "Batch Processing..." : "Add & Run Queue"}
          </Button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input, Output, and Batch Queue */}
        <div className="lg:col-span-5 space-y-6">
          <PanelBlock title="Source Media">
            <InputPanel />
          </PanelBlock>

          <PanelBlock title="Output Plan">
            <OutputPanel />
          </PanelBlock>

          <PanelBlock title="Batch Jobs">
            <QueuePanel />
          </PanelBlock>
        </div>

        {/* Right Column: Processing Controls, Presets & Command Preview */}
        <div className="lg:col-span-7 space-y-6">
          {/* Presets and Validation */}
          <PanelBlock title="Preset Configuration">
            <TemplateManager />
          </PanelBlock>

          {/* Manual Mode Banner */}
          {videoState.commandMode === "manual" && (
            <div className="flex items-center justify-between p-3.5 bg-accent/10 border border-accent/60 rounded-xl text-accent-foreground text-xs font-mono">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
                <span>Manual command mode active. Visual controls are locked.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dispatch(resetToAuto())}
                className="h-7 text-xs border-accent text-accent-foreground hover:bg-accent/10"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Reset to Auto
              </Button>
            </div>
          )}

          {/* Validation Status */}
          <ValidationSummary issues={issues} />

          {/* Tool Parameters (Disabled when in manual mode) */}
          <div
            className={`space-y-6 transition-opacity ${
              videoState.commandMode === "manual" ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            <PanelBlock title="Encoding & Codec">
              <VideoPanel />
            </PanelBlock>

            <PanelBlock title="Audio Pipeline">
              <AudioPanel />
            </PanelBlock>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PanelBlock title="Trim">
                <TrimPanel />
              </PanelBlock>

              <PanelBlock title="Crop">
                <CropPanel />
              </PanelBlock>
            </div>

            <PanelBlock title="Keyframes">
              <KeyframePanel />
            </PanelBlock>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PanelBlock title="Filters">
                <FiltersPanel />
              </PanelBlock>

              <PanelBlock title="Transforms">
                <TransformPanel />
              </PanelBlock>
            </div>

            <PanelBlock title="Watermark">
              <WatermarkPanel />
            </PanelBlock>
          </div>

          {/* Command Preview and Manual Editing */}
          <PanelBlock title="FFmpeg Command Stream">
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {videoState.commandMode === "manual"
                    ? "Direct manual command (editing enabled):"
                    : plannedOutputs.length > 1
                    ? `Batch of ${plannedOutputs.length} (showing first):`
                    : "Generated Command:"}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-primary" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy CLI
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTerminal(true)}
                    className="h-7 px-2 text-xs border-border hover:bg-muted text-foreground"
                  >
                    <Terminal className="w-3.5 h-3.5 mr-1" /> Standalone Run
                  </Button>
                </div>
              </div>

              <Textarea
                value={displayCommandStr}
                onChange={(e) => handleManualEdit(e.target.value)}
                rows={4}
                className="font-mono text-xs leading-relaxed bg-card border-border text-foreground focus:border-primary resize-y"
                placeholder="ffmpeg -i input.mp4 ..."
              />
            </div>
          </PanelBlock>
        </div>
      </main>

      {/* Standalone Terminal Modal */}
      {showTerminal && (
        <TerminalOutput
          command={generatedArgv}
          tool="ffmpeg"
          onClose={() => setShowTerminal(false)}
        />
      )}
    </div>
  );
}
