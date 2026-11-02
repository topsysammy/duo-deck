import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DeckPlay } from "@/components/play/deck-play";
import { SpicyGate } from "@/components/gate/spicy-gate";
import { getAllDeckSlugs, getCategories, getDeck } from "@/lib/content/load.server";
import { deckAccent, toSummary } from "@/lib/content/deck-utils";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllDeckSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const deck = getDeck((await params).slug);
  return deck ? { title: `Play ${deck.name}`, robots: { index: false } } : {};
}

/**
 * The page ships only the deck summary; cards are fetched on the client from
 * /decks/<slug>.v<version>.json so they can be cached for offline play and so
 * spicy prompts never appear in server HTML.
 */
export default async function PlayPage({ params }: { params: Promise<Params> }) {
  const deck = getDeck((await params).slug);
  if (!deck) notFound();
  const play = <DeckPlay summary={toSummary(deck)} accent={deckAccent(deck, getCategories())} />;
  return (
    <Suspense>
      {/* The gate mounts DeckPlay (and so fetches the pack) only after 18+ is confirmed. */}
      {deck.is_spicy ? <SpicyGate deckName={deck.name}>{play}</SpicyGate> : play}
    </Suspense>
  );
}
