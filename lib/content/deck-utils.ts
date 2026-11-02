import type { Accent, Category, Deck, DeckSummary } from "./types";

/** Seconds of conversation we budget per card when estimating play time. */
const SECONDS_PER_CARD = 25;

export function toSummary(deck: Deck): DeckSummary {
  const { cards, ...rest } = deck;
  const level_counts: Record<number, number> = {};
  for (const level of deck.levels) level_counts[level.id] = 0;
  for (const card of cards) level_counts[card.level] = (level_counts[card.level] ?? 0) + 1;
  return { ...rest, card_count: cards.length, level_counts };
}

/** Rough play time, rounded to 5 minutes (minimum 5). */
export function estimateMinutes(cardCount: number): number {
  const minutes = (cardCount * SECONDS_PER_CARD) / 60;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

export function deckAccent(deck: Pick<Deck, "accent" | "category_id">, categories: Category[]): Accent {
  if (deck.accent) return deck.accent;
  return categories.find((c) => c.id === deck.category_id)?.accent ?? "cream";
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "15 cards · 3 levels" */
export function deckMeta(summary: Pick<DeckSummary, "card_count" | "levels">): string {
  return `${pluralize(summary.card_count, "card")} · ${pluralize(summary.levels.length, "level")}`;
}
