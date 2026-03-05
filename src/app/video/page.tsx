"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ChevronLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import InputPanel from "@/components/videoTool/InputPanel";
import OutputPanel from "@/components/videoTool/OutputPanel";
import VideoPanel from "@/components/videoTool/VideoPanel";
import AudioPanel from "@/components/videoTool/AudioPanel";
import FiltersPanel from "@/components/videoTool/FiltersPanel";
import TransformPanel from "@/components/videoTool/TransformPanel";
import WatermarkPanel from "@/components/videoTool/WatermarkPanel";
import TemplateManager from "@/components/videoTool/TemplateManager";
import TerminalOutput from "@/components/videoTool/TerminalOutput";

import { generateVideoCommand } from "@/store/videoTool/commandBuilder";
import { setCommandMode, setManualCommand, resetAllPanels } from "@/store/videoTool/videoSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const panels = [
  { key: "input", label: "📂 Input" },
  { key: "output", label: "💾 Output" },
  { key: "video", label: "🎥 Video" },
  { key: "audio", label: "🔊 Audio" },
  { key: "filters", label: "✨ Filters" },
  { key: "transform", label: "🔄 Transform" },
  { key: "watermark", label: "🖼 Watermark" },
];

const VideoToolPage = () => {
  const [activePanel, setActivePanel] = useState("input");
  const [copied, setCopied] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const dispatch = useAppDispatch();
  const videoState = useAppSelector((s) => s.videoTool);
  const { commandMode, manualCommand } = videoState;

  // Build the live FFmpeg command from state
  const autoArgs = generateVideoCommand(videoState);
  
  // Format for display (add quotes around args with spaces/special chars)
  const formatArgForDisplay = (arg: string) => /[ ;=,]/.test(arg) ? `"${arg}"` : arg;
  const autoCommand = autoArgs.map(formatArgForDisplay).join(" ");
  
  const displayCommand = commandMode === "manual" ? manualCommand : autoCommand;

  // Switch to manual mode and seed with auto command when user starts editing
  const handleCommandEdit = useCallback(
    (value: string) => {
      if (commandMode === "auto") {
        dispatch(setCommandMode("manual"));
        dispatch(setManualCommand(value));
      } else {
        dispatch(setManualCommand(value));
      }
    },
    [commandMode, dispatch],
  );

  const handleCopy = async () => {
    try {
      await writeText(displayCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browser dev mode
      navigator.clipboard.writeText(displayCommand).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetToAuto = () => {
    dispatch(setCommandMode("auto"));
    dispatch(setManualCommand(""));
  };

  return (
    <section className="section-container" style={{ height: "100vh", overflowY: "hidden", paddingBlock: 0 }}>
      <div className="cyber-grid" />
      <div
        className="max-width-container flex flex-col"
        style={{ height: "100%", paddingBottom: 0 }}
      >
        {/* ================= HEADER ================= */}
        <header className="relative flex flex-col items-center justify-center text-center px-10 pt-8 pb-4 space-y-1 shrink-0">
          <div className="absolute left-6 top-8">
            <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Link>
          </div>
          <h1 className="neo-title flicker text-5xl">VIDEO TOOL</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Build FFmpeg commands visually — select a category and customize every option.
          </p>
        </header>

        {/* ================= MAIN BOX ================= */}
        <div className="flex-1 px-6 pb-2 flex flex-col gap-3 overflow-hidden z-10 min-h-0">
          <Card className="flex flex-col overflow-hidden rounded-2xl border" style={{ minHeight: 0, flex: 1 }}>

            {/* ---------- Horizontal Scroll Panel Selector (hidden scrollbar) ---------- */}
            <div
              className="flex gap-2 px-4 py-3 border-b overflow-x-auto shrink-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style>{`.panel-tabs::-webkit-scrollbar { display: none; }`}</style>
              {panels.map((p) => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={activePanel === p.key ? "default" : "secondary"}
                  className="shrink-0 rounded-xl"
                  onClick={() => setActivePanel(p.key)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* ---------- Options Area (Vertical Scroll) ---------- */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">
              {activePanel === "input" && <InputPanel />}
              {activePanel === "output" && <OutputPanel />}
              {activePanel === "video" && <VideoPanel />}
              {activePanel === "audio" && <AudioPanel />}
              {activePanel === "filters" && <FiltersPanel />}
              {activePanel === "transform" && <TransformPanel />}
              {activePanel === "watermark" && <WatermarkPanel />}
            </div>
          </Card>
        </div>

        {/* ================= Sticky Bottom Command Preview ================= */}
        <div className="px-6 pb-5 shrink-0 z-10">
          <Card className="p-4 rounded-2xl border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-6">
                <h3 className="text-sm font-semibold">
                  Live FFmpeg Command
                  {commandMode === "manual" && (
                    <span className="ml-2 text-xs text-yellow-500 font-normal">
                      ✏ Manual mode
                    </span>
                  )}
                </h3>
                
                {/* TEMPLATE MANAGER UI */}
                <TemplateManager />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  onClick={() => {
                    if (confirm("Reset all settings to default?")) {
                      dispatch(resetAllPanels());
                    }
                  }}
                >
                  Reset All
                </Button>
                {commandMode === "manual" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 rounded-lg"
                    onClick={handleResetToAuto}
                  >
                    ↩ Reset to Auto
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs h-7 rounded-lg"
                  onClick={handleCopy}
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7 rounded-lg"
                  onClick={() => setShowTerminal(true)}
                  disabled={videoState.inputFiles.length === 0}
                >
                  ▶ Run Sidecar
                </Button>
              </div>
            </div>

            {/* Editable command — clicking switches to manual mode */}
            <Textarea
              value={displayCommand || "ffmpeg  (add input files to generate command)"}
              onChange={(e) => handleCommandEdit(e.target.value)}
              className="text-xs font-mono rounded-xl min-h-[3rem] max-h-28 resize-none bg-muted border-0 focus-visible:ring-1"
              spellCheck={false}
            />
          </Card>
        </div>
      </div>

      {/* Live Server-Sent Events Terminal Modal */}
      {showTerminal && (
        <TerminalOutput
          command={commandMode === "manual" ? manualCommand.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/(^"|"$)/g, '')) || [] : autoArgs}
          onClose={() => setShowTerminal(false)}
        />
      )}
    </section>
  );
};

export default VideoToolPage;
