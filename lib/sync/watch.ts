"use client";

import { liveQuery } from "dexie";
import { db } from "@/lib/db/dexie";
import { hasSignedInFlag } from "@/lib/supabase/client";
import { syncNow } from "./sync";

let started = false;

/**
 * Keeps a signed-in device in sync: on start-up, shortly after any local change
 * (hearts, finished sessions, settings), when the network comes back, and when
 * the app returns to the foreground (to pick up other devices' changes).
 */
export function startSyncWatcher() {
  if (started || typeof window === "undefined") return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const kick = (delay = 1500) => {
    if (!hasSignedInFlag()) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), delay);
  };

  liveQuery(async () => {
    const [favs, sessions, settings] = await Promise.all([
      db.favorites.where("synced").equals(0).count(),
      db.sessions.where("synced").equals(0).count(),
      db.settings.get("local"),
    ]);
    return `${favs}:${sessions}:${settings?.updatedAt ?? 0}`;
  }).subscribe({ next: () => kick(), error: () => {} });

  window.addEventListener("online", () => kick(0));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") kick(500);
  });
}
