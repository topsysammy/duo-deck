"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryParam } from "@/hooks/use-query-param";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LazyMotion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import type { Accent, Card, Deck, DeckSummary } from "@/lib/content/types";
import * as engine from "@/lib/engine/deck-engine";
import { db } from "@/lib/db/dexie";
import { isActiveFavorite, setFavorite } from "@/lib/db/favorites";
import { partners } from "@/lib/prefs/partners";
import { usePlaySession, type PlayMode } from "@/hooks/use-play-session";
import { ShareSheet, type ShareTarget } from "@/components/share/share-sheet";
import { track } from "@/lib/analytics/track";
import { cardProps } from "@/lib/analytics/events";
import { AccentCard } from "@/components/brand/primitives";
import { CrownDoodle } from "@/components/brand/doodles";
import { ChevronLeft } from "@/components/brand/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SwipeCard } from "./swipe-card";
import { CardFace } from "./card-face";
import { WyrPanel } from "./wyr-panel";
import { LevelProgress } from "./level-progress";
import { LevelSheet } from "./level-sheet";
import { PlayControls } from "./play-controls";

// domMax includes drag; loaded as a separate chunk only on the Play screen.
const loadFeatures = () => import("framer-motion").then((mod) => mod.domMax);

export interface DeckInfo {
  name: string;
  is_spicy: boolean;
  accent: Accent;
}

export interface PlayScreenProps {
  summary: Pick<DeckSummary, "slug" | "name" | "levels" | "mode" | "card_count">;
  accent: Accent;
  data: { status: "loading" | "ready" | "error" | "empty"; deck: Deck | null; retry: () => void };
  mode?: PlayMode;
  backHref: string;
  backLabel: string;
  /** Name, spiciness and accent per deck id, for sharing cards (favorites mix decks). */
  decks: Record<string, DeckInfo>;
}

