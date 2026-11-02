import { forwardRef } from "react";
import type { Accent, Card } from "@/lib/content/types";

/**
 * 1080×1920 story-format card image (EN-3), rendered off-screen and turned
 * into a PNG by html-to-image. Never rendered for spicy cards (see canShareAsImage).
 */
export const ShareImage = forwardRef<HTMLDivElement, { card: Card; deckName: string; accent: Accent; host: string }>(
  function ShareImage({ card, deckName, accent, host }, ref) {
    const isWyr = card.type === "would_you_rather";
    return (
      <div
        ref={ref}
        className="relative flex flex-col items-center overflow-hidden bg-black font-sans text-white"
        style={{ width: 1080, height: 1920, padding: "120px 96px 110px" }}
      >
        <div className="font-display text-pink" style={{ fontSize: 96, lineHeight: 1 }}>
          duo deck.
        </div>

        <div className="relative mt-[110px] w-full" style={{ height: 1180 }}>
          <div
            data-accent={accent === "cream" ? "magenta" : accent}
            className="bg-accent absolute"
            style={{ inset: "40px 10px 10px 40px", borderRadius: 80, border: "8px solid var(--pink)", transform: "rotate(6deg)" }}
          />
          <div
            className="absolute flex flex-col bg-cream text-ink"
            style={{
              inset: "10px 40px 40px 10px",
              borderRadius: 80,
              border: "8px solid var(--pink)",
              padding: "96px 84px",
              transform: "rotate(-3deg)",
            }}
          >
            <div
              className="self-start rounded-full bg-orange text-ink"
              style={{ fontSize: 40, fontWeight: 600, padding: "18px 40px" }}
            >
              {deckName}
            </div>
            {isWyr && (
              <div style={{ marginTop: 56, fontSize: 36, fontWeight: 600, letterSpacing: 2, color: "var(--ink-muted)" }}>
                WOULD YOU RATHER
              </div>
            )}
            <p className="my-auto" style={{ fontSize: card.text.length > 90 ? 70 : 82, fontWeight: 600, lineHeight: 1.14, letterSpacing: -1 }}>
              {card.text}
            </p>
            <div style={{ fontSize: 36, color: "var(--ink-muted)" }}>Ask your partner tonight</div>
          </div>
        </div>

        <div className="mt-auto text-center" style={{ fontSize: 40, lineHeight: 1.35 }}>
          <div style={{ fontWeight: 600 }}>Free card games for couples</div>
          <div className="text-muted">{host}</div>
        </div>
      </div>
    );
  },
);
