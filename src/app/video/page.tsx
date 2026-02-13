"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PanelBlock from "@/components/PanelBlock";

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

  return (
    <section className="section-container">
      <div className="cyber-grid" />
      <div className="max-width-container flex flex-col">
        {/* ================= HEADER ================= */}
        <header className="flex flex-col items-center justify-center text-center px-10 pt-10 pb-6 space-y-2">
          <h1 className="neo-title flicker text-7xl">VIDEO TOOL</h1>

          <p className="text-lg text-muted-foreground max-w-xl">
            Build FFmpeg commands visually. Select a category below and
            customize every option without losing flexibility.
          </p>
        </header>

        {/* ================= MAIN BOX ================= */}
        <div className="flex-1 px-10 pb-6 flex flex-col gap-4 overflow-hidden z-10">
          <Card className="flex flex-col h-full overflow-hidden rounded-2xl border">
            {/* ---------- Horizontal Scroll Panel Selector ---------- */}
            <div className="flex gap-3 px-4 py-3 border-b overflow-x-auto scrollbar-thin">
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
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {activePanel === "input" && (
                <PanelBlock title="Input Files">
                  <Button>Select Video / Audio / Image Files</Button>
                </PanelBlock>
              )}

              {activePanel === "output" && (
                <PanelBlock title="Output Settings">
                  Output name, format, folder...
                </PanelBlock>
              )}

              {activePanel === "video" && (
                <PanelBlock title="Video Options">
                  Codec, CRF, bitrate, resolution, fps...
                </PanelBlock>
              )}

              {activePanel === "audio" && (
                <PanelBlock title="Audio Options">
                  Codec, bitrate, channels...
                </PanelBlock>
              )}

              {activePanel === "filters" && (
                <PanelBlock title="Filters">
                  Blur, grayscale, saturation...
                </PanelBlock>
              )}

              {activePanel === "transform" && (
                <PanelBlock title="Transforms">
                  Rotate, flip horizontal/vertical...
                </PanelBlock>
              )}

              {activePanel === "watermark" && (
                <PanelBlock title="Watermark">
                  Overlay watermark file + position controls...
                </PanelBlock>
              )}
            </div>
          </Card>
        </div>

        {/* ================= Sticky Bottom Command Preview ================= */}
        <div className="sticky bottom-0 w-full px-10 pb-6">
          <Card className="p-5 border-t rounded-2xl">
            <h3 className="text-sm font-semibold mb-2">Live FFmpeg Command</h3>

            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-3 rounded-xl">
              ffmpeg -i input.mp4 -c:v libx264 output.mp4
            </pre>

            <div className="flex gap-3 mt-3">
              <Button size="sm">Copy</Button>
              <Button size="sm" variant="secondary">
                Run
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default VideoToolPage;
