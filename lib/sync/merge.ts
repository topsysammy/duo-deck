/**
 * Pure merge rules between this device (IndexedDB) and the account (Supabase).
 * Goal (ON-4): signing in never loses anything, and changes on any device win
 * by recency. No I/O here, so every rule is unit-tested.
 */
import type { Favorite, SessionRecord, Settings } from "@/lib/db/dexie";
import type { Mood, RelationshipStage } from "@/lib/prefs/filters";

// ---------- remote row shapes (supabase/migrations/0001_init.sql) ----------

export interface RemoteFavorite {
  user_id: string;
  card_id: string;
  deck_id: string;
  note: string | null;
  created_at: string;
  deleted_at: string | null;
  updated_at: string;
}

export interface RemoteSession {
  id: string;
  user_id: string;
  deck_id: string;
  mode: "deck" | "favorites";
  cards_seen: string[];
  skipped: number;
  completed: boolean;
  started_at: string;
  ended_at: string;
}

export interface RemoteProfile {
  id: string;
  display_name: string | null;
  partner_name: string | null;
  relationship_stage: RelationshipStage | null;
  moods: Mood[];
  content_filter: boolean;
  is_18_confirmed: boolean;
  updated_at: string;
}

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (s: string | null) => (s ? Date.parse(s) : 0);

// ---------- favorites ----------

/** When a local favorite last changed (hearted or un-hearted). */
export const localChangedAt = (f: Favorite) => f.deletedAt ?? f.createdAt;

export function favoriteToRemote(f: Favorite, userId: string): RemoteFavorite {
  return {
    user_id: userId,
    card_id: f.cardId,
    deck_id: f.deckId,
    note: f.note ?? null,
    created_at: iso(f.createdAt),
    deleted_at: f.deletedAt ? iso(f.deletedAt) : null,
    updated_at: iso(localChangedAt(f)),
  };
}

export function favoriteFromRemote(r: RemoteFavorite): Favorite {
  return {
    cardId: r.card_id,
    deckId: r.deck_id,
    createdAt: ms(r.created_at),
    deletedAt: r.deleted_at ? ms(r.deleted_at) : null,
    synced: 1,
    ...(r.note ? { note: r.note } : {}),
  };
}

export interface FavoritesMerge {
  /** Rows to write locally (all marked synced). */
  putLocal: Favorite[];
  /** Local card ids to delete outright (never-synced tombstones). */
  deleteLocal: string[];
  /** Rows to upsert to Supabase. */
  push: RemoteFavorite[];
}

/**
 * Per card: an unsynced local change wins if it's newer than the remote row;
 * otherwise the remote row wins. Cards only on one side are copied across.
 */
export function mergeFavorites(local: Favorite[], remote: RemoteFavorite[], userId: string): FavoritesMerge {
  const out: FavoritesMerge = { putLocal: [], deleteLocal: [], push: [] };
  const remoteById = new Map(remote.map((r) => [r.card_id, r]));
  const localIds = new Set(local.map((f) => f.cardId));

  for (const f of local) {
    const r = remoteById.get(f.cardId);
    if (!r) {
      if (f.deletedAt && !f.synced) {
        out.deleteLocal.push(f.cardId); // removed before it ever synced: nothing to tell
      } else {
        out.push.push(favoriteToRemote(f, userId));
        out.putLocal.push({ ...f, synced: 1 });
      }
      continue;
    }
    const localWins = !f.synced && localChangedAt(f) > ms(r.updated_at);
    if (localWins) {
      // Keep a note that only the account has.
      const merged: Favorite = { ...f, synced: 1, ...(f.note || !r.note ? {} : { note: r.note }) };
      out.push.push(favoriteToRemote(merged, userId));
      out.putLocal.push(merged);
    } else {
      out.putLocal.push(favoriteFromRemote(r));
    }
  }

  for (const r of remote) if (!localIds.has(r.card_id)) out.putLocal.push(favoriteFromRemote(r));
  return out;
}

