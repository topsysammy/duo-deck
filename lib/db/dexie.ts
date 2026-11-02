/**
 * Local guest data (IndexedDB via Dexie). Source of truth on the device;
 * Phase 5 syncs favorites and sessions to Supabase for signed-in users.
 */
import Dexie, { type Table } from "dexie";
import type { EngineState } from "@/lib/engine/deck-engine";
import type { WyrRound } from "@/lib/engine/wyr";
import type { Mood, RelationshipStage } from "@/lib/prefs/filters";

export interface Settings {
  id: "local";
  partnerA: string;
  partnerB: string;
  stage: RelationshipStage | null;
  moods: Mood[];
  hideSpicy: boolean;
  is18Confirmed: boolean;
  onboardingDone: boolean;
  installPromptSeen: boolean;
  updatedAt: number;
}

export interface Favorite {
  cardId: string;
  deckId: string;
  createdAt: number;
  /** Tombstone so removals sync across devices (Phase 5). */
  deletedAt: number | null;
  /** 0/1 — IndexedDB can't index booleans. */
  synced: 0 | 1;
  /** Private note on a favorite (EN-2, P1). */
  note?: string;
}

export interface SessionRecord {
  id: string;
  deckId: string;
  /** "favorites" for the favorites mini-deck. */
  mode: "deck" | "favorites";
  cardsSeen: string[];
  skipped: number;
  favoritesSaved: number;
  /** Cards hearted during the session, for the session end screen. */
  favoritedIds: string[];
  completed: boolean;
  startedAt: number;
  endedAt: number;
  synced: 0 | 1;
}

/** A game in progress, so a reload or app update resumes mid-deck. */
export interface ActiveSession {
  /** Deck id, or "favorites". */
  key: string;
  deckVersion: number;
  startedAt: number;
  updatedAt: number;
  engine: EngineState;
  /** Would You Rather picks per card id. */
  wyr: Record<string, WyrRound>;
  /** Cards hearted during this session (for the session end screen). */
  favoritedIds: string[];
}

/** Cards seen per deck across sessions (GP-5); cleared by "Reset deck". */
export interface DeckProgress {
  deckId: string;
  seenIds: string[];
  updatedAt: number;
}

class DuoDeckDB extends Dexie {
  settings!: Table<Settings, string>;
  favorites!: Table<Favorite, string>;
  sessions!: Table<SessionRecord, string>;
  activeSessions!: Table<ActiveSession, string>;
  deckProgress!: Table<DeckProgress, string>;

  constructor() {
    super("duo-deck");
    this.version(1).stores({
      settings: "id",
      favorites: "cardId, deckId, createdAt, synced",
      sessions: "id, deckId, startedAt, synced",
      activeSessions: "key",
      deckProgress: "deckId",
    });
  }
}

export const db = new DuoDeckDB();

export const DEFAULT_SETTINGS: Settings = {
  id: "local",
  partnerA: "",
  partnerB: "",
  stage: null,
  moods: [],
  hideSpicy: true,
  is18Confirmed: false,
  onboardingDone: false,
  installPromptSeen: false,
  updatedAt: 0,
};

export async function getSettings(): Promise<Settings> {
  try {
    return { ...DEFAULT_SETTINGS, ...(await db.settings.get("local")) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
