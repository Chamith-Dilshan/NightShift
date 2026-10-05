"use client";

import React from "react";
import { Crop, Maximize2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectVideoSettings,
  selectInputFiles,
  selectProbes,
} from "@/store/videoTool/selectors";
import { updateCropSettings } from "@/store/videoTool/videoSlice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function CropPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const inputFiles = useAppSelector(selectInputFiles);
  const probes = useAppSelector(selectProbes);

  const firstInput = inputFiles[0];
  const probe = firstInput ? probes[firstInput] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crop className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-zinc-200">
            Crop Canvas
          </Label>
        </div>
        <Switch
          checked={settings.crop.enabled}
          onCheckedChange={(enabled) =>
            dispatch(updateCropSettings({ enabled }))
          }
        />
      </div>

      {settings.crop.enabled && (
        <div className="space-y-3 pt-1 border-t border-zinc-800/60 font-mono text-xs">
          {probe?.width && probe?.height && (
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <Maximize2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                Source Size: {probe.width} × {probe.height} px
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">Width (px)</Label>
              <Input
                type="number"
                value={settings.crop.width || ""}
                onChange={(e) =>
                  dispatch(
                    updateCropSettings({
                      width: parseInt(e.target.value, 10) || 0,
                    })
                  )
                }
                placeholder="1280"
                className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">Height (px)</Label>
              <Input
                type="number"
                value={settings.crop.height || ""}
                onChange={(e) =>
                  dispatch(
                    updateCropSettings({
                      height: parseInt(e.target.value, 10) || 0,
                    })
                  )
                }
                placeholder="720"
                className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">
                X Offset (Empty = Center)
              </Label>
              <Input
                type="number"
                value={settings.crop.x ?? ""}
                onChange={(e) =>
                  dispatch(
                    updateCropSettings({
                      x: e.target.value === "" ? null : parseInt(e.target.value, 10),
                    })
                  )
                }
                placeholder="Auto (Centered)"
                className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">
                Y Offset (Empty = Center)
              </Label>
              <Input
                type="number"
                value={settings.crop.y ?? ""}
                onChange={(e) =>
                  dispatch(
                    updateCropSettings({
                      y: e.target.value === "" ? null : parseInt(e.target.value, 10),
                    })
                  )
                }
                placeholder="Auto (Centered)"
                className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
