import { describe, expect, it } from "vitest";
import { DECKS } from "@/lib/content/registry";
import { canShareAsImage, cardPath, cardShareText, deckPath, whatsappHref } from "./share";

const clean = { id: "deep-talk-001", deck_id: "deep-talk", text: "When do you feel most like yourself?", spice_level: 0 as const };
const spicy = { id: "after-dark-001", deck_id: "after-dark", text: "Secret spicy text", spice_level: 2 as const };

describe("share policy", () => {
  it("never allows spicy cards or spicy decks into images", () => {
    expect(canShareAsImage(clean, false)).toBe(true);
    expect(canShareAsImage(spicy, true)).toBe(false);
    expect(canShareAsImage(clean, true)).toBe(false);
    expect(canShareAsImage(spicy, false)).toBe(false);
  });

  it("blocks every card in every spicy deck", () => {
    for (const deck of DECKS.filter((d) => d.is_spicy)) {
      for (const card of deck.cards) expect(canShareAsImage(card, deck.is_spicy)).toBe(false);
    }
  });

  it("keeps spicy text out of share text", () => {
    expect(cardShareText(spicy, "After Dark", true)).not.toContain("Secret");
    expect(cardShareText(clean, "Deep Talk", false)).toContain(clean.text);
  });
});

describe("share links", () => {
  it("builds deck and card paths that match the routes", () => {
    expect(deckPath("deep-talk")).toBe("/deck/deep-talk");
    expect(cardPath(clean)).toBe("/deck/deep-talk/card/deep-talk-001");
  });

  it("uses deck ids that equal slugs, so card links resolve", () => {
    for (const deck of DECKS) expect(deck.slug).toBe(deck.id);
  });

  it("encodes WhatsApp text and url", () => {
    const href = whatsappHref("Hi & bye", "https://x.test/deck/a");
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1]!)).toBe("Hi & bye\nhttps://x.test/deck/a");
  });
});
