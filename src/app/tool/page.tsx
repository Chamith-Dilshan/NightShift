"use client";

import React, { useEffect, Suspense, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Play,
  Settings,
  FolderOpen,
  FileText,
  Eye,
  EyeOff,
  Wrench,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openTool, setMode, setInputs, addInputs } from "@/store/workbench/workbenchSlice";
import { fetchToolStatus } from "@/store/tools/toolsSlice";
import { SpecPanel } from "@/components/workbench/SpecPanel";
import { CommandPreview } from "@/components/workbench/CommandPreview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToolSpec } from "@/core/spec/schema";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

function ToolWorkbenchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const toolId = searchParams.get("id") ?? "ffmpeg";
  const templateId = searchParams.get("template");
  
  const session = useAppSelector((state) => state.workbench.sessions[toolId]);
  const toolStatus = useAppSelector((state) => state.tools.status);
  const [spec, setSpec] = useState<ToolSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchToolStatus());
  }, [dispatch]);

  useEffect(() => {
    // Load the spec for this tool
    const loadSpec = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to load from the specs directory
        const specPath = `/specs/${toolId}.json`;
        const response = await fetch(specPath);
        if (!response.ok) {
          setError(`Spec not found for tool: ${toolId}`);
          return;
        }
        
        const specData = await response.json();
        setSpec(specData);
        
        // Open the tool in workbench
        const firstCommand = specData.commands?.[0];
        dispatch(openTool({
          toolId,
          commandId: firstCommand?.id ?? "default",
          commandDef: firstCommand,
        }));
        
        // If templateId is provided, apply it later
        if (templateId) {
          console.log("Apply template:", templateId);
        }
      } catch (e) {
        setError(`Failed to load spec: ${e}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadSpec();
  }, [toolId, templateId, dispatch]);

  const status = toolStatus.find((t) => t.tool === toolId);
  const isInstalled = status && status.source !== "missing";

  const handleAddFiles = useCallback(() => {
    // In Tauri, this would open a file dialog
    console.log("Open file dialog for inputs");
  }, []);

  const handleRun = useCallback(() => {
    if (!session) return;
    console.log("Run job with session:", session);
  }, [session]);

  const toolStatusText = status
    ? status.source === "missing"
      ? "Not installed"
      : `${status.source} ${status.version ? `v${status.version}` : ""}`
    : "Unknown";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/80 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          </Link>
          
          <div>
            <h1 className="font-bold text-sm text-foreground">
              {spec?.name || toolId}
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              {spec?.description || "Tool workbench"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono bg-muted/50 text-muted-foreground">
            <Wrench className="w-3 h-3" />
            <span>{toolStatusText}</span>
          </div>

          <div className="w-6 h-6 text-primary flex items-center justify-center">
            <AnimatedThemeToggler variant="circle" />
          </div>

          <Link href="/settings">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono border-border hover:bg-muted text-foreground"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Settings
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Panels */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
          {/* Inputs */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Inputs</h2>
            <Card className="p-4">
              <div className="space-y-3">
                {session?.inputs.length ? (
                  <div className="space-y-1">
                    {session.inputs.map((input, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs font-mono bg-muted/30 rounded px-2 py-1"
                      >
                        <span className="truncate flex-1">{input}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            // Remove input at index i
                            const newInputs = session.inputs.filter((_, idx) => idx !== i);
                            dispatch(setInputs(newInputs));
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    No input files selected
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleAddFiles}
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  Add Files
                </Button>
              </div>
            </Card>
          </div>

          {/* Loading / Error */}
          {loading && (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              Loading spec...
            </Card>
          )}

          {error && (
            <Card className="p-6 text-center text-red-400 text-sm">
              {error}
            </Card>
          )}

          {/* Spec Panel */}
          {spec && session?.commandDef && !loading && (
            <>
              {/* Mode toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={session.mode === "params" ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => dispatch(setMode("params"))}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Parameters
                </Button>
                <Button
                  variant={session.mode === "raw" ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => dispatch(setMode("raw"))}
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Raw Command
                </Button>
              </div>

              {session.mode === "params" ? (
                <SpecPanel commandDef={session.commandDef} toolId={toolId} />
              ) : (
                <Card className="p-4">
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Raw command editor (coming soon)
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Right: Preview & Run */}
        <div className="w-96 border-l border-border bg-card/40 overflow-y-auto p-6 space-y-4">
          {/* Command Preview */}
          {spec && (
            <CommandPreview spec={spec} toolId={toolId} />
          )}

          {/* Run Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!isInstalled || !spec || loading}
            onClick={handleRun}
          >
            <Play className="w-4 h-4 mr-2" />
            {isInstalled ? "Run" : "Install tool first"}
          </Button>

          {!isInstalled && (
            <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
              <p className="text-xs text-yellow-400">
                {toolId} is not installed. Please install it from the Settings page or provide a custom path.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ToolPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      }
    >
      <ToolWorkbenchContent />
    </Suspense>
  );
}
