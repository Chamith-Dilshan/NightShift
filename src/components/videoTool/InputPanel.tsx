"use client";

import { useCallback, useEffect, useRef } from "react";

import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { Trash2, UploadCloud, FolderOpen, RotateCcw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  addInputFiles,
  removeInputFile,
  removeAllInputFiles,
  resetInput,
} from "@/store/videoTool/videoSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

// Supported media extensions for filtering
const MEDIA_EXTENSIONS = [
  "mp4", "mov", "mkv", "webm", "avi", "flv", "wmv",
  "mp3", "wav", "aac", "flac", "ogg",
  "png", "jpg", "jpeg", "gif", "bmp", "tiff",
];

function isMediaFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MEDIA_EXTENSIONS.includes(ext);
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

export default function InputPanel() {
  const dispatch = useAppDispatch();
  const inputFiles = useAppSelector((state) => state.videoTool.inputFiles);

  /* ===============================
     TAURI V2 FILE PICKER
  =============================== */
  const pickFiles = async () => {
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
  };

  /* ===============================
     TAURI V2 DRAG & DROP
     Uses native window events (real OS paths, not blob URLs)
     Requires Rust: lib.rs forwards WindowEvent::DragDrop → "file-drop"
  =============================== */
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<string[]>("file-drop", (event) => {
      const mediaFiles = event.payload.filter(isMediaFile);
      if (mediaFiles.length > 0) {
        dispatch(addInputFiles(mediaFiles));
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [dispatch]);

  /* ===============================
     DRAG-OVER VISUAL
  =============================== */
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add("border-primary");
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("border-primary");
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Visual-only drop (actual paths come via Tauri event)
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("border-primary");
  }, []);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">📂 Input Files</h2>
          <p className="text-sm text-muted-foreground">
            Add videos, audio, or images. Drag & drop or use the file browser.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => dispatch(resetInput())}
          title="Reset Input"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset
        </Button>
      </div>

      {/* Drop Zone */}
      <Card
        ref={dropZoneRef}
        onClick={pickFiles}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="
          p-8 rounded-2xl border-2 border-dashed
          flex flex-col items-center justify-center gap-3
          cursor-pointer select-none
          transition-colors duration-150
          hover:border-primary
        "
      >
        <UploadCloud className="w-10 h-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Drag & drop files here</p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse — mp4, mov, mkv, mp3, wav, png, jpg…
          </p>
        </div>
        <Button size="sm" className="rounded-xl mt-1" onClick={(e) => { e.stopPropagation(); pickFiles(); }}>
          <FolderOpen className="w-4 h-4 mr-2" />
          Browse Files
        </Button>
      </Card>

      {/* File List */}
      {inputFiles.length > 0 && (
        <Card className="p-4 rounded-2xl border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Selected Files ({inputFiles.length})
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-destructive h-auto py-1"
              onClick={() => dispatch(removeAllInputFiles())}
            >
              Clear All
            </Button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
            {inputFiles.map((file: string) => (
              <div
                key={file}
                className="
                  flex items-center justify-between
                  px-3 py-2 rounded-xl
                  bg-muted text-sm gap-2
                "
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium text-xs">{basename(file)}</span>
                  <span className="truncate text-xs text-muted-foreground">{file}</span>
                </div>

                <button
                  onClick={() => dispatch(removeInputFile(file))}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
