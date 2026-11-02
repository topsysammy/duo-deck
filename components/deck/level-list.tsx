import Link from "next/link";
import type { Level } from "@/lib/content/types";
import { pluralize } from "@/lib/content/deck-utils";
import { cn } from "@/lib/utils";

const BADGES = ["bg-orange text-ink", "bg-blue text-white", "bg-magenta text-white"];

/** Levels as tappable rows: each jumps straight into Play at that level (GP-4). */
export function LevelList({
  slug,
  levels,
  counts,
}: {
  slug: string;
  levels: Level[];
  counts: Record<number, number>;
}) {
  return (
    <ol aria-label="Levels" className="mt-[18px] flex flex-col gap-2">
      {levels.map((level, i) => {
        const first = i === 0;
        return (
          <li key={level.id}>
            <Link
              href={`/play/${slug}?level=${level.id}`}
              className={cn(
                "flex min-h-[60px] items-center gap-3.5 rounded-[30px] bg-surface py-2.5 pr-4 pl-2.5 text-white no-underline hover:text-white",
                first ? "border-[1.5px] border-pink" : "border border-border hover:border-dot",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full font-bold",
                  BADGES[i % BADGES.length],
                )}
              >
                {level.id}
              </span>
              <span className="grow">
                <span className="block text-base font-semibold">
                  <span className="sr-only">Level {level.id}: </span>
                  {level.name}
                </span>
                <span className="block text-[13px] text-muted">
                  {pluralize(counts[level.id] ?? 0, "card")} · {level.blurb}
                </span>
              </span>
              {first && <span className="text-[13px] font-semibold text-pink-soft">Start here</span>}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
