import type { ReactNode } from "react";
import type { Card } from "@/lib/content/types";
import { Pill } from "@/components/brand/primitives";

/**
 * The cream play card (design: Play artboard). Prompt text is large enough
 * to read aloud at arm's length. `children` replaces the default footer
 * (used by Would You Rather).
 */
export function CardFace({
  card,
  counter,
  onSkip,
  canSkip,
  children,
}: {
  card: Card;
  counter: string;
  onSkip: () => void;
  canSkip: boolean;
  children?: ReactNode;
}) {
  const isWyr = card.type === "would_you_rather";
  return (
    <article
      aria-roledescription="card"
      className="card-border flex h-full flex-col rounded-card-lg bg-cream px-6 pt-7 pb-6 text-ink select-none"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">{counter}</span>
        <button
          type="button"
          onClick={onSkip}
          disabled={!canSkip}
          onPointerDownCapture={(e) => e.stopPropagation()}
          className="h-10 cursor-pointer rounded-chip bg-ink px-4 text-sm font-medium text-white disabled:opacity-40"
        >
          Skip
        </button>
      </div>

      {card.type === "activity" && (
        <Pill tone="blue" className="mt-4 self-start px-3 py-1.5 text-[13px]">
          Try this together
        </Pill>
      )}
      {isWyr && (
        <p className="mt-4 text-[13px] font-semibold tracking-[0.5px] text-ink-muted uppercase">Would you rather</p>
      )}

      <p
        data-prompt
        className={
          isWyr
            ? "mt-2 text-[clamp(22px,6.4vw,26px)] leading-[1.18] font-semibold tracking-[-0.3px]"
            : "my-auto text-[clamp(24px,7.4vw,29px)] leading-[1.16] font-semibold tracking-[-0.4px]"
        }
      >
        {card.text}
      </p>

      {children ?? <p className="text-sm text-ink-muted">Swipe left for the next card</p>}
    </article>
  );
}
