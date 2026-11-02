import type { CSSProperties, ReactNode } from "react";
import type { Accent } from "@/lib/content/types";
import { cn } from "@/lib/utils";

export function Logo({ className, as: Tag = "div" }: { className?: string; as?: "div" | "span" }) {
  return (
    <Tag className={cn("font-display leading-none text-pink", className)}>
      duo deck<span aria-hidden="true">.</span>
    </Tag>
  );
}

const PILL_TONES = {
  orange: "bg-orange text-ink",
  blue: "bg-blue text-white",
  magenta: "bg-magenta text-white",
  pink: "bg-pink text-ink-strong",
} as const;

export type PillTone = keyof typeof PILL_TONES;

/** Tilted sticker label ("Tonight", "Level 1"). Rotation is decorative. */
export function Pill({
  children,
  tone = "orange",
  rotate = 0,
  className,
}: {
  children: ReactNode;
  tone?: PillTone;
  rotate?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-chip px-4 py-2 text-sm font-medium whitespace-nowrap",
        PILL_TONES[tone],
        className,
      )}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {children}
    </span>
  );
}

/**
 * A rounded, pink-bordered card filled with an accent swatch. The base for
 * deck tiles, sample cards and (in Phase 2) the play card.
 */
export function AccentCard({
  accent,
  rotate = 0,
  className,
  style,
  children,
}: {
  accent: Accent;
  rotate?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      data-accent={accent}
      className={cn("bg-accent card-border rounded-card text-on-accent relative overflow-hidden", className)}
      style={{ ...(rotate ? { transform: `rotate(${rotate}deg)` } : null), ...style }}
    >
      {children}
    </div>
  );
}