// ---------- sessions (history) ----------

export function sessionToRemote(s: SessionRecord, userId: string): RemoteSession {
  return {
    id: s.id,
    user_id: userId,
    deck_id: s.deckId,
    mode: s.mode,
    cards_seen: s.cardsSeen,
    skipped: s.skipped,
    completed: s.completed,
    started_at: iso(s.startedAt),
    ended_at: iso(s.endedAt),
  };
}

export function sessionFromRemote(r: RemoteSession): SessionRecord {
  return {
    id: r.id,
    deckId: r.deck_id,
    mode: r.mode,
    cardsSeen: r.cards_seen,
    skipped: r.skipped,
    favoritesSaved: 0,
    favoritedIds: [],
    completed: r.completed,
    startedAt: ms(r.started_at),
    endedAt: ms(r.ended_at),
    synced: 1,
  };
}

/** Sessions are append-only: push unsynced local ones, pull remote ones this device lacks. */
export function mergeSessions(local: SessionRecord[], remote: RemoteSession[], userId: string) {
  const localIds = new Set(local.map((s) => s.id));
  const remoteIds = new Set(remote.map((s) => s.id));
  return {
    push: local.filter((s) => !s.synced || !remoteIds.has(s.id)).map((s) => sessionToRemote(s, userId)),
    pull: remote.filter((r) => !localIds.has(r.id)).map(sessionFromRemote),
  };
}

// ---------- settings ↔ profile ----------

export type SyncedSettings = Pick<
  Settings,
  "partnerA" | "partnerB" | "stage" | "moods" | "hideSpicy" | "is18Confirmed" | "updatedAt"
>;

export function settingsToProfile(s: SyncedSettings, userId: string): RemoteProfile {
  return {
    id: userId,
    display_name: s.partnerA || null,
    partner_name: s.partnerB || null,
    relationship_stage: s.stage,
    moods: s.moods,
    content_filter: s.hideSpicy,
    is_18_confirmed: s.is18Confirmed,
    updated_at: iso(s.updatedAt || Date.now()),
  };
}

/**
 * Newer side wins field by field, but an empty field never overwrites a filled
 * one, and an 18+ confirmation on either side is kept.
 * `lastSyncedAt` = when this device last synced settings (0 = never).
 */
export function mergeProfile(local: SyncedSettings, remote: RemoteProfile | null, lastSyncedAt: number, userId: string) {
  if (!remote) return { local: null, push: settingsToProfile(local, userId) };

  const localDirty = local.updatedAt > lastSyncedAt;
  const localNewer = localDirty && local.updatedAt > ms(remote.updated_at);
  const pick = <T,>(l: T, r: T, empty: (v: T) => boolean): T =>
    empty(l) ? r : empty(r) ? l : localNewer ? l : r;
  const blank = (v: string | null) => !v;

  const merged: SyncedSettings = {
    partnerA: pick(local.partnerA || null, remote.display_name, blank) ?? "",
    partnerB: pick(local.partnerB || null, remote.partner_name, blank) ?? "",
    stage: pick(local.stage, remote.relationship_stage, (v) => v === null),
    moods: pick(local.moods, remote.moods, (v) => v.length === 0),
    hideSpicy: localNewer ? local.hideSpicy : remote.content_filter,
    is18Confirmed: local.is18Confirmed || remote.is_18_confirmed,
    updatedAt: Math.max(local.updatedAt, ms(remote.updated_at)),
  };

  const differsFromRemote =
    merged.partnerA !== (remote.display_name ?? "") ||
    merged.partnerB !== (remote.partner_name ?? "") ||
    merged.stage !== remote.relationship_stage ||
    merged.moods.join() !== remote.moods.join() ||
    merged.hideSpicy !== remote.content_filter ||
    merged.is18Confirmed !== remote.is_18_confirmed;

  return { local: merged, push: differsFromRemote ? settingsToProfile(merged, userId) : null };
}
