import { describe, expect, it } from "vitest";
import { DECKS } from "@/lib/content/registry";
import { toSummary } from "@/lib/content/deck-utils";
import { DEFAULT_PREFS, canSeeSpicy, forYou, rankDecks, visibleDecks, type Prefs } from "./filters";

const summaries = DECKS.map(toSummary);
const ids = (ds: { id: string }[]) => ds.map((d) => d.id);
const prefs = (p: Partial<Prefs>): Prefs => ({ ...DEFAULT_PREFS, ...p });

describe("content filter", () => {
  it("hides spicy decks by default", () => {
    const visible = visibleDecks(summaries, DEFAULT_PREFS);
    expect(visible.some((d) => d.is_spicy)).toBe(false);
    expect(visible).toHaveLength(8);
  });

  it("needs both 18+ confirmation and the filter off", () => {
    expect(canSeeSpicy({ is18Confirmed: true, hideSpicy: true })).toBe(false);
    expect(canSeeSpicy({ is18Confirmed: false, hideSpicy: false })).toBe(false);
    expect(canSeeSpicy({ is18Confirmed: true, hideSpicy: false })).toBe(true);
    expect(visibleDecks(summaries, prefs({ is18Confirmed: true, hideSpicy: false }))).toHaveLength(10);
  });
});

describe("For you", () => {
  it("defaults to a balanced pick led by Deep Talk", () => {
    expect(ids(forYou(summaries, DEFAULT_PREFS))).toEqual([
      "deep-talk",
      "first-spark",
      "date-night-in",
      "love-languages",
    ]);
  });

  it("leads with light decks for new couples", () => {
    expect(ids(forYou(summaries, prefs({ stage: "new" })))[0]).toBe("first-spark");
  });

  it("leads with Faith & Family for married couples", () => {
    expect(ids(forYou(summaries, prefs({ stage: "married" })))[0]).toBe("faith-and-family");
  });

  it("never recommends spicy decks while they are hidden, even if asked for", () => {
    const ranked = rankDecks(summaries, prefs({ moods: ["spicy"] }));
    expect(ranked.some((d) => d.is_spicy)).toBe(false);
  });

  it("boosts spicy decks when allowed and wanted", () => {
    const top = forYou(summaries, prefs({ moods: ["spicy"], is18Confirmed: true, hideSpicy: false }));
    expect(top[0]?.is_spicy).toBe(true);
  });

  it("returns every visible deck exactly once when ranking", () => {
    const ranked = rankDecks(summaries, DEFAULT_PREFS);
    expect(new Set(ids(ranked)).size).toBe(8);
  });
});
