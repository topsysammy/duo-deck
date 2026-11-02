import type { Metadata } from "next";
import { Suspense } from "react";
import { FavoritesPlay } from "@/components/play/favorites-play";
import { getDeckInfoMap } from "@/lib/content/load.server";

export const metadata: Metadata = { title: "Play my favorites", robots: { index: false } };

export default function PlayFavoritesPage() {
  return (
    <Suspense>
      <FavoritesPlay decks={getDeckInfoMap()} />
    </Suspense>
  );
}
