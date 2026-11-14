"use client";

import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setParam } from "@/store/workbench/workbenchSlice";
import { CommandDef, ParamDef } from "@/core/spec/schema";
import { evalExpr } from "@/core/spec/expr";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  X,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";

interface SpecPanelProps {
  commandDef: CommandDef;
  toolId: string;
}

/**
 * Renders a single parameter field based on its ParamDef type.
 */
function ParamField({
  param,
  value,
  visible,
  enabled,
  onChange,
}: {
  param: ParamDef;
  value: unknown;
  visible: boolean;
  enabled: boolean;
  onChange: (id: string, value: unknown) => void;
}) {
  if (!visible) return null;

  const labelId = `param-${param.id}`;

  if (param.type === "bool") {
    return (
      <div className="flex items-center justify-between py-2">
        <Label htmlFor={labelId} className="text-sm flex-1">
          {param.label}
          {param.help && <span className="text-xs text-muted-foreground ml-1">— {param.help}</span>}
        </Label>
        <Switch
          id={labelId}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(param.id, checked)}
          disabled={!enabled}
          size="sm"
        />
      </div>
    );
  }

  if (param.type === "enum") {
    const options = (param.options || []).filter((opt) => opt.value !== undefined);
    return (
      <div className="space-y-1.5 py-1.5">
        <Label htmlFor={labelId} className="text-sm">
          {param.label}
          {param.help && <span className="text-xs text-muted-foreground ml-1">— {param.help}</span>}
        </Label>
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(param.id, v)}
          disabled={!enabled}
        >
          <SelectTrigger id={labelId} className="text-sm">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (param.type === "int" || param.type === "float") {
    const step = param.step || (param.type === "float" ? 0.1 : 1);
    const numValue = Number(value ?? 0);

    // Show slider if min/max are defined and range is reasonable
    const showSlider =
      param.min !== undefined &&
      param.max !== undefined &&
      param.max - param.min <= 1000;

    return (
      <div className="space-y-1.5 py-1.5">
        <Label htmlFor={labelId} className="text-sm">
          {param.label}
          {param.help && <span className="text-xs text-muted-foreground ml-1">— {param.help}</span>}
          {param.unit && (
            <span className="text-xs text-muted-foreground ml-1">({param.unit})</span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={labelId}
            type="number"
            step={step}
            min={param.min}
            max={param.max}
            value={numValue}
            onChange={(e) => onChange(param.id, param.type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
            disabled={!enabled}
            className="text-sm"
          />
        </div>
        {showSlider && (
          <Slider
            min={param.min}
            max={param.max}
            step={step}
            value={[numValue]}
            onValueChange={(vals: number | readonly number[]) => {
              const v = Array.isArray(vals) ? vals[0] : vals;
              onChange(param.id, v);
            }}
            disabled={!enabled}
            className="mt-1"
          />
        )}
      </div>
    );
  }

  if (param.type === "file") {
    return (
      <div className="space-y-1.5 py-1.5">
        <Label htmlFor={labelId} className="text-sm">
          {param.label}
          {param.help && <span className="text-xs text-muted-foreground ml-1">— {param.help}</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            id={labelId}
            type="text"
            value={String(value ?? "")}
            readOnly
            disabled
            className="text-sm flex-1"
            placeholder="No file selected"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!enabled}
            onClick={() => {
              // Tauri dialog would be triggered here
              console.log("Open file dialog for", param.id);
            }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Default: string
  return (
    <div className="space-y-1.5 py-1.5">
      <Label htmlFor={labelId} className="text-sm">
        {param.label}
        {param.help && <span className="text-xs text-muted-foreground ml-1">— {param.help}</span>}
      </Label>
      <Input
        id={labelId}
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(param.id, e.target.value)}
        disabled={!enabled}
        className="text-sm"
        maxLength={param.maxLength}
      />
    </div>
  );
}

/**
 * SpecPanel renders a complete form from a CommandDef spec.
 * Groups params by their group definition, handles visibility conditions.
 */
export function SpecPanel({ commandDef, toolId }: SpecPanelProps) {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.workbench.sessions[toolId]);

  const params = commandDef.params;
  const groups = commandDef.groups;

  // Build group order map
  const groupOrder = useMemo(() => {
    if (!groups) return {};
    const map: Record<string, number> = {};
    groups.forEach((g, i) => {
      map[g.id] = g.order ?? i;
    });
    return map;
  }, [groups]);

  // Group params
  const groupedParams = useMemo(() => {
    const grouped: Record<string, ParamDef[]> = {};
    for (const param of params) {
      const groupId = param.group ?? "other";
      if (!grouped[groupId]) {
        grouped[groupId] = [];
      }
      grouped[groupId].push(param);
    }
    return grouped;
  }, [params]);

  // Get group labels
  const getGroupLabel = (groupId: string) => {
    const group = groups?.find((g) => g.id === groupId);
    return group?.label ?? groupId;
  };

  // Sort group IDs by order
  const sortedGroupIds = useMemo(() => {
    const ids = Object.keys(groupedParams);
    ids.sort((a, b) => (groupOrder[a] ?? Infinity) - (groupOrder[b] ?? Infinity));
    return ids;
  }, [groupedParams, groupOrder]);

  // Evaluate visibility for a param
  const isVisible = (param: ParamDef): boolean => {
    if (!param.visibleWhen) return true;
    if (!session) return true;
    try {
      return evalExpr(param.visibleWhen, {
        params: session.params,
        inputs: undefined,
        outputs: undefined,
        toolVersion: undefined,
        probes: undefined,
      });
    } catch {
      return true;
    }
  };

  // Evaluate enabled state for a param
  const isEnabled = (param: ParamDef): boolean => {
    if (!param.enabledWhen) return true;
    if (!session) return true;
    try {
      return evalExpr(param.enabledWhen, {
        params: session.params,
        inputs: undefined,
        outputs: undefined,
        toolVersion: undefined,
        probes: undefined,
      });
    } catch {
      return true;
    }
  };

  const handleParamChange = (id: string, value: unknown) => {
    dispatch(setParam({ paramId: id, value }));
  };

  // Filter out invisible params per group
  const visibleGroupedParams = useMemo(() => {
    const result: Record<string, ParamDef[]> = {};
    for (const groupId of sortedGroupIds) {
      const visible = groupedParams[groupId].filter((p) => isVisible(p));
      if (visible.length > 0) {
        result[groupId] = visible;
      }
    }
    return result;
  }, [sortedGroupIds, groupedParams]);

  const visibleGroupIds = Object.keys(visibleGroupedParams);

  if (visibleGroupIds.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground text-sm">
        No parameters to configure.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {visibleGroupIds.map((groupId) => (
        <div key={groupId} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">
            {getGroupLabel(groupId)}
          </h3>
          <Card className="p-3 space-y-0.5">
            {visibleGroupedParams[groupId].map((param) => (
              <ParamField
                key={param.id}
                param={param}
                value={session?.params[param.id]}
                visible={isVisible(param)}
                enabled={isEnabled(param)}
                onChange={handleParamChange}
              />
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
