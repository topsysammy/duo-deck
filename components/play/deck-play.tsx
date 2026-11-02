"use client";

import type { Accent, DeckSummary } from "@/lib/content/types";
import { useEffect } from "react";
import { useDeckData } from "@/hooks/use-deck-data";
import { keepDeckOffline } from "@/lib/pwa/offline";
import { PlayScreen, type DeckInfo } from "./play-screen";

/** Play a single deck, loading its pack on the client. */
export function DeckPlay({ summary, accent }: { summary: DeckSummary; accent: Accent }) {
  const data = useDeckData(summary.slug, summary.version);
  // Once a deck has been opened, store its pages too, so it plays offline from a cold start (PW-2).
  useEffect(() => {
    if (data.status === "ready") void keepDeckOffline(summary.slug);
  }, [data.status, summary.slug]);
  const decks: Record<string, DeckInfo> = { [summary.id]: { name: summary.name, is_spicy: summary.is_spicy, accent } };
  return (
    <PlayScreen
      summary={summary}
      accent={accent}
      data={data}
      backHref={`/deck/${summary.slug}`}
      backLabel={`Back to ${summary.name}`}
      decks={decks}
    />
  );
}
