import Link from "next/link";
import type { Accent, DeckSummary } from "@/lib/content/types";
import { pluralize } from "@/lib/content/deck-utils";
import { cn } from "@/lib/utils";

const TILTS = [-4, 3, -2, 4];

/** Small tilted deck card: card count and levels on top, name at the bottom. */
export function DeckTile({
  deck,
  accent,
  index = 0,
}: {
  deck: DeckSummary;
  accent: Accent;
  index?: number;
}) {
  const levels = deck.levels.length;
  return (
    <Link
      href={`/deck/${deck.slug}`}
      data-accent={accent}
      className={cn(
        // Name comes first in the DOM (so it leads the link's accessible name) but sits at the bottom visually.
        "bg-accent card-border flex h-[136px] w-[108px] shrink-0 snap-start flex-col-reverse justify-between rounded-tile p-3 text-on-accent no-underline",
        "transition-transform duration-200 hover:text-on-accent hover:-translate-y-1",
      )}
      style={{ transform: `rotate(${TILTS[index % TILTS.length]}deg)` }}
    >
      <span className="text-[17px] leading-[1.05] font-bold">{deck.name}</span>
      <span className="text-xs leading-tight font-medium">
        <span className="sr-only">, </span>
        {pluralize(deck.card_count, "card")}
        {levels > 1 && (
          <>
            <span className="sr-only">, </span>
            <br />
            {pluralize(levels, "level")}
          </>
        )}
      </span>
    </Link>
  );
}

/** Horizontally scrolling row that bleeds to the screen edge. */
export function DeckRow({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ul
      aria-label={label}
      className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter pt-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </ul>
  );
}
