"use client";

import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { ToolSpec } from "@/core/spec/schema";
import { buildCommand, BuildIO, BuildContext } from "@/core/spec/argBuilder";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Copy, Check } from "lucide-react";

interface CommandPreviewProps {
  spec: ToolSpec;
  toolId: string;
}

export function CommandPreview({ spec, toolId }: CommandPreviewProps) {
  const session = useAppSelector((state) => state.workbench.sessions[toolId]);
  const [copied, setCopied] = React.useState(false);

  const builtCommand = useMemo(() => {
    if (!session || !session.commandDef) return null;

    const command = spec.commands.find((c) => c.id === session.commandId);
    if (!command) return null;

    // Build IO from session inputs/outputs
    const inputs: Record<string, string | string[]> = {};
    for (const port of command.inputs) {
      if (port.kind === "file" || port.kind === "files") {
        inputs[port.id] = session.inputs;
      } else {
        inputs[port.id] = session.inputs[0] ?? "";
      }
    }

    const outputs: Record<string, string> = {};
    for (const port of command.outputs) {
      outputs[port.id] = session.output ?? "";
    }

    const io: BuildIO = { inputs, outputs };
    const ctx: BuildContext = {
      platform: "windows",
      toolVersion: undefined,
      probes: undefined,
      capabilities: undefined,
    };

    return buildCommand(spec, session.commandId, session.params, io, ctx);
  }, [spec, session, toolId]);

  const handleCopy = () => {
    if (!builtCommand) return;
    const text = builtCommand.display || builtCommand.args.join(" ");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!builtCommand) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Terminal className="w-4 h-4" />
          <span>No command to preview</span>
        </div>
      </Card>
    );
  }

  const displayText = builtCommand.display || builtCommand.args.join(" ");
  const hasErrors = builtCommand.issues.some((i) => i.severity === "error");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Terminal className="w-4 h-4 text-primary" />
          <span>Command Preview</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleCopy}
          disabled={!displayText}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div
        className={`rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all ${
          hasErrors ? "bg-red-500/10 text-red-400" : "bg-muted/50 text-muted-foreground"
        }`}
      >
        {displayText || "(empty command)"}
      </div>

      {builtCommand.issues.length > 0 && (
        <div className="space-y-1">
          {builtCommand.issues.map((issue, i) => (
            <div
              key={i}
              className={`text-xs ${
                issue.severity === "error"
                  ? "text-red-400"
                  : issue.severity === "warning"
                  ? "text-yellow-400"
                  : "text-blue-400"
              }`}
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {builtCommand.adjustments.length > 0 && (
        <div className="space-y-1">
          {builtCommand.adjustments.map((adj, i) => (
            <div key={i} className="text-xs text-muted-foreground italic">
              {adj}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
