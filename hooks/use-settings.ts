"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { DEFAULT_SETTINGS, db, type Settings } from "@/lib/db/dexie";
import { toPrefs } from "@/lib/db/settings";

/**
 * Live settings from IndexedDB. Until loaded (and on the server) it returns
 * the defaults, which match what the server rendered, so there's no
 * hydration mismatch; `loaded` tells gates when the real answer is known.
 */
export function useSettings() {
  const row = useLiveQuery(
    async () => {
      try {
        return (await db.settings.get("local")) ?? null;
      } catch {
        return null; // storage blocked (private mode): behave as a fresh guest
      }
    },
    [],
    undefined,
  );
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(row ?? {}) };
  return { settings, prefs: toPrefs(settings), loaded: row !== undefined };
}
