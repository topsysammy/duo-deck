import "server-only";
import { CATEGORIES, DECKS } from "./registry";
import { deckAccent, toSummary } from "./deck-utils";
import type { Accent, Category, Deck, DeckSummary } from "./types";

export function getCategories(): Category[] {
  return CATEGORIES;
}

export function getDeck(slug: string): Deck | undefined {
  return DECKS.find((d) => d.slug === slug);
}

export function getDeckSummaries(): DeckSummary[] {
  return DECKS.map(toSummary);
}

export function getAllDeckSlugs(): string[] {
  return DECKS.map((d) => d.slug);
}

/**
 * Sample cards for the Deck detail page: the first card of each level,
 * topped up from level 1 so there are always three.
 */
export function getSampleCards(deck: Deck, count = 3) {
  const picks = deck.levels
    .map((l) => deck.cards.find((c) => c.level === l.id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  for (const card of deck.cards) {
    if (picks.length >= count) break;
    if (!picks.includes(card)) picks.push(card);
  }
  return picks.slice(0, count);
}

/** Name, spiciness and accent per deck id — small enough to send to the client. */
export function getDeckInfoMap(): Record<string, { name: string; is_spicy: boolean; accent: Accent }> {
  const categories = getCategories();
  return Object.fromEntries(
    DECKS.map((d) => [d.id, { name: d.name, is_spicy: d.is_spicy, accent: deckAccent(d, categories) }]),
  );
}
