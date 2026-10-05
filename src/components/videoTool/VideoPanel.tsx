"use client";

import React from "react";
import { Video, Cpu, Gauge, Globe, Sliders } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectVideoSettings,
  selectResolvedVideoCodec,
} from "@/store/videoTool/selectors";
import { updateVideoSettings } from "@/store/videoTool/videoSlice";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoCodec, Preset } from "@/store/videoTool/types";
import { getAllowedVideoCodecs } from "@/store/videoTool/codecRules";

export default function VideoPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const resolvedCodecInfo = useAppSelector(selectResolvedVideoCodec);
  const capabilities = useAppSelector((state) => state.tools.capabilities);

  const video = settings.video;
  const isGif = settings.output.format === "gif";
  const allowedCodecs = getAllowedVideoCodecs(settings.output.format);

  const codecOptions: { id: VideoCodec; label: string; desc: string }[] = [
    { id: "libx264", label: "H.264 (libx264)", desc: "Maximum compatibility" },
    { id: "libx265", label: "H.265 (libx265)", desc: "High efficiency" },
    { id: "libvpx-vp9", label: "VP9 (libvpx-vp9)", desc: "Open standard for WebM" },
    { id: "libaom-av1", label: "AV1 (libaom-av1)", desc: "Next-gen compression" },
    { id: "copy", label: "Stream Copy", desc: "Pass-through without re-encoding" },
  ];

  const presetOptions: Preset[] = [
    "ultrafast",
    "superfast",
    "veryfast",
    "faster",
    "fast",
    "medium",
    "slow",
    "slower",
    "veryslow",
  ];

  const resolutionOptions: { label: string; value: number | null }[] = [
    { label: "Original", value: null },
    { label: "2160p (4K)", value: 2160 },
    { label: "1440p (2K)", value: 1440 },
    { label: "1080p (Full HD)", value: 1080 },
    { label: "720p (HD)", value: 720 },
    { label: "480p (SD)", value: 480 },
  ];

  const fpsOptions: { label: string; value: number | null }[] = [
    { label: "Original", value: null },
    { label: "60 FPS", value: 60 },
    { label: "30 FPS", value: 30 },
    { label: "24 FPS", value: 24 },
    { label: "15 FPS", value: 15 },
  ];

  if (isGif) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-zinc-200">
            GIF Pipeline Settings
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Canvas Width (px)</Label>
            <Input
              type="number"
              value={settings.gif.width}
              onChange={(e) =>
                dispatch(
                  updateVideoSettings({
                    // @ts-expect-error gif update in slice
                    gif: {
                      ...settings.gif,
                      width: parseInt(e.target.value, 10) || 480,
                    },
                  })
                )
              }
              className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Frame Rate (FPS)</Label>
            <Input
              type="number"
              value={settings.gif.fps}
              onChange={(e) =>
                dispatch(
                  updateVideoSettings({
                    // @ts-expect-error gif update in slice
                    gif: {
                      ...settings.gif,
                      fps: parseInt(e.target.value, 10) || 15,
                    },
                  })
                )
              }
              className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-zinc-200">
            Video Processing
          </Label>
        </div>
        <Switch
          checked={video.enabled}
          onCheckedChange={(enabled) =>
            dispatch(updateVideoSettings({ enabled }))
          }
        />
      </div>

      {video.enabled && (
        <div className="space-y-4 pt-1 border-t border-zinc-800/60 font-mono text-xs">
          {/* Codec Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-zinc-400">Video Codec</Label>
              {resolvedCodecInfo.adjusted && (
                <span className="text-[10px] bg-amber-950/40 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded font-mono">
                  Adjusted to {resolvedCodecInfo.codec} for {settings.output.format.toUpperCase()}
                </span>
              )}
            </div>

            <Select
              value={video.codec}
              onValueChange={(val) => {
                if (val) {
                  dispatch(updateVideoSettings({ codec: val as VideoCodec }));
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Select codec" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-xs font-mono">
                {codecOptions.map((opt) => {
                  const isAllowed = allowedCodecs.includes(opt.id);
                  const isSupported =
                    opt.id === "copy" ||
                    capabilities.videoEncoders.length === 0 ||
                    capabilities.videoEncoders.includes(opt.id);

                  return (
                    <SelectItem
                      key={opt.id}
                      value={opt.id}
                      disabled={!isAllowed || !isSupported}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span>{opt.label}</span>
                        {!isSupported ? (
                          <span className="text-[10px] text-red-400">(Unavailable in FFmpeg)</span>
                        ) : !isAllowed ? (
                          <span className="text-[10px] text-zinc-500">(Incompatible container)</span>
                        ) : null}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {video.codec !== "copy" && (
            <>
              {/* Rate Control Mode (CRF vs Target Bitrate) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                    <Label className="text-[11px] text-zinc-400">Rate Control</Label>
                  </div>
                  <div className="flex gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                    <Button
                      type="button"
                      variant={video.rateControl === "crf" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => dispatch(updateVideoSettings({ rateControl: "crf" }))}
                      className="h-6 text-[10px] px-2 font-mono"
                    >
                      CRF (Quality)
                    </Button>
                    <Button
                      type="button"
                      variant={video.rateControl === "bitrate" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => dispatch(updateVideoSettings({ rateControl: "bitrate" }))}
                      className="h-6 text-[10px] px-2 font-mono"
                    >
                      Target Bitrate
                    </Button>
                  </div>
                </div>

                {video.rateControl === "crf" ? (
                  <div className="space-y-1.5 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/60">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span>CRF Factor</span>
                      <span className="text-primary font-bold">{video.crf}</span>
                    </div>
                    <Slider
                      value={[video.crf]}
                      min={0}
                      max={video.codec === "libvpx-vp9" || video.codec === "libaom-av1" ? 63 : 51}
                      step={1}
                      onValueChange={(val) => {
                        const n = Array.isArray(val) ? val[0] : Number(val);
                        dispatch(updateVideoSettings({ crf: n }));
                      }}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-sans">
                      <span>Lossless (0)</span>
                      <span>Balanced (~23)</span>
                      <span>High Compression</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/60">
                    <Label className="text-[11px] text-zinc-400">Video Target Bitrate</Label>
                    <Input
                      value={video.bitrate}
                      onChange={(e) =>
                        dispatch(updateVideoSettings({ bitrate: e.target.value }))
                      }
                      placeholder="4M or 4000k"
                      className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
                    />
                  </div>
                )}
              </div>

              {/* Speed / Preset / CPU Used */}
              {video.codec === "libx264" || video.codec === "libx265" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                    <Label className="text-[11px] text-zinc-400">Encoder Preset (Speed / Efficiency)</Label>
                  </div>
                  <Select
                    value={video.preset}
                    onValueChange={(val) => {
                      if (val) {
                        dispatch(updateVideoSettings({ preset: val as Preset }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-xs font-mono">
                      {presetOptions.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                      <Label className="text-[11px] text-zinc-400">CPU Usage Level (cpu-used)</Label>
                    </div>
                    <span className="text-primary font-bold">{video.cpuUsed}</span>
                  </div>
                  <Slider
                    value={[video.cpuUsed]}
                    min={0}
                    max={video.codec === "libaom-av1" ? 8 : 5}
                    step={1}
                    onValueChange={(val) => {
                      const n = Array.isArray(val) ? val[0] : Number(val);
                      dispatch(updateVideoSettings({ cpuUsed: n }));
                    }}
                    className="py-1"
                  />
                </div>
              )}

              {/* Resolution & FPS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-zinc-400">Resolution Scale</Label>
                  <Select
                    value={video.resolutionHeight === null ? "original" : video.resolutionHeight.toString()}
                    onValueChange={(val) => {
                      if (val) {
                        dispatch(
                          updateVideoSettings({
                            resolutionHeight: val === "original" ? null : parseInt(val, 10),
                          })
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-xs font-mono">
                      {resolutionOptions.map((opt) => (
                        <SelectItem
                          key={opt.label}
                          value={opt.value === null ? "original" : opt.value.toString()}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-zinc-400">Frame Rate Override</Label>
                  <Select
                    value={video.fps === null ? "original" : video.fps.toString()}
                    onValueChange={(val) => {
                      if (val) {
                        dispatch(
                          updateVideoSettings({
                            fps: val === "original" ? null : parseInt(val, 10),
                          })
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-xs font-mono">
                      {fpsOptions.map((opt) => (
                        <SelectItem
                          key={opt.label}
                          value={opt.value === null ? "original" : opt.value.toString()}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Web Optimized Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <div>
                    <Label className="text-xs font-semibold text-zinc-200">Web Optimization</Label>
                    <p className="text-[10px] text-zinc-500 font-sans">
                      Applies yuv420p chroma subsampling, faststart moov flags, and Apple compatibility tags.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={video.webOptimized}
                  onCheckedChange={(webOptimized) =>
                    dispatch(updateVideoSettings({ webOptimized }))
                  }
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
