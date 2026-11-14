"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Settings,
  Wrench,
  Download,
  FolderOpen,
  Play,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchToolStatus } from "@/store/tools/toolsSlice";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { getExecutor } from "@/lib/executor";
import { isTauri } from "@/lib/isTauri";

type ToolSource = "managed" | "system" | "custom" | "missing";

interface ToolCardData {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ToolSource;
  version?: string;
  path?: string;
}

const BUNDLED_TOOLS: ToolCardData[] = [
  {
    id: "ffmpeg",
    name: "FFmpeg",
    description: "Video, audio, and GIF conversion with filters, watermark overlay, and codec control.",
    category: "video",
    status: "missing",
  },
  {
    id: "vips",
    name: "libvips",
    description: "Fast, low-memory image processing — resize, convert, and optimize images.",
    category: "image",
    status: "missing",
  },
];

function getStatusBadge(source: ToolSource) {
  switch (source) {
    case "managed":
      return {
        label: "Managed",
        className: "bg-primary/10 border-primary/50 text-primary",
        icon: CheckCircle,
      };
    case "system":
      return {
        label: "System",
        className: "bg-blue-500/10 border-blue-500/50 text-blue-400",
        icon: CheckCircle,
      };
    case "custom":
      return {
        label: "Custom",
        className: "bg-yellow-500/10 border-yellow-500/50 text-yellow-400",
        icon: FolderOpen,
      };
    case "missing":
      return {
        label: "Not installed",
        className: "bg-destructive/10 border-destructive/50 text-destructive",
        icon: XCircle,
      };
  }
}

function ToolCard({ tool }: { tool: ToolCardData }) {
  const dispatch = useAppDispatch();
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const statusBadge = getStatusBadge(tool.status);
  const StatusIcon = statusBadge.icon;

  const handleInstall = async () => {
    if (!isTauri()) {
      setInstallError("Install only available in the desktop app");
      return;
    }

    setInstalling(true);
    setInstallError(null);

    try {
      const executor = getExecutor();
      await executor.tools.install(tool.id, (event) => {
        console.log("Install event:", event.kind);
      });
      dispatch(fetchToolStatus());
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  };

  const handleCustomPath = async () => {
    if (!isTauri()) return;

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: `${tool.name} Executable`,
            extensions: ["exe", "*"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        const executor = getExecutor();
        await executor.tools.setCustomPath(tool.id, selected);
        dispatch(fetchToolStatus());
      }
    } catch (e) {
      console.warn("Custom path error:", e);
    }
  };

  return (
    <Card className="h-full bg-card/80 border border-border hover:border-primary/60 transition-all duration-200 shadow-xl rounded-2xl overflow-hidden flex flex-col">
      <CardContent className="p-6 flex-1 space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border capitalize ${statusBadge.className}`}>
            <StatusIcon className="w-3 h-3" />
            {statusBadge.label}
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground">{tool.name}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {tool.description}
          </p>
        </div>

        {tool.version && (
          <p className="text-[10px] font-mono text-muted-foreground">
            v{tool.version}
          </p>
        )}

        {installError && (
          <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
            <AlertTriangle className="w-3 h-3" />
            {installError}
          </div>
        )}
      </CardContent>

      <div className="px-6 py-3 bg-muted/40 border-t border-border/60 flex items-center gap-2">
        {tool.status !== "missing" ? (
          <>
            <Link href={`/tool?id=${tool.id}`} className="flex-1">
              <Button size="sm" className="w-full text-xs h-8">
                <Play className="w-3.5 h-3.5 mr-1" />
                Open
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border hover:bg-muted"
              onClick={handleCustomPath}
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              className="flex-1 text-xs h-8"
              disabled={installing}
              onClick={handleInstall}
            >
              {installing ? (
                <span className="animate-pulse">Installing...</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Install
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border hover:bg-muted"
              onClick={handleCustomPath}
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function ToolsCatalogPage() {
  const dispatch = useAppDispatch();
  const { status, loading } = useAppSelector((state) => state.tools);

  useEffect(() => {
    dispatch(fetchToolStatus());
  }, [dispatch]);

  // Merge bundled tools with real status
  const tools: ToolCardData[] = BUNDLED_TOOLS.map((bundled) => {
    const real = status.find((s) => s.tool === bundled.id);
    if (!real) return bundled;
    return {
      ...bundled,
      status: real.source,
      version: real.version ?? undefined,
      path: real.path ?? undefined,
    };
  });

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
            <h1 className="font-bold text-sm text-foreground">Tool Catalog</h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              Install and manage CLI tools
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-8">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading tools...
          </div>
        ) : (
          <>
            {/* Bundled Tools */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Available Tools
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>

            {/* Add Custom Tool */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Your Tools
              </h2>
              <Card className="border-dashed border-border hover:border-primary/60 transition-all duration-200 rounded-2xl">
                <CardContent className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border text-muted-foreground flex items-center justify-center mx-auto">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Add your own tool
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Point to any executable and create a custom command workbench
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Custom Tool
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 px-8 py-4 text-center text-xs font-mono text-muted-foreground">
        NightShift v0.2.0 • Platform for CLI tools
      </footer>
    </div>
  );
}
