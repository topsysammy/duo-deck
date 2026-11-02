import { getCategories, getDeck } from "@/lib/content/load.server";
import { DECKS } from "@/lib/content/registry";
import { deckAccent, deckMeta, toSummary } from "@/lib/content/deck-utils";
import { canShareAsImage } from "@/lib/share/share";
import { OG_SIZE, cardImage, deckImage } from "@/lib/og/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A conversation card from Duo Deck";
export const dynamicParams = false;

export function generateStaticParams() {
  return DECKS.flatMap((d) => d.cards.map((c) => ({ slug: d.slug, id: c.id })));
}

/** Spicy cards never render their text: they get the generic deck image instead. */
export default async function Image({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const deck = getDeck(slug);
  const card = deck?.cards.find((c) => c.id === id);
  if (!deck || !card) throw new Error("Unknown card");
  if (!canShareAsImage(card, deck.is_spicy)) {
    return deckImage({
      name: deck.name,
      tagline: deck.tagline,
      accent: deckAccent(deck, getCategories()),
      is_spicy: true,
      meta: deckMeta(toSummary(deck)),
    });
  }
  return cardImage({ text: card.text, deckName: deck.name, isWyr: card.type === "would_you_rather" });
}
