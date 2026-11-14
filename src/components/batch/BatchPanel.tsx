/**
 * Batch panel component.
 *
 * Allows users to select files/folders, configure output options,
 * review a dry-run plan, and execute the batch.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderOpen,
  FileText,
  Play,
  Square,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Copy,
} from "lucide-react";
import {
  planBatch,
  OutputOptions,
  BatchPlan,
  PathInput,
  PlanIssue,
} from "@/core/batch";
import {
  createBatch,
  setBatchStatus,
} from "@/store/batches/batchesSlice";
import { runBatch, cancelBatch } from "@/store/batches/batchThunks";

interface BatchPanelProps {
  toolId: string;
  templateId?: string;
  defaultInputs?: string[];
}

export function BatchPanel({ toolId, templateId, defaultInputs = [] }: BatchPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const batches = useSelector((state: RootState) => state.batches);
  const jobs = useSelector((state: RootState) => state.jobs);

  const [inputs, setInputs] = useState<PathInput[]>(
    defaultInputs.map((path) => ({
      path,
      sizeBytes: 0,
    }))
  );
  const [outputDir, setOutputDir] = useState<string>("");
  const [useOutputDir, setUseOutputDir] = useState(false);
  const [structure, setStructure] = useState<"flat" | "mirror">("flat");
  const [namePattern, setNamePattern] = useState("{name}");
  const [onConflict, setOnConflict] = useState<"rename" | "overwrite" | "skip">("rename");
  const [ext, setExt] = useState("");
  const [concurrency, setConcurrency] = useState(1);
  const [failurePolicy, setFailurePolicy] = useState<"continue" | "stop-on-first-failure">("continue");

  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"inputs" | "plan" | "progress">("inputs");

  // Active batch
  const activeBatch = batches.activeBatchId
    ? batches.batches[batches.activeBatchId]
    : undefined;

  const handleSelectFiles = useCallback(async () => {
    // Use Tauri dialog — for now, use a simple file input
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      const newInputs: PathInput[] = Array.from(files).map((file) => ({
        path: (file as any).path || file.name,
        sizeBytes: file.size,
      }));

      setInputs((prev) => [...prev, ...newInputs]);
    };
    input.click();
  }, []);

  const handleSelectFolder = useCallback(async () => {
    // Use Tauri dialog — for now, use a simple directory input
    const input = document.createElement("input");
    input.type = "file";
    (input as any).webkitdirectory = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      const newInputs: PathInput[] = Array.from(files).map((file) => ({
        path: (file as any).path || file.name,
        sizeBytes: file.size,
        relativeTo: files[0]?.webkitRelativePath?.split("/").slice(0, -1).join("/") || undefined,
      }));

      setInputs((prev) => [...prev, ...newInputs]);
    };
    input.click();
  }, []);

  const removeInput = useCallback((index: number) => {
    setInputs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePlan = useCallback(async () => {
    if (inputs.length === 0) return;

    setPlanning(true);
    setPlan(null);

    // Simulate planning delay
    await new Promise((r) => setTimeout(r, 100));

    const options: OutputOptions = {
      dir: useOutputDir ? outputDir || null : null,
      structure,
      namePattern,
      onConflict,
      ext: ext || undefined,
    };

    // Check for existing paths (mock for now)
    const existing = new Set<string>();

    const batchPlan = planBatch(inputs, options, existing);
    setPlan(batchPlan);
    setPlanning(false);
    setActiveTab("plan");
  }, [inputs, useOutputDir, outputDir, structure, namePattern, onConflict, ext]);

  const handleRun = useCallback(() => {
    if (!plan) return;

    const inputBytes = inputs.reduce((sum, i) => sum + i.sizeBytes, 0);

    dispatch(
      createBatch({
        id: `batch_${Date.now()}`,
        toolId,
        templateId,
        options: {
          dir: useOutputDir ? outputDir || null : null,
          structure,
          namePattern,
          onConflict,
          ext: ext || undefined,
        },
        items: plan.items,
        concurrency,
        failurePolicy,
        inputBytes,
      })
    );

    setActiveTab("progress");
  }, [plan, inputs, toolId, templateId, useOutputDir, outputDir, structure, namePattern, onConflict, ext, concurrency, failurePolicy, dispatch]);

  const handleStartExecution = useCallback(() => {
    dispatch(runBatch());
  }, [dispatch]);

  const handleCancel = useCallback(() => {
    dispatch(cancelBatch());
  }, [dispatch]);

  const handleCopySummary = useCallback(() => {
    if (!activeBatch) return;

    const lines: string[] = [];
    lines.push("Batch Summary");
    lines.push(`Status: ${activeBatch.status}`);
    lines.push(`Completed: ${activeBatch.completed}`);
    lines.push(`Failed: ${activeBatch.failed}`);
    lines.push(`Cancelled: ${activeBatch.cancelled}`);
    lines.push(`Skipped: ${activeBatch.skipped}`);

    if (activeBatch.startedAt && activeBatch.finishedAt) {
      const wallTime = ((activeBatch.finishedAt - activeBatch.startedAt) / 1000).toFixed(2);
      lines.push(`Wall time: ${wallTime}s`);
    }

    if (Object.keys(activeBatch.jobErrors).length > 0) {
      lines.push("");
      lines.push("Errors:");
      for (const [jobId, error] of Object.entries(activeBatch.jobErrors)) {
        if (error) {
          lines.push(`  ${jobId}: ${error}`);
        }
      }
    }

    navigator.clipboard.writeText(lines.join("\n"));
  }, [activeBatch]);

  // Auto-switch to progress tab when batch is running
  useEffect(() => {
    if (activeBatch && (activeBatch.status === "running" || activeBatch.status === "done" || activeBatch.status === "failed")) {
      setActiveTab("progress");
    }
  }, [activeBatch?.status]);

  const inputBytes = inputs.reduce((sum, i) => sum + i.sizeBytes, 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-accent-foreground" />;
      case "info":
        return <Info className="w-4 h-4 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Batch Processing</h3>
        {inputs.length > 0 && (
          <Badge variant="secondary">
            {inputs.length} file{inputs.length !== 1 ? "s" : ""} ({formatBytes(inputBytes)})
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="inputs" className="flex-1">Inputs</TabsTrigger>
          <TabsTrigger value="plan" className="flex-1" disabled={!plan}>Plan</TabsTrigger>
          <TabsTrigger value="progress" className="flex-1">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="inputs" className="space-y-4 mt-4">
          {/* Input selection */}
          <div className="space-y-3">
            <Label>Select files or folders</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectFiles}>
                <FileText className="w-4 h-4 mr-2" />
                Add Files
              </Button>
              <Button variant="outline" onClick={handleSelectFolder}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Add Folder
              </Button>
            </div>

            {inputs.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {inputs.map((input, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <span className="truncate flex-1">{input.path}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInput(idx)}
                      className="text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Output options */}
          <div className="space-y-3">
            <Label>Output options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useOutputDir"
                checked={useOutputDir}
                onCheckedChange={(v) => setUseOutputDir(Boolean(v))}
              />
              <Label htmlFor="useOutputDir">Use custom output directory</Label>
            </div>

            {useOutputDir && (
              <Input
                placeholder="Output directory path"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Structure</Label>
                <Select value={structure} onValueChange={(v) => setStructure(v as "flat" | "mirror")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="mirror">Mirror source</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Extension override</Label>
                <Input
                  placeholder="Auto"
                  value={ext}
                  onChange={(e) => setExt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name pattern</Label>
              <Input
                placeholder="{name}"
                value={namePattern}
                onChange={(e) => setNamePattern(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tokens: {"{name}"}, {"{index}"}, {"{ext}"}, {"{parent}"}, {"{date}"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>On conflict</Label>
                <Select value={onConflict} onValueChange={(v) => setOnConflict(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rename">Rename</SelectItem>
                    <SelectItem value="overwrite">Overwrite</SelectItem>
                    <SelectItem value="skip">Skip</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Concurrency</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={concurrency}
                  onChange={(e) => setConcurrency(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Failure policy</Label>
              <Select value={failurePolicy} onValueChange={(v) => setFailurePolicy(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continue">Continue on failure</SelectItem>
                  <SelectItem value="stop-on-first-failure">Stop on first failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handlePlan} disabled={inputs.length === 0 || planning} className="w-full">
            {planning ? "Planning..." : "Plan Batch"}
          </Button>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4 mt-4">
          {plan && (
            <>
              {/* Summary */}
              <Card className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{plan.summary.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{plan.summary.runnable}</div>
                    <div className="text-xs text-muted-foreground">Runnable</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent-foreground">{plan.summary.skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-destructive">{plan.summary.errors}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{plan.summary.warnings}</div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                </div>
              </Card>

              {/* Plan table */}
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Input → Output</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.items.map((item) => (
                      <TableRow key={item.index}>
                        <TableCell className="text-muted-foreground">{item.index}</TableCell>
                        <TableCell className="max-w-md truncate text-sm">{item.display}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.willSkip && (
                              <Badge variant="secondary">Skip</Badge>
                            )}
                            {item.existedBefore && (
                              <Badge variant="outline">Exists</Badge>
                            )}
                            {item.issues.map((issue, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-xs">
                                {severityIcon(issue.severity)}
                                <span className="sr-only">{issue.message}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActiveTab("inputs")} className="flex-1">
                  Back to Inputs
                </Button>
                <Button
                  onClick={handleRun}
                  disabled={plan.summary.runnable === 0}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run Batch
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 mt-4">
          {activeBatch ? (
            <>
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {activeBatch.completed + activeBatch.failed + activeBatch.cancelled} / {activeBatch.items.length}
                  </span>
                </div>
                <Progress
                  value={
                    ((activeBatch.completed + activeBatch.failed + activeBatch.cancelled) /
                      activeBatch.items.length) *
                    100
                  }
                />
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {activeBatch.completed} Done
                </Badge>
                {activeBatch.failed > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    {activeBatch.failed} Failed
                  </Badge>
                )}
                {activeBatch.cancelled > 0 && (
                  <Badge variant="outline">
                    <Square className="w-3 h-3 mr-1" />
                    {activeBatch.cancelled} Cancelled
                  </Badge>
                )}
                {activeBatch.skipped > 0 && (
                  <Badge variant="secondary">
                    <Info className="w-3 h-3 mr-1" />
                    {activeBatch.skipped} Skipped
                  </Badge>
                )}
              </div>

              {/* Wall time */}
              {activeBatch.startedAt && (
                <div className="text-sm text-muted-foreground">
                  Started at {new Date(activeBatch.startedAt).toLocaleTimeString()}
                  {activeBatch.finishedAt && (
                    <>
                      {" "}
                      · Finished in{" "}
                      {((activeBatch.finishedAt - activeBatch.startedAt) / 1000).toFixed(1)}s
                    </>
                  )}
                </div>
              )}

              {/* Job errors */}
              {Object.keys(activeBatch.jobErrors).length > 0 && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-2">Errors</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {Object.entries(activeBatch.jobErrors).map(([jobId, error]) =>
                      error ? (
                        <div key={jobId} className="text-xs text-destructive">
                          {jobId}: {error}
                        </div>
                      ) : null
                    )}
                  </div>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {activeBatch.status === "running" && (
                  <Button variant="outline" onClick={handleCancel} className="flex-1">
                    <Square className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
                {(activeBatch.status === "done" || activeBatch.status === "failed") && (
                  <>
                    <Button variant="outline" onClick={handleCopySummary} className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Summary
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("inputs")} className="flex-1">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Batch
                    </Button>
                  </>
                )}
                {!activeBatch && (
                  <Button variant="outline" onClick={handleStartExecution} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Start Execution
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active batch. Plan and run a batch to see progress here.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
