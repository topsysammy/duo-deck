"use client";

import Link from "next/link";
import { useState } from "react";
import type { Card } from "@/lib/content/types";
import { setFavorite } from "@/lib/db/favorites";
import { useFavoriteCards, type FavoriteItem } from "@/hooks/use-favorites";
import type { DeckInfo } from "@/components/play/play-screen";
import { AccentCard } from "@/components/brand/primitives";
import { HeartIcon, ShareIcon } from "@/components/brand/icons";
import { HeartDoodle } from "@/components/brand/doodles";
import { Button, buttonVariants } from "@/components/ui/button";
import { ShareSheet, type ShareTarget } from "@/components/share/share-sheet";
import { pluralize } from "@/lib/content/deck-utils";
import { useSettings } from "@/hooks/use-settings";
import { canSeeSpicy } from "@/lib/prefs/filters";

/** Favorites grouped by deck (EN-1), with "Play my favorites". */
export function SavedList({ decks, order }: { decks: Record<string, DeckInfo>; order: string[] }) {
  const { prefs } = useSettings();
  const { items, loading, partial } = useFavoriteCards(canSeeSpicy(prefs));
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading saved cards" className="mt-6 flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) return <EmptyState />;

  const groups = order
    .map((deckId) => ({ deckId, items: items.filter((i) => i.card.deck_id === deckId) }))
    .filter((g) => g.items.length > 0);

  const share = (card: Card) => {
    const info = decks[card.deck_id];
    setShareTarget({
      kind: "card",
      card,
      deckName: info?.name ?? "Duo Deck",
      deckIsSpicy: info?.is_spicy ?? false,
      accent: info?.accent ?? "cream",
    });
  };

  return (
    <>
      <p className="mt-3 text-[17px] text-muted">{pluralize(items.length, "card")} you loved.</p>
      <Link href="/play/favorites" className={`${buttonVariants({ size: "lg" })} mt-5`}>
        Play my favorites
      </Link>
      {partial && (
        <p role="status" className="mt-3 text-sm text-muted">
          Some saved cards couldn&apos;t load. Go online once to fetch their decks.
        </p>
      )}

      {groups.map(({ deckId, items: group }) => {
        const info = decks[deckId];
        const headingId = `saved-${deckId}`;
        return (
          <section key={deckId} aria-labelledby={headingId} className="mt-7">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={headingId} className="text-[19px] font-semibold">
                {info?.name ?? deckId}
              </h2>
              <Link href={`/deck/${deckId}`} className="text-sm no-underline">
                Open deck
              </Link>
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              {group.map((item) => (
                <SavedCard key={item.fav.cardId} item={item} onShare={() => share(item.card)} />
              ))}
            </ul>
          </section>
        );
      })}

      <ShareSheet target={shareTarget} onClose={() => setShareTarget(null)} />
    </>
  );
}

function SavedCard({ item, onShare }: { item: FavoriteItem; onShare: () => void }) {
  const { card } = item;
  const text =
    card.type === "would_you_rather" && card.option_a && card.option_b
      ? `${card.option_a} or ${card.option_b}?`
      : card.text;
  return (
    <li className="card-border flex flex-col gap-2 rounded-card bg-cream p-4 pb-3 text-ink">
      <p className="text-[17px] leading-[1.25] font-semibold">{text}</p>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove from favorites"
          onClick={() => void setFavorite(card.id, card.deck_id, false)}
          className="bg-ink/5 text-pink-strong hover:bg-ink/10 hover:text-pink-strong"
        >
          <HeartIcon size={20} filled />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Share this card"
          onClick={onShare}
          className="bg-ink/5 text-ink hover:bg-ink/10 hover:text-ink"
        >
          <ShareIcon size={20} />
        </Button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex grow flex-col">
      <div className="relative mx-auto mt-10 h-[200px] w-[260px]" aria-hidden="true">
        <AccentCard accent="magenta" rotate={-8} className="absolute top-6 left-0 h-[150px] w-[150px]" />
        <AccentCard accent="cream" rotate={6} className="absolute top-2 left-[96px] flex h-[160px] w-[150px] items-center justify-center">
          <HeartIcon size={44} className="text-pink-strong" />
        </AccentCard>
        <HeartDoodle className="top-[150px] left-[210px] rotate-12" />
      </div>
      <h2 className="mt-8 text-center font-display text-[30px] leading-none font-normal">No saved cards yet</h2>
      <p className="mt-3 text-center text-[17px] text-muted">
        Tap the heart on a card you love while you play. It will wait for you here.
      </p>
      <Link href="/" className={`${buttonVariants({ size: "lg" })} mt-8`}>
        Find a deck
      </Link>
    </div>
  );
}
