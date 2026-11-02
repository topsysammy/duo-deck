/**
 * Content model (PRD §6): Category → Deck → Level → Card.
 * Decks ship as static JSON in /content/decks/*.json.
 */

export type CardType = "question" | "would_you_rather" | "activity" | "dare";

/** Spice: 0 = clean, 1–3 = increasingly flirty (Spicy decks only). */
export type SpiceLevel = 0 | 1 | 2 | 3;

export interface Card {
  id: string;
  deck_id: string;
  /** 1-based level number; must exist in the deck's `levels`. */
  level: number;
  type: CardType;
  text: string;
  option_a: string | null;
  option_b: string | null;
  tags: string[];
  spice_level: SpiceLevel;
  locale: string;
  version: number;
}

/** Game mode a deck plays in. "truth_or_dare" is reserved for GP-7 (P1). */
export type DeckMode = "qa" | "would_you_rather";

export interface Level {
  id: number;
  name: string;
  blurb: string;
}

export type CategoryId =
  | "romance"
  | "deep-talk"
  | "fun"
  | "date-night"
  | "spicy"
  | "faith-family";

/** Named accent swatches defined as design tokens in globals.css. */
export type Accent =
  | "cream"
  | "orange"
  | "magenta"
  | "purple"
  | "blue"
  | "berry"
  | "sky"
  | "yellow";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  accent: Accent;
  /** Spicy categories are hidden by the content filter and need the 18+ gate. */
  is_spicy: boolean;
  order: number;
}

export interface Deck {
  id: string;
  /** URL slug; equal to `id` for launch decks. */
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category_id: CategoryId;
  mode: DeckMode;
  /** Optional override of the category accent. */
  accent?: Accent;
  is_spicy: boolean;
  locale: string;
  version: number;
  levels: Level[];
  cards: Card[];
}

/** Deck without its cards — what Home and lists need. */
export type DeckSummary = Omit<Deck, "cards"> & {
  card_count: number;
  level_counts: Record<number, number>;
};

export interface ContentManifest {
  version: number;
  decks: Record<string, { version: number; card_count: number }>;
}
