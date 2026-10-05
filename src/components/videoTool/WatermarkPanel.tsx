"use client";

import React from "react";
import { ImageIcon, FolderOpen, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectVideoSettings } from "@/store/videoTool/selectors";
import { updateWatermarkSettings } from "@/store/videoTool/videoSlice";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTauri } from "@/lib/isTauri";
import { WatermarkAnchor } from "@/store/videoTool/types";

export default function WatermarkPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const watermark = settings.watermark;

  const pickWatermark = async () => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          multiple: false,
          filters: [
            {
              name: "Image Files",
              extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
            },
          ],
        });

        if (selected && typeof selected === "string") {
          dispatch(
            updateWatermarkSettings({
              enabled: true,
              filePath: selected,
            })
          );
        }
        return;
      } catch (e) {
        console.warn("Watermark dialog error:", e);
      }
    }

    // Mock fallback
    dispatch(
      updateWatermarkSettings({
        enabled: true,
        filePath: "/mock/images/watermark.png",
      })
    );
  };

  const anchors: { id: WatermarkAnchor; label: string }[] = [
    { id: "tl", label: "TL" },
    { id: "tc", label: "TC" },
    { id: "tr", label: "TR" },
    { id: "ml", label: "ML" },
    { id: "mc", label: "C" },
    { id: "mr", label: "MR" },
    { id: "bl", label: "BL" },
    { id: "bc", label: "BC" },
    { id: "br", label: "BR" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">
            Watermark Overlay
          </Label>
        </div>
        <Switch
          checked={watermark.enabled}
          onCheckedChange={(enabled) =>
            dispatch(updateWatermarkSettings({ enabled }))
          }
        />
      </div>

      {watermark.enabled && (
        <div className="space-y-4 pt-1 border-t border-border/60 font-mono text-xs">
          {/* File Picker */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Watermark Image</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={watermark.filePath || "No image selected"}
                className="h-8 text-xs font-mono bg-muted border-border text-foreground"
              />
              <Button
                size="sm"
                onClick={pickWatermark}
                className="h-8 px-3 text-xs bg-muted hover:bg-muted-foreground/20 text-foreground shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5 mr-1" /> Browse
              </Button>
              {watermark.filePath && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    dispatch(updateWatermarkSettings({ filePath: null }))
                  }
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 9-Point Anchor Grid & Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Anchor Position</Label>
              <div className="grid grid-cols-3 gap-1.5 max-w-[150px]">
                {anchors.map((a) => (
                  <Button
                    key={a.id}
                    type="button"
                    variant={watermark.anchor === a.id ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      dispatch(updateWatermarkSettings({ anchor: a.id }))
                    }
                    className="h-7 text-[10px] font-mono px-1"
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Margin</span>
                  <span className="text-primary font-bold">{watermark.margin}px</span>
                </div>
                <Slider
                  value={[watermark.margin]}
                  min={0}
                  max={100}
                  step={2}
                  onValueChange={(val) => {
                    const n = Array.isArray(val) ? val[0] : Number(val);
                    dispatch(updateWatermarkSettings({ margin: n }));
                  }}
                  className="py-1"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Opacity</span>
                  <span className="text-primary font-bold">
                    {Math.round(watermark.opacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[watermark.opacity * 100]}
                  min={10}
                  max={100}
                  step={5}
                  onValueChange={(val) => {
                    const n = Array.isArray(val) ? val[0] : Number(val);
                    dispatch(updateWatermarkSettings({ opacity: n / 100 }));
                  }}
                  className="py-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
