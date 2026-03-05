"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { ImageIcon, FolderOpen, X, RotateCcw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  setWatermarkFile,
  setWatermarkPosition,
  setWatermarkOpacity,
  resetWatermark,
} from "@/store/videoTool/videoSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

// Position grid: 9 options → overlay x:y values
const POSITION_GRID = [
  { label: "TL", pos: "10:10" },
  { label: "TC", pos: "(W-w)/2:10" },
  { label: "TR", pos: "W-w-10:10" },
  { label: "ML", pos: "10:(H-h)/2" },
  { label: "MC", pos: "(W-w)/2:(H-h)/2" },
  { label: "MR", pos: "W-w-10:(H-h)/2" },
  { label: "BL", pos: "10:H-h-10" },
  { label: "BC", pos: "(W-w)/2:H-h-10" },
  { label: "BR", pos: "W-w-10:H-h-10" },
];

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"];

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

export default function WatermarkPanel() {
  const dispatch = useAppDispatch();
  const watermark = useAppSelector((s) => s.videoTool.watermark);

  const pickWatermark = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
    });
    if (selected && typeof selected === "string") {
      dispatch(setWatermarkFile(selected));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">🖼 Watermark</h2>
          <p className="text-sm text-muted-foreground">
            Overlay an image watermark using{" "}
            <code className="text-xs bg-muted px-1 rounded">-filter_complex overlay</code>.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => dispatch(resetWatermark())}
          title="Reset Watermark"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset
        </Button>
      </div>

      {/* Image Picker */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <h3 className="text-sm font-semibold">Watermark Image</h3>

        {watermark.filePath ? (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
            <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono truncate flex-1">
              {basename(watermark.filePath)}
            </span>
            <button
              onClick={() => dispatch(setWatermarkFile(null))}
              className="shrink-0 text-muted-foreground hover:text-destructive transition"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <Card
            onClick={pickWatermark}
            className="p-5 border-dashed border-2 rounded-xl flex flex-col items-center gap-2 cursor-pointer hover:border-primary transition-colors"
          >
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Click to pick a watermark image
            </p>
          </Card>
        )}

        {!watermark.filePath && (
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl w-full"
            onClick={pickWatermark}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Browse Image
          </Button>
        )}
      </Card>

      {/* Position Grid */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <h3 className="text-sm font-semibold">Position</h3>
        <p className="text-xs text-muted-foreground">
          Select where on the video the watermark appears.
        </p>

        <div className="grid grid-cols-3 gap-2 max-w-[240px]">
          {POSITION_GRID.map(({ label, pos }) => (
            <Button
              key={pos}
              size="sm"
              variant={watermark.position === pos ? "default" : "secondary"}
              className={cn(
                "rounded-xl h-10 text-xs",
                watermark.position === pos && "ring-2 ring-primary ring-offset-1",
              )}
              onClick={() => dispatch(setWatermarkPosition(pos))}
            >
              {label}
            </Button>
          ))}
        </div>

        <p className="text-xs font-mono text-muted-foreground break-all">
          overlay={watermark.position}
        </p>
      </Card>

      {/* Opacity */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Opacity</h3>
          <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded-lg">
            {Math.round(watermark.opacity * 100)}%
          </span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[watermark.opacity]}
          onValueChange={([v]) => dispatch(setWatermarkOpacity(Math.round(v * 100) / 100))}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0% — Invisible</span>
          <span>100% — Fully opaque</span>
        </div>
      </Card>
    </div>
  );
}
