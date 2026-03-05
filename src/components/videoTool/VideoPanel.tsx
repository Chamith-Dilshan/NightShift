"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  setVideoEnabled,
  setVideoCodec,
  setCRF,
  setVideoPreset,
  setVideoResolution,
  setVideoFps,
  setVideoBitrate,
  resetVideo,
} from "@/store/videoTool/videoSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const VIDEO_CODECS = [
  { value: "libx264", label: "H.264 (libx264) — Best compatibility" },
  { value: "libx265", label: "H.265 (libx265) — Better compression" },
  { value: "libvpx-vp9", label: "VP9 (libvpx-vp9) — WebM/open" },
  { value: "libaom-av1", label: "AV1 (libaom-av1) — Next-gen" },
  { value: "copy", label: "Copy — No re-encode (stream copy)" },
];

const PRESETS = [
  "ultrafast", "superfast", "veryfast", "faster",
  "fast", "medium", "slow", "slower", "veryslow",
];

const RESOLUTIONS = [
  { value: "original", label: "Same as source" },
  { value: "1920:1080", label: "1080p (1920x1080)" },
  { value: "1280:720", label: "720p (1280x720)" },
  { value: "854:480", label: "480p (854x480)" },
  { value: "3840:2160", label: "4K (3840x2160)" },
];

export default function VideoPanel() {
  const dispatch = useAppDispatch();
  const video = useAppSelector((s) => s.videoTool.video);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">🎥 Video Settings</h2>
          <p className="text-sm text-muted-foreground">
            Codec, quality, resolution, and frame rate controls.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => dispatch(resetVideo())}
            title="Reset Video"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
          <div className="flex items-center gap-2 border-l pl-3 border-border hidden sm:flex">
            <span className="text-sm text-muted-foreground">
              {video.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={video.enabled}
              onCheckedChange={(v) => dispatch(setVideoEnabled(v))}
            />
          </div>
        </div>
      </div>

      <div className={video.enabled ? "" : "opacity-40 pointer-events-none"}>
        {/* Codec */}
        <Card className="p-4 rounded-2xl border space-y-3 mb-4">
          <h3 className="text-sm font-semibold">Video Codec</h3>
          <Select
            value={video.codec}
            onValueChange={(v) => dispatch(setVideoCodec(v))}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_CODECS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* CRF + Preset */}
        <Card className="p-4 rounded-2xl border space-y-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">CRF (Quality)</h3>
              <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded-lg">
                {video.crf}
              </span>
            </div>
            <Slider
              min={0}
              max={51}
              step={1}
              value={[video.crf]}
              onValueChange={([v]) => dispatch(setCRF(v))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 — Lossless</span>
              <span>23 — Default</span>
              <span>51 — Worst</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Encoding Preset</h3>
            <Select
              value={video.preset}
              onValueChange={(v) => dispatch(setVideoPreset(v))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Slower preset = better compression, more CPU time.
            </p>
          </div>
        </Card>

        {/* Resolution + FPS */}
        <Card className="p-4 rounded-2xl border space-y-4 mb-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Resolution</h3>
            <Select
              value={video.resolution || "original"}
              onValueChange={(v) => dispatch(setVideoResolution(v))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Same as source" />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-semibold">Frame Rate (FPS)</h3>
              <Input
                type="number"
                min={1}
                max={240}
                value={video.fps}
                onChange={(e) => dispatch(setVideoFps(Number(e.target.value)))}
                className="rounded-xl font-mono"
              />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-semibold">Bitrate (optional)</h3>
              <Input
                value={video.bitrate}
                onChange={(e) => dispatch(setVideoBitrate(e.target.value))}
                placeholder="e.g. 2M"
                className="rounded-xl font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use CRF mode.
              </p>
            </div>
          </div>
        </Card>

        {/* Bitrate override note */}
        {video.bitrate && (
          <Card className="p-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠ Bitrate is set — CRF will be ignored. Remove bitrate to use CRF quality mode.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
