import { getAllDeckSlugs, getCategories, getDeck, getSampleCards } from "@/lib/content/load.server";
import { deckAccent, deckMeta, toSummary } from "@/lib/content/deck-utils";
import { OG_SIZE, deckImage } from "@/lib/og/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A Duo Deck card game for couples";
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDeckSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const deck = getDeck((await params).slug);
  if (!deck) throw new Error("Unknown deck");
  return deckImage({
    name: deck.name,
    tagline: deck.tagline,
    accent: deckAccent(deck, getCategories()),
    is_spicy: deck.is_spicy,
    sample: deck.is_spicy ? undefined : getSampleCards(deck, 1)[0]?.text,
    meta: deckMeta(toSummary(deck)),
  });
}
