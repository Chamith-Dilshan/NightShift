"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Issue } from "@/store/videoTool/videoSchema";

interface ValidationSummaryProps {
  issues: Issue[];
}

export function ValidationSummary({ issues }: ValidationSummaryProps) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/20 border border-green-800/30 px-3.5 py-2.5 rounded-xl font-mono">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Ready to process. All settings and parameters are valid.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 font-mono text-xs">
      {errors.length > 0 && (
        <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-red-300 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Configuration Issues ({errors.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-red-300/90 pl-1">
            {errors.map((err, idx) => (
              <li key={idx} className="leading-relaxed">
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-3 bg-amber-950/25 border border-amber-800/40 rounded-xl text-amber-300 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Warnings ({warnings.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-300/90 pl-1">
            {warnings.map((warn, idx) => (
              <li key={idx} className="leading-relaxed">
                {warn.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
