/**
 * Pure rules for which decks are visible and how "For you" is ordered.
 * No React, no storage: inputs in, decks out. Quiz answers (Phase 4) feed `Prefs`.
 */
import type { CategoryId, DeckSummary } from "@/lib/content/types";

export type RelationshipStage = "new" | "dating" | "long_term" | "married";
export type Mood = "fun" | "deep" | "spicy";

export interface Prefs {
  stage: RelationshipStage | null;
  moods: Mood[];
  /** Faith-friendly / content filter. On by default (CB-4). */
  hideSpicy: boolean;
  /** 18+ confirmation (ON-6). Spicy shows only when confirmed AND filter is off. */
  is18Confirmed: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  stage: null,
  moods: [],
  hideSpicy: true,
  is18Confirmed: false,
};

export function canSeeSpicy(prefs: Pick<Prefs, "hideSpicy" | "is18Confirmed">): boolean {
  return prefs.is18Confirmed && !prefs.hideSpicy;
}

export function visibleDecks<T extends Pick<DeckSummary, "is_spicy">>(decks: T[], prefs: Prefs): T[] {
  const spicyOk = canSeeSpicy(prefs);
  return decks.filter((d) => spicyOk || !d.is_spicy);
}

/** Deck boosts by relationship stage (by deck id). */
const STAGE_WEIGHTS: Record<RelationshipStage, Record<string, number>> = {
  new: { "first-spark": 4, "this-or-that": 3, "date-night-in": 2, "love-languages": 1 },
  dating: { "deep-talk": 4, "love-languages": 3, "date-night-in": 2, "money-matters": 1 },
  long_term: { "deep-talk": 4, "date-night-in": 3, "money-matters": 2, "love-languages": 1 },
  married: { "faith-and-family": 4, "date-night-in": 3, "money-matters": 2, "deep-talk": 1 },
};

/** With no quiz answers, a balanced default. */
const DEFAULT_WEIGHTS: Record<string, number> = {
  "deep-talk": 4,
  "first-spark": 3,
  "date-night-in": 2,
  "love-languages": 1,
};

const MOOD_CATEGORY_BOOST: Record<Mood, Partial<Record<CategoryId, number>>> = {
  fun: { fun: 3, "date-night": 1 },
  deep: { "deep-talk": 3, "faith-family": 1, romance: 1 },
  spicy: { spicy: 5, romance: 1 },
};

/**
 * Visible decks sorted best-first for these prefs. Ties keep input order,
 * so the registry order is the final tie-breaker.
 */
export function rankDecks<T extends Pick<DeckSummary, "id" | "category_id" | "is_spicy">>(
  decks: T[],
  prefs: Prefs,
): T[] {
  const weights = prefs.stage ? STAGE_WEIGHTS[prefs.stage] : DEFAULT_WEIGHTS;
  const score = (d: T) =>
    (weights[d.id] ?? 0) +
    prefs.moods.reduce((sum, mood) => sum + (MOOD_CATEGORY_BOOST[mood][d.category_id] ?? 0), 0);

  return visibleDecks(decks, prefs)
    .map((deck, index) => ({ deck, index, score: score(deck) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.deck);
}

export function forYou<T extends Pick<DeckSummary, "id" | "category_id" | "is_spicy">>(
  decks: T[],
  prefs: Prefs,
  count = 4,
): T[] {
  return rankDecks(decks, prefs).slice(0, count);
}
