"use client";

import { useCallback, useEffect, useRef } from "react";
import { Trash2, UploadCloud, RotateCcw, Video, FileAudio, Clock, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addInputFiles,
  removeInputFile,
  clearInputFiles,
  setProbe,
} from "@/store/videoTool/videoSlice";
import { selectVideoState } from "@/store/videoTool/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getExecutor, ProbeResult } from "@/lib/executor";
import { isTauri } from "@/lib/isTauri";
import { ProbeSummary } from "@/store/videoTool/types";

const MEDIA_EXTENSIONS = [
  "mp4", "mov", "mkv", "webm", "avi", "flv", "wmv", "m4v",
  "mp3", "wav", "aac", "flac", "ogg", "m4a",
  "png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp",
];

function isMediaFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MEDIA_EXTENSIONS.includes(ext);
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

function parseFraction(str: string): number | null {
  if (!str) return null;
  if (str.includes("/")) {
    const [num, den] = str.split("/").map(Number);
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return num / den;
    }
  }
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function extractProbeSummary(res: ProbeResult): ProbeSummary {
  const vStream = res.streams?.find((s) => s.codec_type === "video");
  const aStream = res.streams?.find((s) => s.codec_type === "audio");
  const durationSec = res.format?.duration ? parseFloat(res.format.duration) : null;
  const fps = vStream?.avg_frame_rate ? parseFraction(vStream.avg_frame_rate) : null;

  return {
    durationMs: durationSec ? Math.round(durationSec * 1000) : null,
    width: vStream?.width || null,
    height: vStream?.height || null,
    fps: fps ? Math.round(fps * 100) / 100 : null,
    hasAudio: !!aStream,
    videoCodec: vStream?.codec_name || null,
    audioCodec: aStream?.codec_name || null,
  };
}

export default function InputPanel() {
  const dispatch = useAppDispatch();
  const { inputFiles, probes } = useAppSelector(selectVideoState);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleProbe = useCallback(
    async (paths: string[]) => {
      const executor = getExecutor();
      for (const p of paths) {
        try {
          const res = await executor.probe(p);
          const summary = extractProbeSummary(res);
          dispatch(setProbe({ path: p, probe: summary }));
        } catch (e) {
          console.warn(`Probe failed for ${p}:`, e);
        }
      }
    },
    [dispatch]
  );

  const pickFiles = async () => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          multiple: true,
          filters: [
            {
              name: "Media Files",
              extensions: MEDIA_EXTENSIONS,
            },
          ],
        });

        if (!selected) return;
        const filePaths = Array.isArray(selected) ? selected : [selected];
        dispatch(addInputFiles(filePaths));
        handleProbe(filePaths);
        return;
      } catch (e) {
        console.warn("Tauri dialog error:", e);
      }
    }

    // Browser mock fallback
    const mockFiles = [`/mock/videos/sample_${Date.now()}.mp4`];
    dispatch(addInputFiles(mockFiles));
    handleProbe(mockFiles);
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    if (isTauri()) {
      import("@tauri-apps/api/webview").then(({ getCurrentWebview }) => {
        getCurrentWebview()
          .onDragDropEvent((event) => {
            if (event.payload.type === "enter" || event.payload.type === "over") {
              dropZoneRef.current?.classList.add("border-primary", "bg-primary/5");
            } else if (event.payload.type === "leave") {
              dropZoneRef.current?.classList.remove("border-primary", "bg-primary/5");
            } else if (event.payload.type === "drop") {
              dropZoneRef.current?.classList.remove("border-primary", "bg-primary/5");
              const mediaFiles = (event.payload.paths || []).filter(isMediaFile);
              if (mediaFiles.length > 0) {
                dispatch(addInputFiles(mediaFiles));
                handleProbe(mediaFiles);
              }
            }
          })
          .then((fn) => {
            unlisten = fn;
          })
          .catch((e) => console.warn("Failed to attach drag-drop listener:", e));
      });
    }

    return () => {
      unlisten?.();
    };
  }, [dispatch, handleProbe]);

  return (
    <div className="space-y-4 bg-background">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary-foreground">Source Files</h2>
          <p className="text-xs text-muted-foreground">
            Drag & drop or select video files to transcode.
          </p>
        </div>
        {inputFiles.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(clearInputFiles())}
            className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear Queue
          </Button>
        )}
      </div>

      <div
        ref={dropZoneRef}
        onClick={pickFiles}
        className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:border-primary/60 hover:bg-muted/40 cursor-pointer transition-all duration-200"
      >
        <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all">
          <UploadCloud className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-foreground mt-2.5">
          Drop media files here or click to browse
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
          Supports MP4, MOV, WebM, MKV, GIF, etc.
        </p>
      </div>

      {inputFiles.length > 0 && (
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>QUEUED FILES ({inputFiles.length})</span>
            <span>METADATA</span>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {inputFiles.map((path, idx) => {
              const probe = probes[path];
              return (
                <div
                  key={path}
                  className="flex items-center justify-between p-2.5 bg-muted/60 border border-border/80 rounded-lg hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Film className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-medium text-foreground truncate">
                        {basename(path)}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{path}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {probe ? (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {probe.width && probe.height && (
                          <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                            <Video className="w-3 h-3 text-muted-foreground" />
                            {probe.width}x{probe.height}
                          </span>
                        )}
                        {probe.durationMs != null && (
                          <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {(probe.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        {!probe.hasAudio && (
                          <span className="flex items-center gap-1 text-accent-foreground/80 bg-accent/10 px-1.5 py-0.5 rounded">
                            <FileAudio className="w-3 h-3" /> No Audio
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Probing...</span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(removeInputFile(idx));
                      }}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
