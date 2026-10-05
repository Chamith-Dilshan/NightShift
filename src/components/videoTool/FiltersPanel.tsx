"use client";

import React from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectVideoSettings } from "@/store/videoTool/selectors";
import { updateFiltersSettings } from "@/store/videoTool/videoSlice";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export default function FiltersPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const filters = settings.filters;

  const hasActiveFilters =
    filters.grayscale ||
    filters.blur > 0 ||
    filters.sharpen > 0 ||
    filters.saturation !== 1;

  const handleReset = () => {
    dispatch(
      updateFiltersSettings({
        grayscale: false,
        blur: 0,
        sharpen: 0,
        saturation: 1,
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">
            Visual Filters
          </Label>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground font-mono"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
        )}
      </div>

      <div className="space-y-4 font-mono text-xs">
        {/* Grayscale Toggle */}
        <div className="flex items-center justify-between p-2.5 bg-muted/60 border border-border rounded-lg">
          <Label className="text-xs text-foreground font-medium">Grayscale (B&W)</Label>
          <Switch
            checked={filters.grayscale}
            onCheckedChange={(grayscale) =>
              dispatch(updateFiltersSettings({ grayscale }))
            }
          />
        </div>

        {/* Saturation Slider */}
        <div className="space-y-1.5 p-3 bg-muted/40 border border-border/80 rounded-lg">
          <div className="flex items-center justify-between text-foreground">
            <span className="text-[11px] text-muted-foreground">Color Saturation</span>
            <span className="text-primary font-bold">{filters.saturation.toFixed(1)}x</span>
          </div>
          <Slider
            value={[filters.saturation]}
            min={0}
            max={3}
            step={0.1}
            onValueChange={(val) => {
              const n = Array.isArray(val) ? val[0] : Number(val);
              dispatch(updateFiltersSettings({ saturation: n }));
            }}
            className="py-1"
          />
        </div>

        {/* Blur Slider */}
        <div className="space-y-1.5 p-3 bg-muted/40 border border-border/80 rounded-lg">
          <div className="flex items-center justify-between text-foreground">
            <span className="text-[11px] text-muted-foreground">Gaussian Blur (sigma)</span>
            <span className="text-primary font-bold">{filters.blur}</span>
          </div>
          <Slider
            value={[filters.blur]}
            min={0}
            max={20}
            step={1}
            onValueChange={(val) => {
              const n = Array.isArray(val) ? val[0] : Number(val);
              dispatch(updateFiltersSettings({ blur: n }));
            }}
            className="py-1"
          />
        </div>

        {/* Sharpen Slider */}
        <div className="space-y-1.5 p-3 bg-muted/40 border border-border/80 rounded-lg">
          <div className="flex items-center justify-between text-foreground">
            <span className="text-[11px] text-muted-foreground">Unsharp / Sharpen</span>
            <span className="text-primary font-bold">{filters.sharpen.toFixed(1)}</span>
          </div>
          <Slider
            value={[filters.sharpen]}
            min={0}
            max={5}
            step={0.5}
            onValueChange={(val) => {
              const n = Array.isArray(val) ? val[0] : Number(val);
              dispatch(updateFiltersSettings({ sharpen: n }));
            }}
            className="py-1"
          />
        </div>
      </div>
    </div>
  );
}
