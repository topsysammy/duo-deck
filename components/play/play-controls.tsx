"use client";

import { HeartIcon, RewindIcon, ShareIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";

/** Tap alternatives to every swipe (WCAG / GP-1): back, favorite, share, next. */
export function PlayControls({
  onPrev,
  canPrev,
  onNext,
  nextLabel,
  favorite,
  onToggleFavorite,
  onShare,
  canShare,
}: {
  onPrev: () => void;
  canPrev: boolean;
  onNext: () => void;
  nextLabel: string;
  favorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  canShare: boolean;
}) {
  return (
    <div className="mt-[18px] flex items-center gap-2.5">
      <Button
        variant="secondary"
        size="icon-lg"
        aria-label="Previous card"
        aria-keyshortcuts="ArrowLeft"
        onClick={onPrev}
        disabled={!canPrev}
      >
        <RewindIcon size={22} />
      </Button>
      <Button
        variant="secondary"
        size="icon-lg"
        aria-label="Favorite this card"
        aria-pressed={favorite}
        onClick={onToggleFavorite}
        className="text-pink hover:text-pink"
      >
        <HeartIcon size={24} filled={favorite} />
      </Button>
      <Button variant="secondary" size="icon-lg" aria-label="Share this card" onClick={onShare} disabled={!canShare}>
        <ShareIcon size={22} />
      </Button>
      <Button size="lg" className="min-w-0 grow px-4" onClick={onNext} aria-keyshortcuts="ArrowRight">
        {nextLabel}
      </Button>
    </div>
  );
}
