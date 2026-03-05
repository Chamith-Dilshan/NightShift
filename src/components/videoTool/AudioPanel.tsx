"use client";

import { Card } from "@/components/ui/card";
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
  setAudioEnabled,
  setAudioCodec,
  setAudioBitrate,
  setAudioChannels,
  resetAudio,
} from "@/store/videoTool/videoSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const AUDIO_CODECS = [
  { value: "aac", label: "AAC — Standard (mp4/m4a)" },
  { value: "mp3", label: "MP3 — Universal" },
  { value: "opus", label: "Opus — Best quality/size (webm)" },
  { value: "flac", label: "FLAC — Lossless" },
  { value: "copy", label: "Copy — No re-encode" },
];

const BITRATES = ["64k", "96k", "128k", "160k", "192k", "256k", "320k"];

const CHANNELS = [
  { value: 1, label: "1 — Mono" },
  { value: 2, label: "2 — Stereo" },
  { value: 6, label: "6 — 5.1 Surround" },
];

export default function AudioPanel() {
  const dispatch = useAppDispatch();
  const audio = useAppSelector((s) => s.videoTool.audio);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">🔊 Audio Settings</h2>
          <p className="text-sm text-muted-foreground">
            Audio codec, bitrate, and channel configuration.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => dispatch(resetAudio())}
            title="Reset Audio"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
          <div className="flex items-center gap-2 border-l pl-3 border-border hidden sm:flex">
            <span className="text-sm text-muted-foreground">
              {audio.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={audio.enabled}
              onCheckedChange={(v) => dispatch(setAudioEnabled(v))}
            />
          </div>
        </div>
      </div>

      <div className={audio.enabled ? "" : "opacity-40 pointer-events-none"}>
        {/* Codec */}
        <Card className="p-4 rounded-2xl border space-y-3 mb-4">
          <h3 className="text-sm font-semibold">Audio Codec</h3>
          <Select
            value={audio.codec}
            onValueChange={(v) => dispatch(setAudioCodec(v))}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIO_CODECS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Bitrate + Channels */}
        <Card className="p-4 rounded-2xl border space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Bitrate</h3>
            <Select
              value={audio.bitrate}
              onValueChange={(v) => dispatch(setAudioBitrate(v))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BITRATES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                    {b === "128k" ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Channels</h3>
            <Select
              value={String(audio.channels)}
              onValueChange={(v) => dispatch(setAudioChannels(Number(v)))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={String(c.value)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>
    </div>
  );
}
