import React from "react";
import { LucideIcon, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

export function ComingSoon({
  title,
  description,
  icon: Icon,
  badge = "Coming Soon",
}: ComingSoonProps) {
  return (
    <Card className="relative overflow-hidden border-dashed border-zinc-800 bg-zinc-950/40 opacity-75 hover:opacity-100 transition-opacity">
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
        <Sparkles className="w-3 h-3" />
        {badge}
      </div>
      <CardContent className="p-6">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
