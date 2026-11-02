"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { Card } from "@/lib/content/types";
import { db, type SessionRecord } from "@/lib/db/dexie";
import { resolveCards } from "@/lib/content/fetch-deck";
import { pluralize } from "@/lib/content/deck-utils";
import { canShareAsImage } from "@/lib/share/share";
import type { DeckInfo } from "@/components/play/play-screen";
import { AppShell } from "@/components/layout/app-shell";
import { AccentCard, Logo, Pill } from "@/components/brand/primitives";
import { CrownDoodle } from "@/components/brand/doodles";
import { HeartIcon, ShareIcon } from "@/components/brand/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { ShareSheet, type ShareTarget } from "@/components/share/share-sheet";
import { InstallCard } from "@/components/pwa/install";
import { useAuth } from "@/lib/supabase/auth";

/** Card ids are "<deck-id>-<nnn>" (enforced by the content test). */
const deckIdOf = (cardId: string) => cardId.replace(/-\d+$/, "");

function minutes(s: SessionRecord) {
  return Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000));
}

/** Session end (GP-9): what you played, what you saved, a nudge to share. */
export function SessionSummary({ decks }: { decks: Record<string, DeckInfo> }) {
  const id = useSearchParams().get("id") ?? "";
  // undefined = loading, null = not found
  const auth = useAuth();
  const session = useLiveQuery(async () => (await db.sessions.get(id)) ?? null, [id]);
  const [saved, setSaved] = useState<Card[]>([]);
  const [shareCard, setShareCard] = useState<Card | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const savedCards = await resolveCards(session.favoritedIds.map((cardId) => ({ cardId, deckId: deckIdOf(cardId) })));
      // Best card to suggest sharing: a saved clean card, else the last clean card played.
      const recent = await resolveCards(
        session.cardsSeen.slice(-8).reverse().map((cardId) => ({ cardId, deckId: deckIdOf(cardId) })),
      );
      const shareable = (c: Card) => canShareAsImage(c, decks[c.deck_id]?.is_spicy ?? false);
      if (cancelled) return;
      setSaved(savedCards);
      setShareCard(savedCards.find(shareable) ?? recent.find(shareable) ?? null);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, decks]);

  if (session === undefined) return <AppShell aria-busy="true">{null}</AppShell>;

  if (session === null) {
    return (
      <AppShell className="items-center justify-center gap-4 text-center">
        <Logo className="text-[28px]" />
        <h1 className="font-display text-[32px] leading-none font-normal">Session not found</h1>
        <Link href="/" className={buttonVariants({ size: "md" })}>
          Pick a deck
        </Link>
      </AppShell>
    );
  }

  const isFavorites = session.mode === "favorites";
  const deckInfo = decks[session.deckId];
  const deckName = isFavorites ? "My favorites" : (deckInfo?.name ?? "Duo Deck");

  function openShare() {
    if (shareCard) {
      const info = decks[shareCard.deck_id];
      setShareTarget({
        kind: "card",
        card: shareCard,
        deckName: info?.name ?? deckName,
        deckIsSpicy: info?.is_spicy ?? false,
        accent: info?.accent ?? "cream",
      });
    } else if (!isFavorites) {
      setShareTarget({ kind: "deck", slug: session!.deckId, name: deckName });
    }
  }
  const canShare = Boolean(shareCard) || !isFavorites;

  return (
    <AppShell>
      <Logo className="text-center text-[28px]" />

      <div className="relative mt-[26px]">
        <CrownDoodle className="-top-2.5 right-1.5 rotate-[16deg]" />
        <h1 className="font-display text-[42px] leading-[1.02] font-normal tracking-[-0.5px]">
          You two
          <br />
          crushed it.
        </h1>
        <p className="mt-2.5 text-[17px] text-muted">
          {deckName} · {session.completed ? "deck finished" : "nice session"}
        </p>
      </div>

      <ul aria-label="Session stats" className="relative mt-[18px] h-[78px]">
        <li className="absolute top-2.5 left-0">
          <Pill tone="orange" rotate={-6} className="px-[18px] py-2.5 text-base font-semibold">
            {pluralize(session.cardsSeen.length, "card")}
          </Pill>
        </li>
        <li className="absolute top-7 left-[30%]">
          <Pill tone="blue" rotate={5} className="px-[18px] py-2.5 text-base font-semibold">
            {session.favoritesSaved} saved
          </Pill>
        </li>
        <li className="absolute top-1.5 left-[60%]">
          <Pill tone="magenta" rotate={-10} className="px-[18px] py-2.5 text-base font-semibold">
            {minutes(session)} min
          </Pill>
        </li>
      </ul>

      {saved.length > 0 && (
        <section aria-labelledby="saved-heading" className="mt-3.5">
          <div className="flex items-baseline justify-between">
            <h2 id="saved-heading" className="text-lg font-semibold">
              Cards you saved
            </h2>
            <Link href="/saved" className="text-sm no-underline">
              See all
            </Link>
          </div>
          <div className="relative mt-3 h-[168px]">
            {saved.slice(0, 2).map((card, i) => (
              <AccentCard
                key={card.id}
                accent={i === 0 ? "cream" : "purple"}
                rotate={i === 0 ? -5 : 4}
                className={`absolute flex h-[140px] w-[51%] flex-col justify-between p-4 ${i === 0 ? "top-2 left-0" : "top-[18px] left-[49%]"}`}
              >
                <HeartIcon size={18} filled className={i === 0 ? "text-pink-strong" : "text-white"} />
                <p className="line-clamp-3 text-base leading-[1.2] font-semibold">{card.text}</p>
              </AccentCard>
            ))}
          </div>
        </section>
      )}

      {canShare && (
        <div className="mt-4 flex items-center gap-3 rounded-panel border border-border bg-surface p-4">
          <div aria-hidden="true" className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-pink text-ink-strong">
            <ShareIcon size={22} />
          </div>
          <div className="grow">
            <p className="text-[15px] font-semibold">{shareCard ? "Share a card" : "Share this deck"}</p>
            <p className="text-[13px] text-muted">Send it to friends on WhatsApp.</p>
          </div>
          <Button variant="light" size="sm" className="h-11" onClick={openShare}>
            Share
          </Button>
        </div>
      )}
      <InstallCard />


      <Link href="/" className={`${buttonVariants({ size: "lg" })} mt-auto`}>
        Pick another deck
      </Link>
      {auth.configured && !auth.email && !auth.loading ? (
        <Link
          href="/signin?next=/saved"
          className="mt-1.5 flex min-h-11 items-center self-center text-sm text-muted hover:text-fg"
        >
          Sign in to keep favorites on any phone
        </Link>
      ) : null}
      {!isFavorites && (
        <Link
          href={`/deck/${session.deckId}`}
          className="mt-1.5 flex min-h-11 items-center self-center text-sm text-muted hover:text-fg"
        >
          Back to {deckName}
        </Link>
      )}

      <ShareSheet target={shareTarget} onClose={() => setShareTarget(null)} />
    </AppShell>
  );
}
