import { describe, expect, it } from "vitest";
import {
  canGoBack,
  createSession,
  currentCardId,
  currentLevel,
  jumpToLevel,
  levelProgress,
  next,
  prev,
  remainingCount,
  seenIds,
  skip,
  turnIndex,
  type EngineCard,
  type EngineState,
} from "./deck-engine";
import { mulberry32, shuffle } from "./rng";
import { NEW_ROUND, handOver, isMatch, pick } from "./wyr";

/** 3 levels × 3 cards: L1-1..L1-3, L2-1.., L3-1.. */
const CARDS: EngineCard[] = [1, 2, 3].flatMap((level) =>
  [1, 2, 3].map((n) => ({ id: `L${level}-${n}`, level })),
);
const ONE_LEVEL: EngineCard[] = ["a", "b", "c", "d"].map((id) => ({ id, level: 1 }));

function playAll(s: EngineState, step = next): string[] {
  const shown = [currentCardId(s)!];
  for (let guard = 0; guard < 100 && !s.completed; guard++) {
    s = step(s);
    if (!s.completed) shown.push(currentCardId(s)!);
  }
  return shown;
}

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], mulberry32(42));
    const b = shuffle([1, 2, 3, 4, 5, 6], mulberry32(42));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("createSession", () => {
  it("starts on a level-1 card", () => {
    const s = createSession(CARDS, { seed: 1 });
    expect(currentLevel(s)).toBe(1);
    expect(s.position).toBe(0);
    expect(s.completed).toBe(false);
  });

  it("can start at a chosen level", () => {
    const s = createSession(CARDS, { seed: 1, startLevel: 3 });
    expect(currentLevel(s)).toBe(3);
  });

  it("ignores an unknown start level", () => {
    expect(currentLevel(createSession(CARDS, { seed: 1, startLevel: 9 }))).toBe(1);
  });

  it("handles an empty deck", () => {
    const s = createSession([], { seed: 1 });
    expect(s.completed).toBe(true);
    expect(currentCardId(s)).toBeNull();
  });

  it("shuffles differently with different seeds", () => {
    const orders = new Set([1, 2, 3, 4, 5].map((seed) => playAll(createSession(ONE_LEVEL, { seed })).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("puts cards seen in earlier sessions after fresh ones", () => {
    const s = createSession(ONE_LEVEL, { seed: 7, seenBefore: ["a", "b"] });
    const shown = playAll(s);
    expect(shown.slice(0, 2).sort()).toEqual(["c", "d"]);
    expect(shown.slice(2).sort()).toEqual(["a", "b"]);
  });
});

describe("next", () => {
  it("shows every card exactly once, levels in order, then completes", () => {
    const shown = playAll(createSession(CARDS, { seed: 3 }));
    expect(shown).toHaveLength(9);
    expect(new Set(shown).size).toBe(9);
    expect(shown.map((id) => id.slice(0, 2))).toEqual(["L1", "L1", "L1", "L2", "L2", "L2", "L3", "L3", "L3"]);
  });

  it("does nothing once complete", () => {
    let s = createSession(ONE_LEVEL, { seed: 1 });
    for (let i = 0; i < 4; i++) s = next(s);
    expect(s.completed).toBe(true);
    expect(next(s)).toBe(s);
  });
});

describe("prev", () => {
  it("reviews earlier cards and walks forward through them again", () => {
    let s = createSession(ONE_LEVEL, { seed: 2 });
    const first = currentCardId(s);
    s = next(s);
    const second = currentCardId(s);
    s = prev(s);
    expect(currentCardId(s)).toBe(first);
    s = next(s);
    expect(currentCardId(s)).toBe(second);
    expect(remainingCount(s)).toBe(2);
  });

  it("is a no-op on the first card", () => {
    const s = createSession(ONE_LEVEL, { seed: 2 });
    expect(canGoBack(s)).toBe(false);
    expect(prev(s)).toBe(s);
  });

  it("re-opens a completed session", () => {
    let s = createSession(ONE_LEVEL, { seed: 2 });
    for (let i = 0; i < 4; i++) s = next(s);
    expect(s.completed).toBe(true);
    s = prev(s);
    expect(s.completed).toBe(false);
  });
});

describe("skip", () => {
  it("sends the card to the end of the deck, after the last level", () => {
    let s = createSession(CARDS, { seed: 4 });
    const skipped = currentCardId(s)!;
    s = skip(s);
    expect(s.skipCount).toBe(1);
    const rest = playAll(s);
    expect(rest.at(-1)).toBe(skipped);
    expect(rest).toHaveLength(9);
    expect(new Set(rest).size).toBe(9);
  });

  it("removes the skipped card from history so back skips over it", () => {
    let s = createSession(ONE_LEVEL, { seed: 5 });
    const first = currentCardId(s);
    s = next(s);
    s = skip(s);
    s = prev(s);
    expect(currentCardId(s)).toBe(first);
  });

  it("moves forward when skipping a card being reviewed", () => {
    let s = createSession(ONE_LEVEL, { seed: 5 });
    s = next(s);
    const second = currentCardId(s);
    s = skip(prev(s));
    expect(currentCardId(s)).toBe(second);
    expect(s.skipped).toEqual([]);
  });

  it("keeps the last card when there is nothing else left", () => {
    let s = createSession(ONE_LEVEL, { seed: 5 });
    for (let i = 0; i < 3; i++) s = next(s);
    expect(remainingCount(s)).toBe(0);
    expect(skip(s)).toBe(s);
  });

  it("lets a skipped card be skipped again", () => {
    let s = createSession([{ id: "x", level: 1 }, { id: "y", level: 1 }], { seed: 1 });
    const a = currentCardId(s)!;
    s = skip(s); // a → end
    const b = currentCardId(s)!;
    s = skip(s); // b → end, a comes back
    expect(currentCardId(s)).toBe(a);
    s = next(s);
    expect(currentCardId(s)).toBe(b);
    s = next(s);
    expect(s.completed).toBe(true);
  });
});

describe("levels", () => {
  it("jumps to another level and comes back to unplayed cards afterwards", () => {
    let s = createSession(CARDS, { seed: 6 });
    s = jumpToLevel(s, 3);
    expect(currentLevel(s)).toBe(3);
    const shown = playAll(s);
    expect(new Set([currentCardId(createSession(CARDS, { seed: 6 }))!, ...shown]).size).toBe(9);
  });

  it("ignores a jump to an empty or unknown level", () => {
    let s = createSession(CARDS, { seed: 6 });
    expect(jumpToLevel(s, 7)).toBe(s);
    s = next(next(s)); // all three L1 cards shown
    expect(jumpToLevel(s, 1)).toBe(s);
  });

  it("reports progress within the current level", () => {
    let s = createSession(CARDS, { seed: 8 });
    expect(levelProgress(s)).toEqual({ level: 1, index: 1, total: 3 });
    s = next(s);
    expect(levelProgress(s)).toEqual({ level: 1, index: 2, total: 3 });
    s = next(next(s));
    expect(levelProgress(s)).toEqual({ level: 2, index: 1, total: 3 });
    s = prev(s);
    expect(levelProgress(s)).toEqual({ level: 1, index: 3, total: 3 });
  });
});

describe("turns and stats", () => {
  it("alternates turns per card and follows review", () => {
    let s = createSession(ONE_LEVEL, { seed: 9 });
    expect(turnIndex(s)).toBe(0);
    s = next(s);
    expect(turnIndex(s)).toBe(1);
    s = next(s);
    expect(turnIndex(s)).toBe(0);
    expect(turnIndex(prev(s))).toBe(1);
  });

  it("counts unique cards seen, not skipped ones", () => {
    let s = createSession(ONE_LEVEL, { seed: 9 });
    s = skip(s);
    s = next(s);
    expect(seenIds(s)).toHaveLength(2);
  });

  it("stays JSON-serialisable for storage", () => {
    const s = next(skip(createSession(CARDS, { seed: 10 })));
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe("would you rather", () => {
  it("runs pick → pass → pick → reveal", () => {
    let r = pick(NEW_ROUND, "a");
    expect(r.phase).toBe("pass");
    expect(pick(r, "b")).toBe(r); // can't pick while passing
    r = handOver(r);
    expect(r.phase).toBe("second");
    r = pick(r, "a");
    expect(r).toEqual({ phase: "reveal", first: "a", second: "a" });
    expect(isMatch(r)).toBe(true);
  });

  it("detects different picks", () => {
    const r = pick(handOver(pick(NEW_ROUND, "a")), "b");
    expect(isMatch(r)).toBe(false);
  });
});
