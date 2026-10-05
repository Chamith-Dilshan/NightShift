"use client";

import React from "react";
import { KeyRound } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectVideoSettings } from "@/store/videoTool/selectors";
import { updateVideoSettings } from "@/store/videoTool/videoSlice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function KeyframePanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const keyframe = settings.video.keyframe;

  const quickIntervals = [
    { label: "1 (All-Intra)", value: 1, desc: "Best for scroll/scrubbing" },
    { label: "12", value: 12 },
    { label: "24", value: 24 },
    { label: "30", value: 30 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-zinc-200">
            Keyframe Interval (GOP)
          </Label>
        </div>
        <Switch
          checked={keyframe.enabled}
          onCheckedChange={(enabled) =>
            dispatch(
              updateVideoSettings({
                keyframe: { ...keyframe, enabled },
              })
            )
          }
        />
      </div>

      {keyframe.enabled && (
        <div className="space-y-3 pt-1 border-t border-zinc-800/60 font-mono text-xs">
          <div className="flex flex-wrap gap-1.5">
            {quickIntervals.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={keyframe.interval === item.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  dispatch(
                    updateVideoSettings({
                      keyframe: { ...keyframe, interval: item.value },
                    })
                  )
                }
                className="h-7 text-[11px] font-mono px-2.5"
                title={item.desc}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <Label className="text-[11px] text-zinc-400">
              Custom Interval (Frames)
            </Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={keyframe.interval || ""}
              onChange={(e) =>
                dispatch(
                  updateVideoSettings({
                    keyframe: {
                      ...keyframe,
                      interval: parseInt(e.target.value, 10) || 1,
                    },
                  })
                )
              }
              className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
            />
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            1 = All-Intra (every frame is a keyframe, optimal for scrubbing on web canvases).
          </p>
        </div>
      )}
    </div>
  );
}
