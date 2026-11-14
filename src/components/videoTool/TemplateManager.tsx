"use client";

import React, { useState } from "react";
import { Bookmark, Save, Trash2, Edit2, Download, Upload, Check } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  saveTemplate,
  deleteTemplate,
  renameTemplate,
  importTemplates,
  setActiveTemplateId,
} from "@/store/templates/templatesSlice";
import { setSettings } from "@/store/videoTool/videoSlice";
import { selectVideoSettings } from "@/store/videoTool/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoredTemplate } from "@/store/templates/types";
import { VideoSettings } from "@/store/videoTool/types";
import {
  parseTemplateFile,
  migrateVideoTemplate,
  exportPack,
  validateTemplate,
  NightShiftTemplate,
} from "@/core/template";
import { migrateRawTemplate } from "@/store/templates/migrations";

/**
 * Extract VideoSettings from a StoredTemplate's params.
 * For FFmpeg builtin templates, params is the VideoSettings object.
 */
function extractSettings(tpl: StoredTemplate): VideoSettings | null {
  const node = tpl.graph?.nodes?.[0];
  if (!node || node.mode !== "params" || !node.params) return null;
  return node.params as unknown as VideoSettings;
}

export default function TemplateManager() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectVideoSettings);
  const { templates, activeTemplateId } = useAppSelector(
    (state) => state.templates
  );

  const [isSaving, setIsSaving] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const templateList = Object.values(templates);
  const activeTemplate = activeTemplateId ? templates[activeTemplateId] : null;

  const handleSelect = (id: string | null) => {
    if (!id) return;
    const tpl = templates[id];
    if (tpl) {
      dispatch(setActiveTemplateId(id));
      const extracted = extractSettings(tpl);
      if (extracted) {
        dispatch(setSettings(extracted));
      }
    }
  };

  const handleSave = () => {
    if (!newTemplateName.trim()) return;

    const now = new Date().toISOString();
    const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const template: NightShiftTemplate = {
      schemaVersion: 1,
      kind: "nightshift.template",
      id,
      name: newTemplateName.trim(),
      createdAt: now,
      updatedAt: now,
      requires: [{ tool: "ffmpeg" }],
      graph: {
        nodes: [
          {
            id: "n1",
            tool: "ffmpeg",
            command: "transcode",
            mode: "params",
            params: settings as unknown as Record<string, unknown>,
            inputs: { in: { from: "$input" } },
            output: {
              namePattern: settings.output.nameTemplate ?? "{name}_nightshift",
            },
          },
        ],
        edges: [],
      },
    };

    dispatch(saveTemplate(template));
    setNewTemplateName("");
    setIsSaving(false);
  };

  const handleRename = (id: string) => {
    if (!renameText.trim()) return;
    dispatch(renameTemplate({ id, name: renameText.trim() }));
    setEditingId(null);
  };

  const handleExport = () => {
    const customOnly = templateList.filter((t) => !t.isBuiltIn);
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
          const stored = parsed.templates.map((t) => ({
            ...t,
            isBuiltIn: false,
          }));
          dispatch(importTemplates(stored));
        } else {
          // Fall back to v0.1 migration
          const jsonRaw = JSON.parse(raw);
          const items = Array.isArray(jsonRaw) ? jsonRaw : [jsonRaw];
          const validStored: StoredTemplate[] = [];

          for (const item of items) {
            // Try NightShiftTemplate first
            const nsResult = validateTemplate(item);
            if (nsResult.ok) {
              validStored.push({ ...nsResult.template, isBuiltIn: false });
              continue;
            }
            // Fall back to v0.1 migration
            const migrated = migrateRawTemplate(item);
            if (migrated) {
              const ns = migrateVideoTemplate(migrated);
              validStored.push({ ...ns, isBuiltIn: false });
            }
          }

          if (validStored.length > 0) {
            dispatch(importTemplates(validStored));
          }
        }
      } catch (err) {
        console.warn("Import error:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">
            Presets & Templates
          </Label>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExport}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-mono"
            title="Export custom templates to JSON"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>

          <label className="cursor-pointer">
            <span className="inline-flex items-center justify-center h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-mono hover:bg-muted rounded-md transition-colors">
              <Upload className="w-3.5 h-3.5 mr-1" /> Import
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {/* Template Selector */}
        <div className="flex gap-2">
          <Select
            value={activeTemplateId || ""}
            onValueChange={handleSelect}
          >
            <SelectTrigger className="h-8 text-xs font-mono bg-muted border-border flex-1">
              <SelectValue placeholder="Choose a preset..." />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border text-xs font-mono">
              <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Built-in Presets
              </div>
              {templateList
                .filter((t) => t.isBuiltIn)
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}

              {templateList.some((t) => !t.isBuiltIn) && (
                <>
                  <div className="px-2 py-1 mt-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-t border-border/80">
                    Custom Templates
                  </div>
                  {templateList
                    .filter((t) => !t.isBuiltIn)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                </>
              )}
            </SelectContent>
          </Select>

          {!isSaving && (
            <Button
              size="sm"
              onClick={() => setIsSaving(true)}
              className="h-8 px-2.5 text-xs bg-muted hover:bg-muted-foreground/20 text-foreground shrink-0 font-mono"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          )}
        </div>

        {/* Save as new template */}
        {isSaving && (
          <div className="flex gap-2 p-2.5 bg-muted/60 border border-border rounded-lg">
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name..."
              className="h-7 text-xs font-mono bg-muted border-border"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <Button
              size="sm"
              onClick={handleSave}
              className="h-7 px-2.5 text-xs bg-primary text-primary-foreground font-mono"
            >
              <Check className="w-3 h-3 mr-1" /> Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsSaving(false)}
              className="h-7 px-2 text-xs text-muted-foreground font-mono"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Selected custom template management (rename / delete) */}
        {activeTemplate && !activeTemplate.isBuiltIn && (
          <div className="flex items-center justify-between p-2 bg-muted/40 border border-border/60 rounded-lg text-[11px] text-muted-foreground">
            {editingId === activeTemplate.id ? (
              <div className="flex gap-2 flex-1 mr-2">
                <Input
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  className="h-6 text-xs font-mono bg-muted border-border"
                  autoFocus
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleRename(activeTemplate.id)
                  }
                />
                <Button
                  size="sm"
                  onClick={() => handleRename(activeTemplate.id)}
                  className="h-6 px-2 text-xs"
                >
                  Save
                </Button>
              </div>
            ) : (
              <span>Template: {activeTemplate.name}</span>
            )}

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingId(activeTemplate.id);
                  setRenameText(activeTemplate.name);
                }}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Rename template"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dispatch(deleteTemplate(activeTemplate.id))}
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                title="Delete template"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