/** The game screen (PRD §5.2). Deck loading is done by the caller (a deck or the favorites mini-deck). */
export function PlayScreen({ summary, accent, data, mode = "deck", backHref, backLabel, decks }: PlayScreenProps) {
  const router = useRouter();
  const levelParam = Number(useQueryParam("level"));
  const startLevel = Number.isInteger(levelParam) && levelParam > 0 ? levelParam : undefined;

  const { status, deck, retry } = data;
  const { active, direction, cardId, wyrRound, actions } = usePlaySession(deck, startLevel, mode);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const settings = useLiveQuery(() => db.settings.get("local"));
  const favorite = useLiveQuery(() => (cardId ? db.favorites.get(cardId) : undefined), [cardId]);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const ending = useRef(false);

  const cardsById = useMemo(() => new Map<string, Card>(deck?.cards.map((c) => [c.id, c]) ?? []), [deck]);
  const card = cardId ? cardsById.get(cardId) : undefined;
  const state = active?.engine;
  const modeProp = mode === "favorites" ? "favorites" : summary.mode;

  // Analytics (PRD §10): every new card on screen.
  useEffect(() => {
    if (card) track("card_viewed", cardProps(card, modeProp));
  }, [card, modeProp]);

  // Analytics: level changes, by jump or by finishing a level.
  const currentLevelId = state ? engine.currentLevel(state) : null;
  const lastLevel = useRef<number | null>(null);
  useEffect(() => {
    if (currentLevelId === null) return;
    if (lastLevel.current !== null && lastLevel.current !== currentLevelId) {
      track("level_changed", { deck_id: summary.slug, from: lastLevel.current, to: currentLevelId, mode: modeProp });
    }
    lastLevel.current = currentLevelId;
  }, [currentLevelId, summary.slug, modeProp]);

  const skipCard = useCallback(() => {
    if (card) track("card_skipped", cardProps(card, modeProp));
    actions.skip();
  }, [card, modeProp, actions]);

  const finish = useCallback(async () => {
    if (ending.current) return;
    ending.current = true;
    if (active) {
      track("session_ended", {
        deck_id: summary.slug,
        mode: modeProp,
        cards_seen: engine.seenIds(active.engine).length,
        skipped: active.engine.skipCount,
        favorites: active.favoritedIds.length,
        completed: active.engine.completed,
        duration_s: Math.round((Date.now() - active.startedAt) / 1000),
      });
    }
    const id = await actions.end();
    router.push(id ? `/session?id=${id}` : backHref);
  }, [actions, router, backHref, active, summary.slug, modeProp]);

  // Deck finished → session end (GP-9).
  useEffect(() => {
    if (state?.completed) void finish();
  }, [state?.completed, finish]);

  // Keyboard: ← previous, → next (GP-1).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, dialog[open]")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        actions.next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        actions.prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions]);

  const toggleFavorite = useCallback(() => {
    if (!card) return;
    const on = !isActiveFavorite(favorite);
    void setFavorite(card.id, card.deck_id, on);
    actions.noteFavorite(card.id, on);
    if (on) track("card_favorited", cardProps(card, modeProp));
  }, [card, favorite, actions, modeProp]);

  const openShare = useCallback(() => {
    if (!card) return;
    const info = decks[card.deck_id];
    setShareTarget({
      kind: "card",
      card,
      deckName: info?.name ?? summary.name,
      deckIsSpicy: info?.is_spicy ?? false,
      accent: info?.accent ?? accent,
    });
  }, [card, decks, summary.name, accent]);

  const back = (
    <Link
      href={backHref}
      aria-label={backLabel}
      className={buttonVariants({ variant: "secondary", size: "icon" })}
    >
      <ChevronLeft />
    </Link>
  );

  if (status === "error" || status === "empty") {
    const empty = status === "empty";
    return (
      <Shell>
        <div className="flex items-center">{back}</div>
        <div className="my-auto flex flex-col items-center gap-4 text-center">
          <h1 className="font-display text-[30px] leading-none font-normal">
            {empty ? "No saved cards yet" : "Couldn\u2019t load this deck"}
          </h1>
          <p className="text-muted">
            {empty
              ? "Tap the heart on any card while you play, and it will show up here."
              : "Check your connection and try again. Decks you\u2019ve opened before work offline."}
          </p>
          {empty ? (
            <Link href="/" className={buttonVariants({ size: "md" })}>
              Find a deck
            </Link>
          ) : (
            <Button size="md" onClick={retry}>
              Try again
            </Button>
          )}
        </div>
      </Shell>
    );
  }

  const ready = Boolean(deck && state && card);
  const levelId = state ? engine.currentLevel(state) : (startLevel ?? 1);
  const level = summary.levels.find((l) => l.id === levelId) ?? summary.levels[0];
  const progress = state ? engine.levelProgress(state) : { index: 0, total: summary.card_count, level: levelId };
  const [turnPlayer, otherPlayer] = (() => {
    const [a, b] = partners(settings?.partnerA, settings?.partnerB);
    return state && engine.turnIndex(state) === 1 ? [b, a] : [a, b];
  })();
  const multiLevel = summary.levels.length > 1;
  const subtitle = multiLevel ? `Level ${level?.id} · ${level?.name}` : summary.mode === "would_you_rather" ? "Would You Rather" : "Take turns";
  const isLast = state ? engine.remainingCount(state) === 0 && !engine.isReviewing(state) : false;

  return (
    <Shell>
      <header className="flex items-center justify-between gap-2">
        {back}
        <div className="flex min-w-0 flex-col items-center">
          <h1 className="max-w-full truncate font-display text-xl leading-[1.1] font-normal">{summary.name}</h1>
          <button
            type="button"
            onClick={() => sheetRef.current?.showModal()}
            aria-haspopup="dialog"
            className="min-h-6 cursor-pointer rounded-lg px-2 text-[13px] text-muted hover:text-fg"
          >
            {subtitle} <span aria-hidden="true">▾</span>
            <span className="sr-only">. Open {multiLevel ? "levels" : "deck options"}</span>
          </button>
        </div>
        <Button variant="outline" size="md" onClick={() => void finish()} disabled={!ready}>
          End
        </Button>
      </header>

      <LevelProgress index={progress.index} total={progress.total} levelName={level?.name ?? "Deck"} />

      <div className="relative mt-[34px] min-h-[380px] grow">
        <AccentCard accent={accent === "cream" ? "magenta" : accent} rotate={5} className="absolute inset-[18px_6px_12px_14px] rounded-card-lg" />

        <LazyMotion features={loadFeatures} strict>
          <div className="absolute inset-[8px_10px_20px_4px]">
            {ready && card && state ? (
              <AnimatePresence initial={false} custom={direction}>
                <SwipeCard key={card.id} onNext={actions.next} onPrev={actions.prev} canPrev={engine.canGoBack(state)}>
                  <CardFace
                    card={card}
                    counter={`Card ${progress.index} of ${progress.total}`}
                    onSkip={skipCard}
                    canSkip={engine.remainingCount(state) > 0 || engine.isReviewing(state)}
                  >
                    {card.type === "would_you_rather" ? (
                      <WyrPanel
                        card={card}
                        round={wyrRound}
                        onChange={(r) => actions.setWyr(card.id, r)}
                        players={[turnPlayer, otherPlayer]}
                      />
                    ) : undefined}
                  </CardFace>
                </SwipeCard>
              </AnimatePresence>
            ) : (
              <div aria-hidden="true" className="card-border h-full -rotate-2 animate-pulse rounded-card-lg bg-cream/80" />
            )}
          </div>
        </LazyMotion>

        <CrownDoodle width={44} className="-top-[22px] -right-1 rotate-[18deg]" />
      </div>

      {/* Announce each new card to screen readers. */}
      <p className="sr-only" aria-live="polite">
        {ready && card ? `${progress.index > 0 ? `Card ${progress.index} of ${progress.total}. ` : ""}${card.text}` : "Loading cards"}
      </p>

      <PlayControls
        onPrev={actions.prev}
        canPrev={state ? engine.canGoBack(state) : false}
        onNext={actions.next}
        nextLabel={isLast ? "Finish" : "Next"}
        favorite={isActiveFavorite(favorite)}
        onToggleFavorite={toggleFavorite}
        onShare={openShare}
        canShare={ready}
      />

      <ShareSheet target={shareTarget} onClose={() => setShareTarget(null)} />

      {state && (
        <LevelSheet
          ref={sheetRef}
          levels={summary.levels}
          currentLevel={levelId}
          remaining={(l) => engine.remainingInLevel(state, l)}
          onJump={actions.jumpToLevel}
          onReset={() => void actions.reset()}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className={cn(
        "mx-auto flex h-dvh max-h-[1000px] w-full max-w-app flex-col overflow-hidden px-gutter pt-6",
        "pb-[calc(24px+env(safe-area-inset-bottom))]",
      )}
    >
      {children}
    </main>
  );
}
