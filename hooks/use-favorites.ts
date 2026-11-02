"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Card, Deck } from "@/lib/content/types";
import { resolveCards } from "@/lib/content/fetch-deck";
import { db, type Favorite } from "@/lib/db/dexie";

export interface FavoriteItem {
  fav: Favorite;
  card: Card;
}

async function activeFavorites(): Promise<Favorite[]> {
  const all = await db.favorites.orderBy("createdAt").reverse().toArray();
  return all.filter((f) => !f.deletedAt);
}

const isSpicy = (c: Card) => c.spice_level > 0;

/** Live list of favorited cards, newest first (EN-1). Spicy cards are left out unless allowed (CB-4). */
export function useFavoriteCards(allowSpicy: boolean) {
  const favs = useLiveQuery(activeFavorites, [], null);
  const [items, setItems] = useState<FavoriteItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!favs) return;
    let cancelled = false;
    resolveCards(favs)
      .then((cards) => {
        if (cancelled) return;
        const byId = new Map(cards.map((c) => [c.id, c]));
        setItems(
          favs.flatMap((fav) => {
            const card = byId.get(fav.cardId);
            return card && (allowSpicy || !isSpicy(card)) ? [{ fav, card }] : [];
          }),
        );
        setError(cards.length < favs.length);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [favs, allowSpicy]);

  return { items, loading: items === null, partial: error };
}

export const FAVORITES_DECK_ID = "favorites";

export function favoritesDeck(cards: Card[]): Deck {
  return {
    id: FAVORITES_DECK_ID,
    slug: FAVORITES_DECK_ID,
    name: "My favorites",
    tagline: "",
    description: "",
    category_id: "romance",
    mode: "qa",
    is_spicy: false,
    locale: "en",
    version: 1,
    levels: [{ id: 1, name: "All cards", blurb: "your saved cards" }],
    // One level: the mini-deck mixes cards from several decks and levels.
    cards: cards.map((c) => ({ ...c, level: 1 })),
  };
}

type DeckData =
  | { status: "loading"; deck: null }
  | { status: "ready"; deck: Deck }
  | { status: "empty"; deck: null }
  | { status: "error"; deck: null };

/** Snapshot of favorites as a playable mini-deck. Taken once, so un-hearting mid-game doesn't reshuffle. */
export function useFavoritesDeck(allowSpicy: boolean, ready = true) {
  const [state, setState] = useState<DeckData>({ status: "loading", deck: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setState({ status: "loading", deck: null });
    (async () => {
      try {
        const cards = (await resolveCards(await activeFavorites())).filter((c) => allowSpicy || !isSpicy(c));
        if (cancelled) return;
        setState(cards.length ? { status: "ready", deck: favoritesDeck(cards) } : { status: "empty", deck: null });
      } catch {
        if (!cancelled) setState({ status: "error", deck: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, allowSpicy, ready]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
