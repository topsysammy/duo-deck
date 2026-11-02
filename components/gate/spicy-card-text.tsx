"use client";

import { useEffect, useState } from "react";
import { loadDeck } from "@/lib/content/fetch-deck";

/**
 * Spicy card text for the shared card page, fetched on the client only after
 * the 18+ gate has been passed (it is never in the server HTML).
 */
export function SpicyCardText({ deckId, cardId }: { deckId: string; cardId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadDeck(deckId)
      .then((deck) => setText(deck.cards.find((c) => c.id === cardId)?.text ?? null))
      .catch(() => setFailed(true));
  }, [deckId, cardId]);

  if (failed) return <p className="my-auto text-lg">Couldn&apos;t load this card. Check your connection.</p>;
  return (
    <blockquote aria-busy={text === null} className="my-auto text-[clamp(24px,7.4vw,29px)] leading-[1.16] font-semibold tracking-[-0.4px]">
      {text ?? "…"}
    </blockquote>
  );
}
