import Link from "next/link";
import type { Accent, DeckSummary } from "@/lib/content/types";
import { deckMeta, estimateMinutes } from "@/lib/content/deck-utils";
import { CrownDoodle } from "@/components/brand/doodles";
import { AccentCard, Pill } from "@/components/brand/primitives";
import { ArrowRight } from "@/components/brand/icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Tonight's pick" hero. "Play now" goes straight into Play (not Deck detail)
 * so a first-time visitor reaches a card in 2 taps: Skip → Play now (ON-1).
 */
export function HeroPick({ deck, accent }: { deck: DeckSummary; accent: Accent }) {
  return (
    <section aria-labelledby="tonight-heading" className="relative mt-5 h-[262px]">
      <CrownDoodle className="top-0 right-0.5 rotate-[18deg]" />
      <AccentCard
        accent={accent}
        rotate={-3}
        className="absolute top-[22px] left-2 flex h-[222px] w-[calc(100%-24px)] max-w-[340px] flex-col justify-end gap-2 rounded-panel p-5"
      >
        <div
          aria-hidden="true"
          className="absolute -top-[26px] -right-[26px] size-[110px] rotate-[26deg] rounded-panel border-[1.5px] border-white/45 bg-white/15"
        />
        <p id="tonight-heading" className="relative text-[13px] font-semibold tracking-[0.6px] uppercase">
          Tonight&apos;s pick
        </p>
        <h2 className="relative font-display text-[32px] leading-none font-normal">{deck.name}</h2>
        <p className="relative text-sm">
          {deckMeta(deck)} · ~{estimateMinutes(deck.card_count)} min
        </p>
        <Link
          href={`/play/${deck.slug}`}
          className={cn(buttonVariants({ variant: "light", size: "md" }), "relative mt-1 self-start")}
        >
          Play now <ArrowRight size={16} />
        </Link>
      </AccentCard>
      <Pill tone="orange" rotate={12} className="absolute top-1.5 left-[196px]">
        <span aria-hidden="true">Tonight</span>
      </Pill>
    </section>
  );
}
