"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  Video,
  Image as ImageIcon,
  FileCode,
  Settings,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchToolStatus } from "@/store/tools/toolsSlice";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComingSoon } from "@/components/ComingSoon";
import {AnimatedThemeToggler} from "@/components/ui/animated-theme-toggler";
import Image from "next/image";

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { status } = useAppSelector((state) => state.tools);

  useEffect(() => {
    dispatch(fetchToolStatus());
  }, [dispatch]);

  const ffmpegStatus = status.find((t) => t.tool === "ffmpeg");
  const isInstalled = ffmpegStatus && ffmpegStatus.source !== "missing";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      {/* Top Header */}
      <header className="border-b border-border px-8 py-4 flex items-center justify-between bg-background backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono font-bold text-sm shadow-md shadow-primary/10">
            <Image src="/app-icon.png" alt="NightShift-logo" width={30} height={30} className="object-cover"/>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-foreground">
              NightShift
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              Desktop Media Processing Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
         <div className="w-6 h-6 text-primary flex items-center justify-center">
           <AnimatedThemeToggler  variant="circle"/>
         </div>

          <Link href="/setup">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {isInstalled ? "Environment Ready" : "Setup Required"}
            </Button>
          </Link>

          <Link href="/settings">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono border-border hover:bg-muted text-foreground"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-8 flex flex-col justify-center">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>v0.1.0 Desktop Release</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Precision Media Conversion &amp; Codec Processing
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-sans">
            Hardware-accelerated visual command studio for FFmpeg. Native process execution, real-time log streaming, and zero bundled sidecars.
          </p>
        </div>

        {/* Studio Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {/* Video Tool (Active) */}
          <Link href="/video" className="group">
            <Card className="h-full bg-card/80 border border-border hover:border-primary/60 transition-all duration-200 shadow-xl group-hover:shadow-primary/5 rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Video Studio</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-primary" />
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Transcode, crop, trim, adjust bitrates, add watermarks, and generate web-optimized MP4, WebM, and GIF clips.
                  </p>
                </div>
              </CardContent>
              <div className="px-6 py-3 bg-muted/40 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>FFmpeg Engine</span>
                <span className="text-primary font-semibold">Ready</span>
              </div>
            </Card>
          </Link>

          {/* WebP Studio (Coming Soon) */}
          <ComingSoon
            title="WebP & Image Optimizer"
            description="Batch image compression and WebP/AVIF generation with multi-threaded encoder presets."
            icon={ImageIcon}
          />

          {/* Declarative Custom Tabs (Coming Soon) */}
          <ComingSoon
            title="Custom Tool Builder"
            description="Declarative schema editor and custom FFmpeg pipeline orchestrator."
            icon={FileCode}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 px-8 py-4 text-center text-xs font-mono text-muted-foreground">
        NightShift v0.1.0 • Built with Tauri v2 + Next.js + Redux Toolkit
      </footer>
    </div>
  );
}
