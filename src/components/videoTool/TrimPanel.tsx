"use client";

import React from "react";
import { Scissors, Clock } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectVideoSettings,
  selectInputFiles,
  selectProbes,
} from "@/store/videoTool/selectors";
import { updateTrimSettings } from "@/store/videoTool/videoSlice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function TrimPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const inputFiles = useAppSelector(selectInputFiles);
  const probes = useAppSelector(selectProbes);

  const isMultipleInputs = inputFiles.length > 1;
  const firstInput = inputFiles[0];
  const probe = firstInput ? probes[firstInput] : null;
  const durationSec = probe?.durationMs ? probe.durationMs / 1000 : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">
            Trim Clip
          </Label>
        </div>
        <Switch
          checked={settings.trim.enabled}
          disabled={isMultipleInputs}
          onCheckedChange={(enabled) =>
            dispatch(updateTrimSettings({ enabled }))
          }
        />
      </div>

      {isMultipleInputs && (
        <p className="text-xs text-accent-foreground/90 font-mono">
          Trim is disabled when multiple files are in the batch.
        </p>
      )}

      {settings.trim.enabled && (
        <div className="space-y-3 pt-1 border-t border-border/60 font-mono text-xs">
          {durationSec != null && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Source Duration: {durationSec.toFixed(2)}s</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Start Time</Label>
              <Input
                value={settings.trim.start}
                onChange={(e) =>
                  dispatch(updateTrimSettings({ start: e.target.value }))
                }
                placeholder="0 or 00:00:00"
                className="h-8 text-xs font-mono bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">End Time</Label>
              <Input
                value={settings.trim.end}
                onChange={(e) =>
                  dispatch(updateTrimSettings({ end: e.target.value }))
                }
                placeholder="10 or 00:00:10"
                className="h-8 text-xs font-mono bg-muted border-border"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Accepts seconds (e.g. 5.5) or timestamp formats (HH:MM:SS.mmm).
          </p>
        </div>
      )}
    </div>
  );
}
