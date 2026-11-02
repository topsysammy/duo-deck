"use client";

import { useFavoritesDeck } from "@/hooks/use-favorites";
import { useSettings } from "@/hooks/use-settings";
import { canSeeSpicy } from "@/lib/prefs/filters";
import { PlayScreen, type DeckInfo } from "./play-screen";

const SUMMARY = {
  slug: "favorites",
  name: "My favorites",
  levels: [{ id: 1, name: "All cards", blurb: "your saved cards" }],
  mode: "qa" as const,
  card_count: 0,
};

/** "Play my favorites": saved cards as a shuffled mini-deck (PRD flow 3). */
export function FavoritesPlay({ decks }: { decks: Record<string, DeckInfo> }) {
  const { prefs, loaded } = useSettings();
  // Wait for settings so the snapshot respects the content filter.
  const data = useFavoritesDeck(canSeeSpicy(prefs), loaded);
  return (
    <PlayScreen
      summary={{ ...SUMMARY, card_count: data.deck?.cards.length ?? 0 }}
      accent="magenta"
      data={data}
      mode="favorites"
      backHref="/saved"
      backLabel="Back to saved cards"
      decks={decks}
    />
  );
}
