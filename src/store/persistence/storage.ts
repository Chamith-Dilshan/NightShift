import { isTauri } from "@/lib/isTauri";
import { StoredTemplate } from "../templates/types";
import { VideoSettings } from "../videoTool/types";
import { validateTemplate } from "@/core/template";

const TEMPLATES_FILE = "templates.json";
const SETTINGS_FILE = "settings.json";

export async function saveTemplatesToDisk(
  templates: Record<string, StoredTemplate>
): Promise<void> {
  const customTemplates: Record<string, StoredTemplate> = {};
  for (const [id, t] of Object.entries(templates)) {
    if (!t.isBuiltIn) {
      customTemplates[id] = t;
    }
  }

  if (isTauri()) {
    try {
      const { Store } = await import("@tauri-apps/plugin-store");
      const store = await Store.load(TEMPLATES_FILE);
      await store.set("templates", customTemplates);
      await store.save();
      return;
    } catch (e) {
      console.warn("Failed to save templates via tauri store:", e);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(
      "nightshift_templates",
      JSON.stringify(customTemplates)
    );
  }
}

/**
 * Load templates from disk.
 */
export async function loadTemplatesFromDisk(): Promise<Record<string, StoredTemplate>> {
  let raw: Record<string, unknown> | null = null;

  if (isTauri()) {
    try {
      const { Store } = await import("@tauri-apps/plugin-store");
      const store = await Store.load(TEMPLATES_FILE);
      const data = await store.get<Record<string, unknown>>("templates");
      if (data) {
        raw = data;
      }
    } catch (e) {
      console.warn("Failed to load templates from tauri store:", e);
    }
  }

  if (!raw && typeof window !== "undefined") {
    const local = localStorage.getItem("nightshift_templates");
    if (local) {
      try {
        raw = JSON.parse(local);
      } catch {}
    }
  }

  const result: Record<string, StoredTemplate> = {};
  if (raw && typeof raw === "object") {
    for (const item of Object.values(raw)) {
      if (!item || typeof item !== "object") continue;

      const obj = item as Record<string, unknown>;

      // NightShiftTemplate format
      if (obj.kind === "nightshift.template") {
        const validated = validateTemplate(item);
        if (validated.ok) {
          const stored: StoredTemplate = {
            ...validated.template,
            isBuiltIn: Boolean(obj.isBuiltIn),
          };
          result[stored.id] = stored;
        }
      }
    }
  }

  return result;
}

export async function saveLastSettingsToDisk(
  settings: VideoSettings
): Promise<void> {
  if (isTauri()) {
    try {
      const { Store } = await import("@tauri-apps/plugin-store");
      const store = await Store.load(SETTINGS_FILE);
      await store.set("lastSettings", settings);
      await store.save();
      return;
    } catch (e) {
      console.warn("Failed to save settings via tauri store:", e);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(
      "nightshift_settings",
      JSON.stringify(settings)
    );
  }
}

export async function loadLastSettingsFromDisk(): Promise<VideoSettings | null> {
  let raw: unknown = null;

  if (isTauri()) {
    try {
      const { Store } = await import("@tauri-apps/plugin-store");
      const store = await Store.load(SETTINGS_FILE);
      raw = await store.get<unknown>("lastSettings");
    } catch (e) {
      console.warn("Failed to load settings from tauri store:", e);
    }
  }

  if (!raw && typeof window !== "undefined") {
    const local = localStorage.getItem("nightshift_settings");
    if (local) {
      try {
        raw = JSON.parse(local);
      } catch {}
    }
  }

  if (raw && typeof raw === "object") {
    return raw as VideoSettings;
  }

  return null;
}
