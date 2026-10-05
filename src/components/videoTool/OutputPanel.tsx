"use client";

import React from "react";
import { FolderOpen, FileOutput, RotateCcw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectVideoSettings,
  selectPlannedOutputs,
} from "@/store/videoTool/selectors";
import { updateOutputSettings } from "@/store/videoTool/videoSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isTauri } from "@/lib/isTauri";
import { VideoFormat } from "@/store/videoTool/types";

export default function OutputPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const plannedOutputs = useAppSelector(selectPlannedOutputs);

  const pickFolder = async () => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          directory: true,
          multiple: false,
        });

        if (selected && typeof selected === "string") {
          dispatch(updateOutputSettings({ dir: selected }));
        }
        return;
      } catch (e) {
        console.warn("Folder picker error:", e);
      }
    }

    // Mock fallback
    dispatch(updateOutputSettings({ dir: "/mock/output" }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-200">Output Configuration</h2>
          <p className="text-xs text-zinc-400">
            Define container formats, destination directories, and naming patterns.
          </p>
        </div>
      </div>

      {/* Container Format */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-zinc-300">Container Format</Label>
        <RadioGroup
          value={settings.output.format}
          onValueChange={(val) =>
            dispatch(updateOutputSettings({ format: val as VideoFormat }))
          }
          className="grid grid-cols-4 gap-2"
        >
          {[
            { id: "mp4", label: "MP4", desc: "Universal web/mobile" },
            { id: "webm", label: "WebM", desc: "Modern web delivery" },
            { id: "gif", label: "GIF", desc: "Animated clip" },
            { id: "custom", label: "Custom", desc: "Custom extension" },
          ].map((item) => (
            <Label
              key={item.id}
              htmlFor={`format-${item.id}`}
              className={`flex flex-col p-2.5 rounded-xl border cursor-pointer font-mono transition-all ${
                settings.output.format === item.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs">{item.label}</span>
                <RadioGroupItem value={item.id} id={`format-${item.id}`} className="sr-only" />
              </div>
              <span className="text-[10px] text-zinc-500 font-sans">{item.desc}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {settings.output.format === "custom" && (
        <div className="space-y-1.5 font-mono text-xs">
          <Label className="text-[11px] text-zinc-400">Custom Container Extension</Label>
          <Input
            value={settings.output.customExt}
            onChange={(e) =>
              dispatch(updateOutputSettings({ customExt: e.target.value }))
            }
            placeholder="mkv"
            className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
          />
        </div>
      )}

      {/* Destination Folder */}
      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-zinc-400">Destination Directory</Label>
          {settings.output.dir && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch(updateOutputSettings({ dir: null }))}
              className="h-5 px-1.5 text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset to source folder
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            readOnly
            value={settings.output.dir || "(Same folder as each input file)"}
            className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-300"
          />
          <Button
            size="sm"
            onClick={pickFolder}
            className="h-8 px-3 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" /> Browse
          </Button>
        </div>
      </div>

      {/* Name Template & Collision Policy */}
      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-400">Filename Template</Label>
          <Input
            value={settings.output.nameTemplate}
            onChange={(e) =>
              dispatch(updateOutputSettings({ nameTemplate: e.target.value }))
            }
            placeholder="{name}_nightshift"
            className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
          />
          <p className="text-[10px] text-zinc-500 font-sans">
            Use <code className="text-primary font-mono">{`{name}`}</code> for original base name.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-400">Collision Policy</Label>
          <RadioGroup
            value={settings.output.collision}
            onValueChange={(val) =>
              dispatch(updateOutputSettings({ collision: val as "suffix" | "overwrite" }))
            }
            className="grid grid-cols-2 gap-2 pt-0.5"
          >
            {[
              { id: "suffix", label: "Auto-Suffix", desc: "_1, _2 if exists" },
              { id: "overwrite", label: "Overwrite", desc: "Replace existing" },
            ].map((item) => (
              <Label
                key={item.id}
                htmlFor={`collision-${item.id}`}
                className={`flex flex-col p-2 rounded-lg border cursor-pointer font-mono transition-all ${
                  settings.output.collision === item.id
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px]">{item.label}</span>
                  <RadioGroupItem value={item.id} id={`collision-${item.id}`} className="sr-only" />
                </div>
                <span className="text-[9px] text-zinc-500 font-sans">{item.desc}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Resolved Output Preview */}
      {plannedOutputs.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-zinc-800/60 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <FileOutput className="w-3.5 h-3.5 text-primary" />
            <span>Planned Output Preview:</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {plannedOutputs.map((p, idx) => (
              <div
                key={idx}
                className="text-[11px] bg-zinc-900/80 px-2.5 py-1.5 rounded border border-zinc-800/80 text-zinc-300 truncate"
              >
                {p.output}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
