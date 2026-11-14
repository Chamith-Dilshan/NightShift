import { isTauri } from "@/lib/isTauri";
import { StoredTemplate, VideoTemplate } from "../templates/types";
import { VideoSettings } from "../videoTool/types";
import { migrateRawTemplate } from "../templates/migrations";
import {
  NightShiftTemplate,
  migrateVideoTemplate,
  validateTemplate,
} from "@/core/template";

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
      "nightshift_v2_templates",
      JSON.stringify(customTemplates)
    );
  }
}

/**
 * Load templates from disk, migrating v0.1 format if needed.
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
    // Try v2 (NightShiftTemplate) first
    const localV2 = localStorage.getItem("nightshift_v2_templates");
    if (localV2) {
      try {
        raw = JSON.parse(localV2);
      } catch {}
    }

    // Fall back to v1 (VideoTemplate)
    if (!raw) {
      const localV1 = localStorage.getItem("nightshift_v1_templates");
      if (localV1) {
        try {
          raw = JSON.parse(localV1);
        } catch {}
      }
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

  const result: Record<string, StoredTemplate> = {};
  if (raw && typeof raw === "object") {
    for (const item of Object.values(raw)) {
      if (!item || typeof item !== "object") continue;

      const obj = item as Record<string, unknown>;

      // Already NightShiftTemplate format
      if (obj.kind === "nightshift.template") {
        const validated = validateTemplate(item);
        if (validated.ok) {
          const stored: StoredTemplate = {
            ...validated.template,
            isBuiltIn: Boolean(obj.isBuiltIn),
          };
          result[stored.id] = stored;
        }
        continue;
      }

      // v0.1 VideoTemplate format — migrate
      if (obj.schemaVersion === 1 && obj.settings && typeof obj.settings === "object") {
        const v1Template: VideoTemplate = {
          id: String(obj.id),
          name: String(obj.name),
          createdAt: Number(obj.createdAt),
          schemaVersion: 1,
          isBuiltIn: Boolean(obj.isBuiltIn),
          settings: obj.settings as VideoSettings,
        };
        const migrated = migrateVideoTemplate(v1Template);
        result[migrated.id] = {
          ...migrated,
          isBuiltIn: Boolean(obj.isBuiltIn),
        };
        continue;
      }

      // Legacy v0 format — use old migration
      const legacyMigrated = migrateRawTemplate(item);
      if (legacyMigrated) {
        const nsTemplate = migrateVideoTemplate(legacyMigrated);
        result[nsTemplate.id] = {
          ...nsTemplate,
          isBuiltIn: Boolean(legacyMigrated.isBuiltIn),
        };
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
