import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES, DECKS, MANIFEST } from "./registry";
import { deckMeta, estimateMinutes, toSummary } from "./deck-utils";

const CARD_TYPES = ["question", "would_you_rather", "activity", "dare"];
const MODES = ["qa", "would_you_rather"];
const ACCENTS = ["cream", "orange", "magenta", "purple", "blue", "berry", "sky", "yellow"];
const MAX_PROMPT_LENGTH = 140;

describe("content packs", () => {
  it("registers every JSON file in /content/decks", () => {
    const files = readdirSync(join(process.cwd(), "content/decks"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(DECKS.map((d) => d.id).sort()).toEqual(files);
  });

  it("matches the manifest (version and card count per deck)", () => {
    expect(Object.keys(MANIFEST.decks).sort()).toEqual(DECKS.map((d) => d.id).sort());
    for (const deck of DECKS) {
      expect(MANIFEST.decks[deck.id], deck.id).toEqual({
        version: deck.version,
        card_count: deck.cards.length,
      });
    }
  });

  it("has valid categories", () => {
    for (const c of CATEGORIES) expect(ACCENTS, c.id).toContain(c.accent);
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
  });

  it("uses globally unique card ids", () => {
    const ids = DECKS.flatMap((d) => d.cards.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const deck of DECKS) {
    describe(deck.id, () => {
      const category = CATEGORIES.find((c) => c.id === deck.category_id);

      it("has valid deck fields", () => {
        expect(deck.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(category, "category exists").toBeDefined();
        expect(MODES).toContain(deck.mode);
        if (deck.accent) expect(ACCENTS).toContain(deck.accent);
        expect(deck.is_spicy).toBe(category?.is_spicy);
        expect(deck.levels.map((l) => l.id)).toEqual(deck.levels.map((_, i) => i + 1));
        expect(deck.cards.length).toBeGreaterThan(0);
      });

      it("has every level populated", () => {
        for (const level of deck.levels) {
          expect(deck.cards.some((c) => c.level === level.id), `level ${level.id}`).toBe(true);
        }
      });

      it("has cards that follow the schema and writing rules", () => {
        for (const card of deck.cards) {
          const where = card.id;
          expect(card.deck_id, where).toBe(deck.id);
          expect(card.id.startsWith(`${deck.id}-`), where).toBe(true);
          expect(CARD_TYPES, where).toContain(card.type);
          expect(deck.levels.some((l) => l.id === card.level), where).toBe(true);
          expect(card.text.trim().length, where).toBeGreaterThan(0);
          expect(card.text.length, `${where} under ${MAX_PROMPT_LENGTH} chars`).toBeLessThanOrEqual(
            MAX_PROMPT_LENGTH,
          );
          expect(card.tags, where).toContain("draft");
          expect(Number.isInteger(card.version) && card.version >= 1, where).toBe(true);
          expect(card.locale, where).toBe("en");

          if (card.type === "would_you_rather") {
            expect(card.option_a, where).toBeTruthy();
            expect(card.option_b, where).toBeTruthy();
          } else {
            expect(card.option_a, where).toBeNull();
            expect(card.option_b, where).toBeNull();
          }

          if (deck.is_spicy) {
            expect(card.spice_level, where).toBeGreaterThanOrEqual(1);
          } else {
            expect(card.spice_level, `${where} non-spicy decks are spice 0`).toBe(0);
          }
          expect([0, 1, 2, 3], where).toContain(card.spice_level);
        }
      });

      it("uses Would You Rather cards only in Would You Rather decks", () => {
        const wyr = deck.cards.every((c) => c.type === "would_you_rather");
        expect(wyr).toBe(deck.mode === "would_you_rather");
      });
    });
  }
});

describe("deck utils", () => {
  it("summarises card and level counts", () => {
    const deep = DECKS.find((d) => d.id === "deep-talk")!;
    const s = toSummary(deep);
    expect(s.card_count).toBe(20);
    expect(s.level_counts).toEqual({ 1: 6, 2: 7, 3: 7 });
    expect("cards" in s).toBe(false);
    expect(deckMeta(s)).toBe("20 cards · 3 levels");
  });

  it("estimates minutes in 5-minute steps", () => {
    expect(estimateMinutes(1)).toBe(5);
    expect(estimateMinutes(15)).toBe(5);
    expect(estimateMinutes(75)).toBe(30);
  });
});

describe("glyph coverage", () => {
  // Outfit (card + OG font) has no glyphs beyond Latin-1 punctuation; e.g. ₦ is missing.
  it("uses only characters the card fonts can render", () => {
    const allowed = /^[ -~ -ÿ‘’“”–—…]*$/;
    for (const deck of DECKS) {
      for (const c of deck.cards) {
        for (const t of [c.text, c.option_a ?? "", c.option_b ?? ""]) expect(t, c.id).toMatch(allowed);
      }
    }
  });
});
