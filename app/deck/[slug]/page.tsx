import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ChevronLeft } from "@/components/brand/icons";
import { buttonVariants } from "@/components/ui/button";
import { SampleCardStack } from "@/components/deck/sample-card-stack";
import { LevelList } from "@/components/deck/level-list";
import { ShareDeckButton } from "@/components/deck/share-deck-button";
import { SpicyGate } from "@/components/gate/spicy-gate";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { getAllDeckSlugs, getCategories, getDeck, getSampleCards } from "@/lib/content/load.server";
import { deckAccent, deckMeta, estimateMinutes, toSummary } from "@/lib/content/deck-utils";
import { cn } from "@/lib/utils";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllDeckSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const deck = getDeck(slug);
  if (!deck) return {};
  const description = deck.is_spicy
    ? "A flirty card game for couples. 18+ only."
    : `${deck.tagline}. A free card game for couples on Duo Deck.`;
  return {
    title: deck.name,
    description,
    alternates: { canonical: `/deck/${deck.slug}` },
    openGraph: { title: `${deck.name} · Duo Deck`, description, url: `/deck/${deck.slug}` },
  };
}

export default async function DeckPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const deck = getDeck(slug);
  if (!deck) notFound();

  const summary = toSummary(deck);
  const accent = deckAccent(deck, getCategories());
  const multiLevel = deck.levels.length > 1;

  const page = (
    <AppShell>
      <TrackOnMount event="deck_opened" props={{ deck_id: deck.id, mode: deck.mode }} />
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="Back to home"
          className={cn(buttonVariants({ variant: "secondary", size: "icon" }))}
        >
          <ChevronLeft />
        </Link>
        <ShareDeckButton name={deck.name} slug={deck.slug} />
      </div>

      <SampleCardStack
        cards={deck.is_spicy ? [] : getSampleCards(deck)}
        accent={accent}
        showLevels={multiLevel}
        hidden={deck.is_spicy}
      />

      <h1 className="mt-4 font-display text-[42px] leading-none font-normal tracking-[-0.5px]">{deck.name}</h1>
      <p className="mt-2 text-base text-muted">
        {deckMeta(summary)} · about {estimateMinutes(summary.card_count)} minutes
        {deck.mode === "would_you_rather" && " · Would You Rather"}
      </p>
      <p className="mt-2 text-base leading-[1.4] text-muted">{deck.description}</p>

      {multiLevel && <LevelList slug={deck.slug} levels={deck.levels} counts={summary.level_counts} />}

      {/* Sticky CTA so it stays reachable when the page scrolls on short screens */}
      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-bg via-bg to-transparent pt-6 pb-[env(safe-area-inset-bottom)]">
        <Link href={`/play/${deck.slug}`} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Start playing
        </Link>
      </div>
    </AppShell>
  );
  // Spicy decks need the 18+ gate, even from a shared link (ON-6).
  return deck.is_spicy ? <SpicyGate deckName={deck.name}>{page}</SpicyGate> : page;
}
