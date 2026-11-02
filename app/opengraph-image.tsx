import { OG_SIZE, deckImage } from "@/lib/og/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Duo Deck: free card games for couples";

export default async function Image() {
  return deckImage({
    name: "Real talk, closer hearts",
    tagline: "Card games that get you two talking.",
    accent: "purple",
    is_spicy: false,
    sample: "What's your favourite memory of us?",
    meta: "10 decks",
  });
}
