"use client";

import type { Card } from "@/lib/content/types";
import { handOver, isMatch, pick, type Choice, type WyrRound } from "@/lib/engine/wyr";
import type { Partner } from "@/lib/prefs/partners";
import { cn } from "@/lib/utils";

/** Stops a tap on a control from starting a card drag. */
const noDrag = { onPointerDownCapture: (e: React.PointerEvent) => e.stopPropagation() };

/**
 * Would You Rather (GP-3), pass-the-phone: the player whose turn it is picks
 * in secret, hands over, the partner picks, then both choices are revealed.
 */
export function WyrPanel({
  card,
  round,
  onChange,
  players,
}: {
  card: Card;
  round: WyrRound;
  onChange: (r: WyrRound) => void;
  /** [whose turn, partner] */
  players: [Partner, Partner];
}) {
  const [first, second] = players;
  const options: { key: Choice; label: string }[] = [
    { key: "a", label: card.option_a ?? "Option A" },
    { key: "b", label: card.option_b ?? "Option B" },
  ];
  const labelOf = (c: Choice | null) => options.find((o) => o.key === c)?.label ?? "";

  if (round.phase === "pass") {
    return (
      <div className="mt-auto flex flex-col gap-3" role="status">
        <p className="text-base font-semibold">
          {first.name} picked. Pass the phone to {second.name}.
        </p>
        <button
          type="button"
          {...noDrag}
          onClick={() => onChange(handOver(round))}
          className="h-[52px] cursor-pointer rounded-chip bg-ink text-base font-semibold text-white"
        >
          I&apos;m {second.name}, ready
        </button>
      </div>
    );
  }

  if (round.phase === "reveal") {
    const match = isMatch(round);
    return (
      <div className="mt-auto flex flex-col gap-3" role="status">
        <p className="text-base font-semibold">{match ? "Same pick!" : "Different picks. Talk it out!"}</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { who: first, choice: round.first },
            { who: second, choice: round.second },
          ].map(({ who, choice }) => (
            <div
              key={who.name}
              className={cn(
                "rounded-[20px] p-3",
                choice === "a" ? "bg-magenta text-white" : "bg-blue text-white",
              )}
            >
              <p className="text-[13px] opacity-90">{who.name}</p>
              <p className="mt-1 text-[17px] leading-tight font-semibold">{labelOf(choice)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const picker = round.phase === "first" ? first : second;
  return (
    <fieldset className="mt-auto flex flex-col gap-2.5">
      <legend className="mb-2.5 text-base font-semibold">{picker.name}, pick in secret</legend>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          {...noDrag}
          onClick={() => onChange(pick(round, o.key))}
          className="min-h-[52px] cursor-pointer rounded-[20px] border-2 border-ink/80 bg-white/60 px-4 py-2 text-left text-[17px] font-semibold transition-colors hover:bg-white"
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}
