"use client";

import { useCallback } from "react";

import { open } from "@tauri-apps/plugin-dialog";
import { Trash2, UploadCloud } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addInputFiles, removeInputFile } from "@/store/slices/videoSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/videoToolHooks";

export default function InputPanel() {
  const dispatch = useAppDispatch();
  const inputFiles = useAppSelector((state) => state.videoTool.inputFiles);

  /* ===============================
     TAURI FILE PICKER
  =============================== */
  const pickFiles = async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Media Files",
          extensions: ["mp4", "mov", "mkv", "webm", "mp3", "wav", "png", "jpg"],
        },
      ],
    });

    if (!selected) return;

    const files = Array.isArray(selected) ? selected : [selected];

    dispatch(addInputFiles(files));
  };

  /* ===============================
     DRAG & DROP SUPPORT
  =============================== */
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const files = Array.from(e.dataTransfer.files).map((f) => f.name);

      dispatch(addInputFiles(files));
    },
    [dispatch],
  );

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold">📂 Input Files</h2>
        <p className="text-sm text-muted-foreground">
          Add videos, audio, or images to process with FFmpeg.
        </p>
      </div>

      {/* Drop Zone */}
      <Card
        onClick={pickFiles}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="
          p-8 rounded-2xl border
          flex flex-col items-center justify-center gap-3
          cursor-pointer
          hover:border-brand-500-dark hover:dark:border-brand-500
          transition
        "
      >
        <UploadCloud className="w-10 h-10 text-muted-foreground" />

        <p className="text-sm text-center text-muted-foreground">
          Drag & drop files here, or click to browse (Tauri picker)
        </p>

        <Button className="w-full max-w-xs rounded-xl">Browse Files</Button>
      </Card>

      {/* File List */}
      {inputFiles.length > 0 && (
        <Card className="p-4 rounded-2xl border space-y-3">
          <h3 className="text-sm font-semibold">
            Selected Files ({inputFiles.length})
          </h3>

          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {inputFiles.map((file: string) => (
              <div
                key={file}
                className="
                  flex items-center justify-between
                  px-3 py-2 rounded-xl
                  bg-muted text-sm
                "
              >
                <span className="truncate">{file}</span>

                <button
                  onClick={() => dispatch(removeInputFile(file))}
                  className="
                    text-muted-foreground
                    hover:text-red-500
                    transition
                  "
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
