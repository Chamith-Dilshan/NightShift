"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  setRotate,
  setFlipHorizontal,
  setFlipVertical,
  resetTransforms,
} from "@/store/videoTool/videoSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, ListRestart } from "lucide-react";

const ROTATE_OPTIONS = [
  { value: -90, label: "-90°", icon: "↺" },
  { value: 0, label: "0°", icon: "○" },
  { value: 90, label: "+90°", icon: "↻" },
  { value: 180, label: "180°", icon: "↕" },
];

export default function TransformPanel() {
  const dispatch = useAppDispatch();
  const transforms = useAppSelector((s) => s.videoTool.transforms);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">🔄 Transform</h2>
          <p className="text-sm text-muted-foreground">
            Rotate and flip — uses FFmpeg{" "}
            <code className="text-xs bg-muted px-1 rounded">transpose</code>,{" "}
            <code className="text-xs bg-muted px-1 rounded">hflip</code>,{" "}
            <code className="text-xs bg-muted px-1 rounded">vflip</code>.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => dispatch(resetTransforms())}
          title="Reset Transforms"
        >
          <ListRestart className="w-3.5 h-3.5 mr-1" />
          Reset
        </Button>
      </div>

      {/* Rotation */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Rotation</h3>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-lg">
            {transforms.rotate === 0
              ? "No rotation"
              : `transpose=${transforms.rotate === -90 ? 2 : transforms.rotate === 90 ? 1 : "2,2"}`}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {ROTATE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={transforms.rotate === opt.value ? "default" : "secondary"}
              className="rounded-xl flex flex-col h-14 gap-1"
              onClick={() => dispatch(setRotate(opt.value))}
            >
              <span className="text-base leading-none">
                {opt.value === -90 ? (
                  <RotateCcw className="w-4 h-4" />
                ) : opt.value === 90 ? (
                  <RotateCw className="w-4 h-4" />
                ) : (
                  <span>{opt.icon}</span>
                )}
              </span>
              <span className="text-xs">{opt.label}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Flip */}
      <Card className="p-4 rounded-2xl border space-y-4">
        <h3 className="text-sm font-semibold">Flip</h3>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-3">
            <FlipHorizontal className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Flip Horizontal</p>
              <p className="text-xs text-muted-foreground font-mono">hflip</p>
            </div>
          </div>
          <Switch
            checked={transforms.flipHorizontal}
            onCheckedChange={(v) => dispatch(setFlipHorizontal(v))}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <FlipVertical className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Flip Vertical</p>
              <p className="text-xs text-muted-foreground font-mono">vflip</p>
            </div>
          </div>
          <Switch
            checked={transforms.flipVertical}
            onCheckedChange={(v) => dispatch(setFlipVertical(v))}
          />
        </div>
      </Card>

      {/* Active filter preview */}
      {(transforms.rotate !== 0 || transforms.flipHorizontal || transforms.flipVertical) && (
        <Card className="p-3 rounded-2xl border border-primary/30 bg-primary/5">
          <p className="text-xs font-mono text-primary">
            -vf &quot;
            {[
              transforms.rotate === 90
                ? "transpose=1"
                : transforms.rotate === -90
                ? "transpose=2"
                : transforms.rotate === 180
                ? "transpose=2,transpose=2"
                : null,
              transforms.flipHorizontal ? "hflip" : null,
              transforms.flipVertical ? "vflip" : null,
            ]
              .filter(Boolean)
              .join(",")}
            &quot;
          </p>
        </Card>
      )}
    </div>
  );
}
