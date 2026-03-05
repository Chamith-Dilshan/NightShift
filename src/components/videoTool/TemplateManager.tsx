"use client";

import { useState } from "react";
import { Save, FolderDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveTemplate, loadTemplate, deleteTemplate } from "@/store/videoTool/videoSlice";

/**
 * Component for saving, loading, and deleting preset templates of VideoSlice configuration.
 */
export default function TemplateManager() {
  const dispatch = useAppDispatch();
  const templates = useAppSelector((state) => state.videoTool.templates);
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const templateNames = Object.keys(templates);

  const handleSave = () => {
    if (!newTemplateName.trim()) return;
    dispatch(saveTemplate(newTemplateName.trim()));
    setSelectedTemplate(newTemplateName.trim());
    setNewTemplateName("");
    setIsSaving(false);
  };

  const handleLoad = () => {
    if (selectedTemplate) {
      dispatch(loadTemplate(selectedTemplate));
    }
  };

  const handleDelete = () => {
    if (selectedTemplate) {
      dispatch(deleteTemplate(selectedTemplate));
      setSelectedTemplate("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isSaving ? (
        <div className="flex items-center gap-1.5 transition-all">
          <Input 
            className="w-36 h-7 text-xs rounded-lg px-2" 
            placeholder="Template name..." 
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            autoFocus
          />
          <Button size="sm" onClick={handleSave} className="h-7 text-xs rounded-lg px-2.5">
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsSaving(false)} className="h-7 text-xs rounded-lg px-2.5 text-muted-foreground">
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-36 h-7 text-xs rounded-lg">
              <SelectValue placeholder="Templates" />
            </SelectTrigger>
            <SelectContent>
              {templateNames.length === 0 ? (
                 <SelectItem value="none" disabled>No templates saved</SelectItem>
              ) : (
                templateNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Button 
            size="sm" 
            variant="secondary" 
            className="h-7 text-xs rounded-lg px-2.5" 
            onClick={handleLoad}
            disabled={!selectedTemplate || selectedTemplate === "none"}
            title="Load Template"
          >
            <FolderDown className="w-3.5 h-3.5 mr-1" /> Load
          </Button>

          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs rounded-lg border-dashed px-2.5" 
            onClick={() => setIsSaving(true)}
            title="Save Current Settings as Template"
          >
            <Save className="w-3.5 h-3.5 mr-1 text-muted-foreground" /> Save
          </Button>

          {selectedTemplate && selectedTemplate !== "none" && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-7 text-xs rounded-lg px-2" 
              onClick={handleDelete}
              title="Delete Template"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
