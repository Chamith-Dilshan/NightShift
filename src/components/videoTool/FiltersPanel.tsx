"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  setGrayscale,
  setBlur,
  setSharpen,
  setSaturation,
  resetFilters,
} from "@/store/videoTool/videoSlice";
import { RotateCcw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  formatValue?: (v: number) => string;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  leftLabel,
  rightLabel,
  formatValue,
}: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded-lg">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

export default function FiltersPanel() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.videoTool.filters);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">✨ Filters</h2>
          <p className="text-sm text-muted-foreground">
            Apply visual filters — mapped to FFmpeg&apos;s{" "}
            <code className="text-xs bg-muted px-1 rounded">-vf</code> filter chain.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => dispatch(resetFilters())}
          title="Reset Filters"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset
        </Button>
      </div>

      {/* Grayscale */}
      <Card className="p-4 rounded-2xl border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Grayscale</p>
            <p className="text-xs text-muted-foreground">
              Removes all color — uses{" "}
              <code className="bg-muted px-1 rounded">hue=s=0</code>
            </p>
          </div>
          <Switch
            checked={filters.grayscale}
            onCheckedChange={(v) => dispatch(setGrayscale(v))}
          />
        </div>
      </Card>

      {/* Blur */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <p className="text-xs text-muted-foreground font-mono">
          gblur=sigma={filters.blur === 0 ? "(disabled)" : filters.blur}
        </p>
        <SliderRow
          label="Gaussian Blur"
          value={filters.blur}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => dispatch(setBlur(v))}
          leftLabel="0 — Off"
          rightLabel="20 — Heavy"
        />
      </Card>

      {/* Sharpen */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <p className="text-xs text-muted-foreground font-mono">
          unsharp=5:5:{filters.sharpen === 0 ? "(disabled)" : filters.sharpen}
        </p>
        <SliderRow
          label="Sharpen"
          value={filters.sharpen}
          min={0}
          max={10}
          step={0.5}
          onChange={(v) => dispatch(setSharpen(v))}
          leftLabel="0 — Off"
          rightLabel="10 — Max"
        />
      </Card>

      {/* Saturation */}
      <Card className="p-4 rounded-2xl border space-y-3">
        <p className="text-xs text-muted-foreground font-mono">
          eq=saturation={filters.saturation}
        </p>
        <SliderRow
          label="Saturation"
          value={filters.saturation}
          min={0}
          max={3}
          step={0.1}
          onChange={(v) => dispatch(setSaturation(Math.round(v * 10) / 10))}
          leftLabel="0 — Grayscale"
          rightLabel="3 — Vivid"
          formatValue={(v) => v.toFixed(1)}
        />
      </Card>
    </div>
  );
}
