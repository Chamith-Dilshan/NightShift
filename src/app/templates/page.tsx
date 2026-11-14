"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Download,
  Upload,
  Copy,
  Trash2,
  Play,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Tag,
  FileText,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteTemplate,
  duplicateTemplate,
  importTemplates,
  setActiveTemplateId,
} from "@/store/templates/templatesSlice";
import { StoredTemplate } from "@/store/templates/types";
import {
  parseTemplateFile,
  exportPack,
  exportTemplate,
  reviewTemplate,
  ReviewWarning,
  hashTemplate,
  NightShiftTemplate,
} from "@/core/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ToolStatus } from "@/lib/executor/types";

// ─── Import Review Modal ───

interface ImportReviewProps {
  templates: NightShiftTemplate[];
  onConfirm: (templates: StoredTemplate[]) => void;
  onCancel: () => void;
}

function ImportReview({ templates, onConfirm, onCancel }: ImportReviewProps) {
  const dispatch = useAppDispatch();
  const toolStatusList = useAppSelector((state) => state.tools.status);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(templates.map((_, i) => i))
  );

  const installedTools = toolStatusList
    .filter((t: ToolStatus) => t.source !== "missing")
    .map((t: ToolStatus) => t.tool);
  const bundledToolIds = toolStatusList.map((t: ToolStatus) => t.tool);

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const handleConfirm = () => {
    const selected = Array.from(selectedIndices).map(
      (i) => ({ ...templates[i], isBuiltIn: false })
    );
    onConfirm(selected);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-2xl max-h-[80vh] mx-4 p-6 space-y-4 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Review Templates</h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            ✕
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {templates.map((tpl, index) => {
            const warnings = reviewTemplate(tpl, installedTools, bundledToolIds);
            const errors = warnings.filter((w) => w.severity === "error");
            const node = tpl.graph.nodes[0];

            return (
              <Card
                key={index}
                className={`p-4 space-y-2 border-2 cursor-pointer transition-colors ${
                  selectedIndices.has(index)
                    ? "border-primary"
                    : "border-border hover:border-muted-foreground/50"
                } ${errors.length > 0 ? "bg-destructive/5" : ""}`}
                onClick={() => toggleSelect(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tpl.name}</span>
                      {selectedIndices.has(index) && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                        {node.tool}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                        {node.mode === "raw" ? "Raw command" : "Params"}
                      </span>
                      {node.command && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                          {node.command}
                        </span>
                      )}
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {tpl.description}
                      </p>
                    )}
                  </div>
                </div>

                {warnings.length > 0 && (
                  <div className="space-y-1">
                    {warnings.map((w, wi) => (
                      <div
                        key={wi}
                        className="flex items-start gap-2 text-xs"
                      >
                        {severityIcon(w.severity)}
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {selectedIndices.size} of {templates.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedIndices.size === 0}
            >
              Import {selectedIndices.size} template{selectedIndices.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Template Card ───

interface TemplateCardProps {
  template: StoredTemplate;
  onApply: (id: string) => void;
  onExport: (tpl: StoredTemplate) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function TemplateCard({
  template,
  onApply,
  onExport,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const node = template.graph.nodes[0];
  const isBuiltIn = template.isBuiltIn;

  return (
    <Card className="p-4 space-y-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{template.name}</h3>
            {isBuiltIn && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                Built-in
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
              {node.tool}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
              {node.mode === "raw" ? "Raw" : "Params"}
            </span>
          </div>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {template.description}
            </p>
          )}
          {template.tags && template.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={() => onApply(template.id)}
          title="Apply to workbench"
        >
          <Play className="w-3.5 h-3.5 mr-1" /> Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onExport(template)}
          title="Export template"
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
        {!isBuiltIn && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onDuplicate(template.id)}
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(template.id)}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

// ─── Main Page ───

export default function TemplatesPage() {
  const dispatch = useAppDispatch();
  const { templates } = useAppSelector((state) => state.templates);
  const [search, setSearch] = useState("");
  const [filterTool, setFilterTool] = useState<string>("all");
  const [importReview, setImportReview] = useState<NightShiftTemplate[] | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const templateList = Object.values(templates);

  // Get unique tools
  const tools = Array.from(new Set(templateList.map((t) => t.graph.nodes[0].tool)));

  // Filter templates
  const filtered = templateList.filter((t) => {
    const node = t.graph.nodes[0];
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchTool = filterTool === "all" || node.tool === filterTool;
    return matchSearch && matchTool;
  });

  // Group by built-in / custom
  const builtIn = filtered.filter((t) => t.isBuiltIn);
  const custom = filtered.filter((t) => !t.isBuiltIn);

  const handleApply = useCallback(
    (id: string) => {
      dispatch(setActiveTemplateId(id));
      // Navigate to the tool's workbench
      const tpl = templates[id];
      if (tpl) {
        const toolId = tpl.graph.nodes[0].tool;
        window.location.href = `/tool?id=${encodeURIComponent(toolId)}&template=${encodeURIComponent(id)}`;
      }
    },
    [dispatch, templates]
  );

  const handleExportSingle = (tpl: StoredTemplate) => {
    const jsonStr = exportTemplate(tpl as NightShiftTemplate);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tpl.name.replace(/[^a-z0-9]/gi, "_")}.nightshift-template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const customOnly = templateList.filter((t) => !t.isBuiltIn);
    if (customOnly.length === 0) return;
    const jsonStr = exportPack(customOnly as NightShiftTemplate[]);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nightshift_templates_${Date.now()}.nightshift-pack.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = parseTemplateFile(raw, file.size);

        if (parsed.ok) {
          setImportReview(parsed.templates);
        } else {
          console.warn("Import error:", parsed.error);
        }
      } catch (err) {
        console.warn("Import error:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportConfirm = (stored: StoredTemplate[]) => {
    dispatch(importTemplates(stored));
    setImportReview(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Import Review Modal */}
      {importReview && (
        <ImportReview
          templates={importReview}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportReview(null)}
        />
      )}

      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">Templates</h1>
                <p className="text-sm text-muted-foreground">
                  Save, share, and reuse your tool configurations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                disabled={custom.length === 0}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Import
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".nightshift-template.json,.nightshift-pack.json,.json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates by name, description, or tag..."
                className="pl-9"
              />
            </div>
            <select
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All tools</option>
              {tools.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No templates found</p>
            <p className="text-sm mt-1">
              {search || filterTool !== "all"
                ? "Try adjusting your search or filters."
                : "Save your first template from the workbench."}
            </p>
          </div>
        )}

        {builtIn.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Built-in Presets
              <span className="text-xs normal-case ml-1">({builtIn.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {builtIn.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onApply={handleApply}
                  onExport={handleExportSingle}
                  onDuplicate={(id) => dispatch(duplicateTemplate(id))}
                  onDelete={(id) => dispatch(deleteTemplate(id))}
                />
              ))}
            </div>
          </section>
        )}

        {custom.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Custom Templates
              <span className="text-xs normal-case ml-1">({custom.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {custom.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onApply={handleApply}
                  onExport={handleExportSingle}
                  onDuplicate={(id) => dispatch(duplicateTemplate(id))}
                  onDelete={(id) => dispatch(deleteTemplate(id))}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
