"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, FileOutput, RotateCcw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setOutputDir,
  setOutputName,
  setFormat,
  resetOutput,
} from "@/store/videoTool/videoSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4 — H.264/AAC (most compatible)" },
  { value: "webm", label: "WebM — VP9/Opus (web optimized)" },
  { value: "gif", label: "GIF — Animated image" },
  { value: "custom", label: "Custom — specify manually" },
];

export default function OutputPanel() {
  const dispatch = useAppDispatch();
  const { outputName, outputDir, format } = useAppSelector(
    (s) => s.videoTool,
  );

  const pickOutputDir = async () => {
    const selected = await open({ directory: true });
    if (selected && typeof selected === "string") {
      dispatch(setOutputDir(selected));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">💾 Output Settings</h2>
          <p className="text-sm text-muted-foreground">
            Set the output file name, folder, and container format.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => dispatch(resetOutput())}
          title="Reset Output"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset
        </Button>
      </div>

      {/* Output Directory */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <h3 className="text-sm font-semibold">Output Directory</h3>

        <div className="flex gap-2">
          <Input
            value={outputDir}
            onChange={(e) => dispatch(setOutputDir(e.target.value))}
            placeholder="Choose output folder…"
            className="rounded-xl flex-1 font-mono text-xs"
          />
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl shrink-0"
            onClick={pickOutputDir}
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Browse
          </Button>
        </div>
      </Card>

      {/* Output File Name */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <h3 className="text-sm font-semibold">Output File Name</h3>
        <div className="flex items-center gap-2">
          <FileOutput className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={outputName}
            onChange={(e) => dispatch(setOutputName(e.target.value))}
            placeholder="output"
            className="rounded-xl font-mono text-sm"
          />
          <span className="text-muted-foreground text-sm font-mono shrink-0">
            .{format === "custom" ? "???" : format}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Extension is added automatically from the format selection below.
        </p>
      </Card>

      {/* Format */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <h3 className="text-sm font-semibold">Container Format</h3>
        <Select
          value={format}
          onValueChange={(v) =>
            dispatch(setFormat(v as "mp4" | "webm" | "gif" | "custom"))
          }
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>
    </div>
  );
}
