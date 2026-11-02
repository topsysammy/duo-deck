import { DEFAULT_SETTINGS, db, type Settings } from "./dexie";
import type { Prefs } from "@/lib/prefs/filters";

import { ONBOARDED_FLAG } from "./flags";

export async function updateSettings(patch: Partial<Omit<Settings, "id">>): Promise<void> {
  try {
    await db.transaction("rw", db.settings, async () => {
      const current = { ...DEFAULT_SETTINGS, ...(await db.settings.get("local")) };
      await db.settings.put({ ...current, ...patch, id: "local", updatedAt: Date.now() });
    });
  } catch (err) {
    console.warn("Could not save settings", err);
  }
  if (patch.onboardingDone !== undefined) {
    try {
      if (patch.onboardingDone) localStorage.setItem(ONBOARDED_FLAG, "1");
      else localStorage.removeItem(ONBOARDED_FLAG);
    } catch {
      /* storage blocked: onboarding just shows from Home's link */
    }
  }
}

export function toPrefs(s: Pick<Settings, "stage" | "moods" | "hideSpicy" | "is18Confirmed">): Prefs {
  return { stage: s.stage, moods: s.moods, hideSpicy: s.hideSpicy, is18Confirmed: s.is18Confirmed };
}

/** Confirming 18+ from a gate also turns the content filter off, so spicy decks show. */
export function confirmAdult(): Promise<void> {
  return updateSettings({ is18Confirmed: true, hideSpicy: false });
}

/** ON-5: wipe everything stored on this device. */
export async function deleteLocalData(): Promise<void> {
  db.close();
  await db.delete();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  await db.open();
}
