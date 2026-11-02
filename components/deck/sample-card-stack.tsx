import type { Accent, Card } from "@/lib/content/types";
import { AccentCard, Pill, type PillTone } from "@/components/brand/primitives";
import { HeartDoodle } from "@/components/brand/doodles";
import { LockIcon } from "@/components/brand/icons";

const ALTERNATES: Accent[] = ["cream", "purple", "magenta", "orange", "blue"];

/** Positions from the Deck detail artboard, as % of the stack width so it scales to 360 px. */
// Back cards keep their text at the top so the front card never covers it.
const SLOTS = [
  { className: "top-[22px] left-[1%] h-[128px] w-[50%] items-start pt-5", rotate: -7 },
  { className: "top-3 left-[47%] h-[140px] w-[51%] items-start pt-5", rotate: 6 },
  { className: "top-[132px] left-[19%] h-[100px] w-[52%] items-end", rotate: -2 },
] as const;

// Two stickers, as in the design: on the first card and on the right card's lower edge.
const LEVEL_PILLS: { className: string; rotate: number; tone: PillTone }[] = [
  { className: "top-0.5 left-[17%]", rotate: -16, tone: "orange" },
  { className: "top-[138px] left-[76%]", rotate: 18, tone: "blue" },
];

function sampleAccents(accent: Accent): Accent[] {
  return [accent, ...ALTERNATES.filter((a) => a !== accent)].slice(0, 3);
}

/**
 * Three tilted sample cards. Spicy decks render face-down cards with no text,
 * so spicy prompts never appear in server HTML (DECISIONS.md #8).
 */
export function SampleCardStack({
  cards,
  accent,
  showLevels,
  hidden,
}: {
  cards: Card[];
  accent: Accent;
  showLevels: boolean;
  hidden: boolean;
}) {
  const accents = sampleAccents(accent);

  return (
    <figure className="relative mt-3 h-[244px]" aria-label={hidden ? "Sample cards, hidden until 18+ is confirmed" : "Sample cards"}>
      {SLOTS.map((slot, i) => {
        const card = cards[i];
        if (!card && !hidden) return null;
        return (
          <AccentCard
            key={card?.id ?? i}
            accent={hidden ? "berry" : (accents[i] ?? accent)}
            rotate={slot.rotate}
            className={`absolute flex items-end p-3.5 ${slot.className}`}
          >
            {hidden ? (
              <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                <LockIcon size={16} /> 18+
              </span>
            ) : (
              <p className="line-clamp-3 text-[15px] leading-[1.2] font-semibold">
                {card?.type === "would_you_rather" && card.option_a && card.option_b
                  ? `${card.option_a} or ${card.option_b}?`
                  : card?.text}
              </p>
            )}
          </AccentCard>
        );
      })}

      {showLevels &&
        !hidden &&
        cards.slice(0, LEVEL_PILLS.length).map((card, i) => {
          const pill = LEVEL_PILLS[i];
          if (!pill) return null;
          return (
            <Pill
              key={`pill-${card.id}`}
              tone={pill.tone}
              rotate={pill.rotate}
              className={`absolute px-3.5 py-[7px] text-[13px] ${pill.className}`}
            >
              Level {card.level}
            </Pill>
          );
        })}

      <HeartDoodle className="top-[182px] left-3 -rotate-[14deg]" />
    </figure>
  );
}
