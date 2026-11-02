"use client";

/**
 * Sync engine: IndexedDB (source of truth on the device) ⇄ Supabase.
 * Pull, merge with the pure rules in ./merge, push, then write the result
 * locally. Safe to call any time; concurrent calls are coalesced.
 */
import { db, DEFAULT_SETTINGS } from "@/lib/db/dexie";
import { getSupabase, hasSignedInFlag } from "@/lib/supabase/client";
import {
  mergeFavorites,
  mergeProfile,
  mergeSessions,
  type RemoteFavorite,
  type RemoteProfile,
  type RemoteSession,
} from "./merge";

const SETTINGS_SYNCED_AT = "dd-settings-synced-at";
const LAST_SYNC = "dd-last-sync";

export type SyncResult = "synced" | "signed-out" | "offline" | "error";

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, n: number) {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    /* ignore */
  }
}

export function lastSyncedAt(): number {
  return readNumber(LAST_SYNC);
}

async function runSync(): Promise<SyncResult> {
  if (!hasSignedInFlag()) return "signed-out";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";

  const sb = await getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return "signed-out";
  const userId = session.user.id;

  const [favRes, sesRes, profRes] = await Promise.all([
    sb.from("favorites").select("*").returns<RemoteFavorite[]>(),
    sb.from("sessions").select("*").order("started_at", { ascending: false }).limit(500).returns<RemoteSession[]>(),
    sb.from("profiles").select("*").eq("id", userId).maybeSingle<RemoteProfile>(),
  ]);
  if (favRes.error || sesRes.error || profRes.error) throw favRes.error ?? sesRes.error ?? profRes.error;

  // ---- favorites ----
  const localFavs = await db.favorites.toArray();
  const fm = mergeFavorites(localFavs, favRes.data ?? [], userId);
  if (fm.push.length) {
    const { error } = await sb.from("favorites").upsert(fm.push, { onConflict: "user_id,card_id" });
    if (error) throw error;
  }
  await db.transaction("rw", db.favorites, async () => {
    // Don't clobber a heart tapped while we were syncing; the next sync picks it up.
    const before = new Map(localFavs.map((f) => [f.cardId, f]));
    for (const f of fm.putLocal) {
      const now = await db.favorites.get(f.cardId);
      const was = before.get(f.cardId);
      if (now && was && (now.createdAt !== was.createdAt || now.deletedAt !== was.deletedAt)) continue;
      await db.favorites.put(f);
    }
    await db.favorites.bulkDelete(fm.deleteLocal);
  });

  // ---- sessions (history) ----
  const localSessions = await db.sessions.toArray();
  const sm = mergeSessions(localSessions, sesRes.data ?? [], userId);
  if (sm.push.length) {
    const { error } = await sb.from("sessions").upsert(sm.push, { onConflict: "id" });
    if (error) throw error;
  }
  const pushed = new Set(sm.push.map((s) => s.id));
  await db.transaction("rw", db.sessions, async () => {
    await db.sessions.bulkPut(sm.pull);
    await db.sessions.where("id").anyOf([...pushed]).modify({ synced: 1 });
  });

  // ---- settings ↔ profile ----
  const settings = { ...DEFAULT_SETTINGS, ...(await db.settings.get("local")) };
  const pm = mergeProfile(settings, profRes.data ?? null, readNumber(SETTINGS_SYNCED_AT), userId);
  if (pm.push) {
    const { error } = await sb.from("profiles").upsert(pm.push, { onConflict: "id" });
    if (error) throw error;
  }
  if (pm.local) await db.settings.put({ ...settings, ...pm.local, id: "local" });
  writeNumber(SETTINGS_SYNCED_AT, pm.local?.updatedAt ?? settings.updatedAt);

  writeNumber(LAST_SYNC, Date.now());
  return "synced";
}

let inFlight: Promise<SyncResult> | null = null;
let again = false;

/** Sync now. If a sync is already running, one more runs right after it. */
export function syncNow(): Promise<SyncResult> {
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = runSync()
    .catch((err) => {
      console.warn("Sync failed", err);
      return "error" as const;
    })
    .finally(() => {
      inFlight = null;
      if (again) {
        again = false;
        void syncNow();
      }
    });
  return inFlight;
}
