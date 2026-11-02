"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Deck } from "@/lib/content/types";
import { db, type ActiveSession, type SessionRecord } from "@/lib/db/dexie";
import * as engine from "@/lib/engine/deck-engine";
import { randomSeed } from "@/lib/engine/rng";
import { NEW_ROUND, type WyrRound } from "@/lib/engine/wyr";

/** 1 = forward (next/skip/jump), -1 = back. Drives the swipe direction. */
export type Direction = 1 | -1;

function newActive(deck: Deck, startLevel: number | undefined, seenBefore: string[] = []): ActiveSession {
  const now = Date.now();
  return {
    key: deck.id,
    deckVersion: deck.version,
    startedAt: now,
    updatedAt: now,
    engine: engine.createSession(deck.cards, { seed: randomSeed(), startLevel, seenBefore }),
    wyr: {},
    favoritedIds: [],
  };
}

/**
 * Loads or resumes the game for a deck, persists every change to IndexedDB,
 * and exposes the engine actions. Falls back to memory if storage is blocked.
 */
export type PlayMode = "deck" | "favorites";

export function usePlaySession(deck: Deck | null, startLevel: number | undefined, mode: PlayMode = "deck") {
  /** The favorites mini-deck changes as hearts change, so it always starts fresh and isn't resumed. */
  const persist = mode === "deck";
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [direction, setDirection] = useState<Direction>(1);
  const loadedFor = useRef<string | null>(null);

  // Load or resume once per deck.
  useEffect(() => {
    if (!deck || loadedFor.current === deck.id) return;
    loadedFor.current = deck.id;
    let cancelled = false;
    (async () => {
      let next: ActiveSession;
      if (!persist) {
        if (!cancelled) setActive(newActive(deck, startLevel));
        return;
      }
      try {
        const existing = await db.activeSessions.get(deck.id);
        if (existing && existing.deckVersion === deck.version && !existing.engine.completed) {
          next = existing;
          if (startLevel !== undefined && engine.currentLevel(existing.engine) !== startLevel) {
            next = { ...existing, engine: engine.jumpToLevel(existing.engine, startLevel) };
          }
        } else {
          const progress = await db.deckProgress.get(deck.id);
          next = newActive(deck, startLevel, progress?.seenIds);
        }
      } catch {
        next = newActive(deck, startLevel);
      }
      if (!cancelled) setActive(next);
    })();
    return () => {
      cancelled = true;
      loadedFor.current = null;
    };
  }, [deck, startLevel, persist]);

  // Persist after every change.
  useEffect(() => {
    if (active && persist) db.activeSessions.put(active).catch(() => {});
  }, [active, persist]);

  const update = useCallback((fn: (s: engine.EngineState) => engine.EngineState, dir: Direction) => {
    setDirection(dir);
    setActive((a) => (a ? { ...a, engine: fn(a.engine), updatedAt: Date.now() } : a));
  }, []);

  const actions = {
    next: useCallback(() => update(engine.next, 1), [update]),
    prev: useCallback(() => update(engine.prev, -1), [update]),
    skip: useCallback(() => update(engine.skip, 1), [update]),
    jumpToLevel: useCallback((level: number) => update((s) => engine.jumpToLevel(s, level), 1), [update]),

    setWyr: useCallback((cardId: string, round: WyrRound) => {
      setActive((a) => (a ? { ...a, wyr: { ...a.wyr, [cardId]: round } } : a));
    }, []),

    noteFavorite: useCallback((cardId: string, on: boolean) => {
      setActive((a) =>
        a
          ? {
              ...a,
              favoritedIds: on
                ? [...new Set([...a.favoritedIds, cardId])]
                : a.favoritedIds.filter((id) => id !== cardId),
            }
          : a,
      );
    }, []),

    /** "Reset deck": forget seen cards and reshuffle from level 1. */
    reset: useCallback(async () => {
      if (!deck) return;
      if (persist) await db.deckProgress.delete(deck.id).catch(() => {});
      setDirection(1);
      setActive(newActive(deck, undefined));
    }, [deck, persist]),

    /** Ends the game: saves the session and seen cards, returns the session id. */
    end: useCallback(async (): Promise<string | null> => {
      if (!deck || !active) return null;
      const seen = engine.seenIds(active.engine);
      const record: SessionRecord = {
        id: crypto.randomUUID(),
        deckId: deck.id,
        mode,
        cardsSeen: seen,
        skipped: active.engine.skipCount,
        favoritesSaved: active.favoritedIds.length,
        favoritedIds: active.favoritedIds,
        completed: active.engine.completed,
        startedAt: active.startedAt,
        endedAt: Date.now(),
        synced: 0,
      };
      try {
        await db.transaction("rw", db.sessions, db.deckProgress, db.activeSessions, async () => {
          await db.sessions.add(record);
          if (!persist) return;
          const progress = await db.deckProgress.get(deck.id);
          await db.deckProgress.put({
            deckId: deck.id,
            seenIds: [...new Set([...(progress?.seenIds ?? []), ...seen])],
            updatedAt: Date.now(),
          });
          await db.activeSessions.delete(deck.id);
        });
      } catch (err) {
        console.warn("Could not save session", err);
      }
      return record.id;
    }, [deck, active, mode, persist]),
  };

  const cardId = active ? engine.currentCardId(active.engine) : null;

  return {
    active,
    direction,
    cardId,
    wyrRound: (cardId && active?.wyr[cardId]) || NEW_ROUND,
    actions,
  };
}
