/**
 * Card deck engine (PRD §5.2). Pure and serialisable: every function takes a
 * state and returns a new one, so it can be unit-tested, stored in IndexedDB
 * for resume, and (later) synced between two devices for remote play (GP-8).
 *
 * Rules
 * - Each level is shuffled on its own; levels play in order (GP-4, GP-5).
 * - A card is drawn at most once per session, except skipped cards, which
 *   return at the end of the deck, after the last level (GP-6).
 * - `prev` reviews earlier cards; `next` walks forward through them again
 *   before drawing a new card. Reviewing is not a repeat.
 * - Cards already seen in earlier sessions go after unseen ones in each level,
 *   so a new session starts with fresh cards until the deck is reset.
 */
import { mulberry32, shuffle } from "./rng";

export interface EngineCard {
  id: string;
  level: number;
}

export interface EngineState {
  /** Level ids in play order. */
  levels: number[];
  /** Card id → level, for every card in the deck. */
  levelOf: Record<string, number>;
  /** Undrawn card ids per level; front is drawn next. */
  queues: Record<number, string[]>;
  /** Skipped cards waiting for the end of the deck, in skip order. */
  skipped: string[];
  /** Cards shown, in order. Skipped cards are removed from here. */
  history: string[];
  /** Index into `history` of the card on screen; -1 only for an empty deck. */
  position: number;
  /** Level being drawn from. */
  level: number;
  skipCount: number;
  completed: boolean;
}

export interface CreateOptions {
  seed: number;
  /** Level to start at; defaults to the first level. */
  startLevel?: number;
  /** Ids seen in earlier sessions; shuffled to the back of their level. */
  seenBefore?: readonly string[];
}

export function createSession(cards: readonly EngineCard[], opts: CreateOptions): EngineState {
  const rand = mulberry32(opts.seed);
  const levels = [...new Set(cards.map((c) => c.level))].sort((a, b) => a - b);
  const seen = new Set(opts.seenBefore ?? []);
  const levelOf: Record<string, number> = {};
  const queues: Record<number, string[]> = {};

  for (const level of levels) {
    const ids = cards.filter((c) => c.level === level).map((c) => c.id);
    const fresh = ids.filter((id) => !seen.has(id));
    const stale = ids.filter((id) => seen.has(id));
    queues[level] = [...shuffle(fresh, rand), ...shuffle(stale, rand)];
  }
  for (const c of cards) levelOf[c.id] = c.level;

  const startLevel =
    opts.startLevel !== undefined && levels.includes(opts.startLevel) ? opts.startLevel : (levels[0] ?? 1);

  const base: EngineState = {
    levels,
    levelOf,
    queues,
    skipped: [],
    history: [],
    position: -1,
    level: startLevel,
    skipCount: 0,
    completed: cards.length === 0,
  };
  return cards.length === 0 ? base : draw(base);
}

/** Id of the card on screen, or null when the deck is empty. */
export function currentCardId(s: EngineState): string | null {
  return s.history[s.position] ?? null;
}

export function isReviewing(s: EngineState): boolean {
  return s.position < s.history.length - 1;
}

export function canGoBack(s: EngineState): boolean {
  return s.position > 0;
}

/** Cards still to draw (excluding the one on screen), including skipped ones. */
export function remainingCount(s: EngineState): number {
  return s.levels.reduce((n, l) => n + (s.queues[l]?.length ?? 0), 0) + s.skipped.length;
}

export function remainingInLevel(s: EngineState, level: number): number {
  return s.queues[level]?.length ?? 0;
}

/** Draws the next card at the tip of history, moving through levels, then skipped cards. */
function draw(s: EngineState): EngineState {
  const order = [s.level, ...s.levels.filter((l) => l > s.level), ...s.levels.filter((l) => l < s.level)];
  for (const level of order) {
    const queue = s.queues[level] ?? [];
    const [id, ...rest] = queue;
    if (id !== undefined) {
      const history = [...s.history, id];
      return { ...s, level, queues: { ...s.queues, [level]: rest }, history, position: history.length - 1 };
    }
  }
  const [id, ...rest] = s.skipped;
  if (id !== undefined) {
    const history = [...s.history, id];
    return { ...s, level: s.levelOf[id] ?? s.level, skipped: rest, history, position: history.length - 1 };
  }
  return { ...s, completed: true };
}

/** Swipe left / Next. At the last card this marks the session complete. */
export function next(s: EngineState): EngineState {
  if (s.completed) return s;
  if (isReviewing(s)) return { ...s, position: s.position + 1 };
  return draw(s);
}

/** Swipe right / back: review the previous card. No-op on the first card. */
export function prev(s: EngineState): EngineState {
  if (!canGoBack(s)) return s;
  return { ...s, position: s.position - 1, completed: false };
}

/**
 * Skip the card on screen without penalty: it goes to the end of the deck.
 * Skipping while reviewing an earlier card just moves forward.
 */
export function skip(s: EngineState): EngineState {
  if (s.completed) return s;
  if (isReviewing(s)) return next(s);
  const id = currentCardId(s);
  if (id === null) return s;
  // Nothing else left: the skipped card would come straight back, so keep it.
  if (remainingCount(s) === 0) return s;
  const history = s.history.slice(0, -1);
  return draw({
    ...s,
    history,
    position: history.length - 1,
    skipped: [...s.skipped, id],
    skipCount: s.skipCount + 1,
  });
}

/**
 * Jump to a level (GP-4). Draws that level's next card. No-op if the level
 * has no cards left or does not exist.
 */
export function jumpToLevel(s: EngineState, level: number): EngineState {
  if (!s.levels.includes(level) || remainingInLevel(s, level) === 0) return s;
  // Jumping from a reviewed card continues from the tip of history.
  return draw({ ...s, level, position: s.history.length - 1, completed: false });
}

/** Level of the card on screen. */
export function currentLevel(s: EngineState): number {
  const id = currentCardId(s);
  return id ? (s.levelOf[id] ?? s.level) : s.level;
}

export interface LevelProgress {
  level: number;
  /** 1-based number of the card on screen within its level. */
  index: number;
  total: number;
}

/** "Card 3 of 5" for the level of the card on screen. */
export function levelProgress(s: EngineState): LevelProgress {
  const level = currentLevel(s);
  const total = Object.values(s.levelOf).filter((l) => l === level).length;
  const id = currentCardId(s);
  const shownInLevel = s.history.slice(0, s.position + 1).filter((h) => s.levelOf[h] === level);
  // A skipped card coming back is counted once, at its first showing in history.
  const index = id ? new Set(shownInLevel).size : 0;
  return { level, index: Math.min(index, total), total };
}

/** Unique cards actually shown this session (for "cards played" and seen tracking). */
export function seenIds(s: EngineState): string[] {
  return [...new Set(s.history)];
}

/** Whose turn it is for the card on screen: 0 or 1 (GP-2). */
export function turnIndex(s: EngineState): 0 | 1 {
  return (Math.max(s.position, 0) % 2) as 0 | 1;
}
