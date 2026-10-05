"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch } from "../hooks";
import { loadTemplatesFromDisk, loadLastSettingsFromDisk } from "./storage";
import { loadAllTemplates } from "../templates/templatesSlice";
import { setSettings } from "../videoTool/videoSlice";
import { fetchToolStatus } from "../tools/toolsSlice";

export function Hydrator() {
  const dispatch = useAppDispatch();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    async function hydrate() {
      // 1. Tool status check
      dispatch(fetchToolStatus());

      // 2. Load templates from disk
      try {
        const templates = await loadTemplatesFromDisk();
        if (Object.keys(templates).length > 0) {
          dispatch(loadAllTemplates(templates));
        }
      } catch (e) {
        console.warn("Failed to hydrate templates:", e);
      }

      // 3. Load last settings from disk
      try {
        const settings = await loadLastSettingsFromDisk();
        if (settings) {
          dispatch(setSettings(settings));
        }
      } catch (e) {
        console.warn("Failed to hydrate settings:", e);
      }
    }

    hydrate();
  }, [dispatch]);

  return null;
}
