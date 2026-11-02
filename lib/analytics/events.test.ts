import { describe, expect, it } from "vitest";
import { EVENTS, cardProps, sharedLinkProps } from "./events";

describe("analytics contract", () => {
  it("covers exactly the core events in PRD §10", () => {
    expect([...EVENTS].sort()).toEqual(
      [
        "app_opened",
        "onboarding_completed",
        "deck_opened",
        "card_viewed",
        "card_skipped",
        "card_favorited",
        "card_shared",
        "level_changed",
        "session_ended",
        "pwa_install_prompted",
        "pwa_installed",
        "signin_completed",
        "shared_link_opened",
      ].sort(),
    );
  });

  it("gives every card event deck_id, card_id, level and mode", () => {
    expect(cardProps({ id: "deep-talk-012", deck_id: "deep-talk", level: 3 }, "favorites")).toEqual({
      deck_id: "deep-talk",
      card_id: "deep-talk-012",
      level: 3,
      mode: "favorites",
    });
  });

  it("recognises shared deck and card links", () => {
    expect(sharedLinkProps("/deck/deep-talk")).toEqual({ deck_id: "deep-talk", card_id: null });
    expect(sharedLinkProps("/deck/deep-talk/card/deep-talk-001")).toEqual({ deck_id: "deep-talk", card_id: "deep-talk-001" });
    expect(sharedLinkProps("/play/deep-talk")).toBeNull();
    expect(sharedLinkProps("/")).toBeNull();
  });
});
