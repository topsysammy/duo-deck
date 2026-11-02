import manifest from "@/content/manifest.json";
import type { Card, ContentManifest, Deck } from "./types";

const MANIFEST = manifest as ContentManifest;

/** URL of a published deck pack (see scripts/copy-decks.mjs). */
export function deckDataUrl(slug: string, version: number): string {
  return `/decks/${slug}.v${version}.json`;
}

/** Client-side fetch of a deck pack. The service worker (Phase 4) serves it offline. */
export async function fetchDeck(slug: string, version: number, signal?: AbortSignal): Promise<Deck> {
  const res = await fetch(deckDataUrl(slug, version), { signal });
  if (!res.ok) throw new Error(`Deck ${slug} failed to load (${res.status})`);
  return (await res.json()) as Deck;
}

const cache = new Map<string, Promise<Deck>>();

/** Loads a deck pack by id at its manifest version, once per page load. */
export function loadDeck(deckId: string): Promise<Deck> {
  const entry = MANIFEST.decks[deckId];
  if (!entry) return Promise.reject(new Error(`Unknown deck ${deckId}`));
  let p = cache.get(deckId);
  if (!p) {
    p = fetchDeck(deckId, entry.version).catch((err) => {
      cache.delete(deckId);
      throw err;
    });
    cache.set(deckId, p);
  }
  return p;
}

/** Resolves card refs (from favorites or sessions) to cards, keeping order. Missing cards are dropped. */
export async function resolveCards(refs: { cardId: string; deckId: string }[]): Promise<Card[]> {
  const deckIds = [...new Set(refs.map((r) => r.deckId))];
  const decks = await Promise.all(deckIds.map((id) => loadDeck(id).catch(() => null)));
  const byId = new Map<string, Card>();
  for (const deck of decks) for (const card of deck?.cards ?? []) byId.set(card.id, card);
  return refs.map((r) => byId.get(r.cardId)).filter((c): c is Card => Boolean(c));
}
