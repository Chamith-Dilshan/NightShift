"use client";

import React from "react";
import { RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectVideoSettings } from "@/store/videoTool/selectors";
import { updateTransformsSettings } from "@/store/videoTool/videoSlice";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function TransformPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const transforms = settings.transforms;

  const rotations: { label: string; value: -90 | 0 | 90 | 180 }[] = [
    { label: "0° (None)", value: 0 },
    { label: "90° CW", value: 90 },
    { label: "180°", value: 180 },
    { label: "90° CCW", value: -90 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RotateCw className="w-4 h-4 text-primary" />
        <Label className="text-sm font-semibold text-zinc-200">
          Transform & Orientation
        </Label>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {/* Rotation */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-400">Rotation</Label>
          <div className="grid grid-cols-4 gap-2">
            {rotations.map((r) => (
              <Button
                key={r.value}
                type="button"
                variant={transforms.rotate === r.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  dispatch(updateTransformsSettings({ rotate: r.value }))
                }
                className="h-8 text-xs font-mono"
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Flips */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            type="button"
            variant={transforms.flipHorizontal ? "default" : "outline"}
            size="sm"
            onClick={() =>
              dispatch(
                updateTransformsSettings({
                  flipHorizontal: !transforms.flipHorizontal,
                })
              )
            }
            className="h-8 text-xs font-mono flex items-center justify-center gap-2"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Flip Horizontal</span>
          </Button>

          <Button
            type="button"
            variant={transforms.flipVertical ? "default" : "outline"}
            size="sm"
            onClick={() =>
              dispatch(
                updateTransformsSettings({
                  flipVertical: !transforms.flipVertical,
                })
              )
            }
            className="h-8 text-xs font-mono flex items-center justify-center gap-2"
          >
            <FlipVertical className="w-3.5 h-3.5" />
            <span>Flip Vertical</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
