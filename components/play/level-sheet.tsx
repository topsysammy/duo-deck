"use client";

import { forwardRef } from "react";
import type { Level } from "@/lib/content/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BADGES = ["bg-orange text-ink", "bg-blue text-white", "bg-magenta text-white"];

/**
 * Bottom sheet for level jump (GP-4) and "Reset deck" (GP-5).
 * Native <dialog>: focus trap, Esc to close and backdrop come for free.
 */
export const LevelSheet = forwardRef<
  HTMLDialogElement,
  {
    levels: Level[];
    currentLevel: number;
    remaining: (level: number) => number;
    onJump: (level: number) => void;
    onReset: () => void;
  }
>(function LevelSheet({ levels, currentLevel, remaining, onJump, onReset }, ref) {
  const close = (e: React.SyntheticEvent) => (e.currentTarget.closest("dialog") as HTMLDialogElement | null)?.close();
  const multi = levels.length > 1;

  return (
    <dialog
      ref={ref}
      aria-labelledby="level-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close(); // backdrop tap
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-app rounded-t-[32px] border border-b-0 border-border bg-surface p-0 text-fg backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-3 px-gutter pt-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <h2 id="level-sheet-title" className="font-display text-[26px] leading-none font-normal">
          {multi ? "Jump to a level" : "Deck options"}
        </h2>

        {multi && (
          <ul className="flex flex-col gap-2">
            {levels.map((level, i) => {
              const left = remaining(level.id);
              const isCurrent = level.id === currentLevel;
              return (
                <li key={level.id}>
                  <button
                    type="button"
                    disabled={isCurrent || left === 0}
                    onClick={(e) => {
                      onJump(level.id);
                      close(e);
                    }}
                    className={cn(
                      "flex min-h-[60px] w-full cursor-pointer items-center gap-3.5 rounded-[30px] bg-surface-2 py-2.5 pr-4 pl-2.5 text-left disabled:cursor-default",
                      isCurrent ? "border-[1.5px] border-pink" : "border border-border",
                      !isCurrent && left === 0 && "opacity-50",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn("flex size-10 shrink-0 items-center justify-center rounded-full font-bold", BADGES[i % 3])}
                    >
                      {level.id}
                    </span>
                    <span className="grow">
                      <span className="block font-semibold">{level.name}</span>
                      <span className="block text-[13px] text-muted">
                        {isCurrent ? "Playing now" : left === 0 ? "All played" : `${left} cards left`}
                      </span>
                      {level.intro && <span className="mt-0.5 block text-[13px] leading-snug text-fg/80">{level.intro}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <Button
          variant="outline"
          size="md"
          onClick={(e) => {
            onReset();
            close(e);
          }}
        >
          Reset deck and reshuffle
        </Button>
        <Button variant="ghost" size="md" onClick={close}>
          Close
        </Button>
      </div>
    </dialog>
  );
});
