"use client";

import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectVideoSettings,
  selectResolvedAudioCodec,
} from "@/store/videoTool/selectors";
import { updateAudioSettings } from "@/store/videoTool/videoSlice";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudioCodec } from "@/store/videoTool/types";
import { getAllowedAudioCodecs } from "@/store/videoTool/codecRules";

export default function AudioPanel() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const resolvedCodecInfo = useAppSelector(selectResolvedAudioCodec);
  const capabilities = useAppSelector((state) => state.tools.capabilities);

  const audio = settings.audio;
  const isGif = settings.output.format === "gif";
  const allowedCodecs = getAllowedAudioCodecs(settings.output.format);

  const codecOptions: { id: AudioCodec; label: string }[] = [
    { id: "aac", label: "AAC (Standard Web)" },
    { id: "libopus", label: "Opus (High Quality WebM)" },
    { id: "libmp3lame", label: "MP3 (Legacy)" },
    { id: "flac", label: "FLAC (Lossless)" },
    { id: "copy", label: "Stream Copy (Pass-Through)" },
  ];

  const bitrateOptions = ["64k", "96k", "128k", "160k", "192k", "256k", "320k"];

  const channelOptions: { label: string; value: 1 | 2 | 6 }[] = [
    { label: "Mono (1 channel)", value: 1 },
    { label: "Stereo (2 channels)", value: 2 },
    { label: "5.1 Surround (6 channels)", value: 6 },
  ];

  if (isGif) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <VolumeX className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-semibold text-muted-foreground">Audio Processing</Label>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Audio tracks are automatically excluded for GIF container exports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {audio.enabled ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          )}
          <Label className="text-sm font-semibold text-foreground">
            Audio Track
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {audio.enabled ? "Enabled" : "Remove Audio"}
          </span>
          <Switch
            checked={audio.enabled}
            onCheckedChange={(enabled) =>
              dispatch(updateAudioSettings({ enabled }))
            }
          />
        </div>
      </div>

      {audio.enabled && (
        <div className="space-y-4 pt-1 border-t border-border/60 font-mono text-xs">
          {/* Audio Codec Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">Audio Codec</Label>
              {resolvedCodecInfo.adjusted && (
                <span className="text-[10px] bg-accent/10 text-accent-foreground border border-accent/40 px-2 py-0.5 rounded font-mono">
                  Adjusted to {resolvedCodecInfo.codec} for {settings.output.format.toUpperCase()}
                </span>
              )}
            </div>

            <Select
              value={audio.codec}
              onValueChange={(val) => {
                if (val) {
                  dispatch(updateAudioSettings({ codec: val as AudioCodec }));
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs font-mono bg-muted border-border">
                <SelectValue placeholder="Select codec" />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border text-xs font-mono">
                {codecOptions.map((opt) => {
                  const isAllowed = allowedCodecs.includes(opt.id);
                  const isSupported =
                    opt.id === "copy" ||
                    capabilities.audioEncoders.length === 0 ||
                    capabilities.audioEncoders.includes(opt.id);

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
                          <span className="text-[10px] text-destructive">(Unavailable)</span>
                        ) : !isAllowed ? (
                          <span className="text-[10px] text-muted-foreground">(Incompatible container)</span>
                        ) : null}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {audio.codec !== "copy" && (
            <div className="grid grid-cols-2 gap-3">
              {audio.codec !== "flac" && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Audio Bitrate</Label>
                  <Select
                    value={audio.bitrate}
                    onValueChange={(bitrate) => {
                      if (bitrate) {
                        dispatch(updateAudioSettings({ bitrate }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-xs font-mono">
                      {bitrateOptions.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Channel Layout</Label>
                <Select
                  value={audio.channels.toString()}
                  onValueChange={(val) => {
                    if (val) {
                      dispatch(
                        updateAudioSettings({
                          channels: parseInt(val, 10) as 1 | 2 | 6,
                        })
                      );
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs font-mono bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-xs font-mono">
                    {channelOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value.toString()}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
