import { isTauri } from "@/lib/isTauri";
import { VideoTemplate } from "../templates/types";
import { VideoSettings } from "../videoTool/types";
import { migrateRawTemplate } from "../templates/migrations";

const TEMPLATES_FILE = "templates.json";
const SETTINGS_FILE = "settings.json";

export async function saveTemplatesToDisk(
  templates: Record<string, VideoTemplate>
): Promise<void> {
  const customTemplates: Record<string, VideoTemplate> = {};
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
      "nightshift_v1_templates",
      JSON.stringify(customTemplates)
    );
  }
}

export async function loadTemplatesFromDisk(): Promise<Record<string, VideoTemplate>> {
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
    const localV1 = localStorage.getItem("nightshift_v1_templates");
    if (localV1) {
      try {
        raw = JSON.parse(localV1);
      } catch {}
    }

    // Check legacy v0 templates in localStorage
    if (!raw) {
      const legacy = localStorage.getItem("nightshift_templates");
      if (legacy) {
        try {
          raw = JSON.parse(legacy);
        } catch {}
      }
    }
  }

  const result: Record<string, VideoTemplate> = {};
  if (raw && typeof raw === "object") {
    for (const item of Object.values(raw)) {
      const migrated = migrateRawTemplate(item);
      if (migrated) {
        result[migrated.id] = migrated;
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
      "nightshift_v1_settings",
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
    const local = localStorage.getItem("nightshift_v1_settings");
    if (local) {
      try {
        raw = JSON.parse(local);
      } catch {}
    }
  }

  if (raw && typeof raw === "object") {
    const dummyTemplate = migrateRawTemplate({
      name: "temp",
      schemaVersion: 1,
      settings: raw,
    });
    return dummyTemplate?.settings || null;
  }

  return null;
}
