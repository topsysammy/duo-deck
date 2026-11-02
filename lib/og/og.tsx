import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ACCENT_HEX, BRAND } from "@/lib/content/accents";
import type { Accent } from "@/lib/content/types";

/**
 * Open Graph images (CB-3, PRD §8 "SEO & sharing"), rendered at build time
 * with next/og (the @vercel/og engine bundled in Next). Satori needs static
 * WOFF/TTF fonts, vendored in /assets/fonts (OFL).
 */
export const OG_SIZE = { width: 1200, height: 630 };

async function fonts() {
  const dir = join(process.cwd(), "assets", "fonts");
  const [bagel, outfit600, outfit400] = await Promise.all([
    readFile(join(dir, "BagelFatOne-Regular.woff")),
    readFile(join(dir, "Outfit-SemiBold.woff")),
    readFile(join(dir, "Outfit-Regular.woff")),
  ]);
  return [
    { name: "Bagel", data: bagel, weight: 400 as const, style: "normal" as const },
    { name: "Outfit", data: outfit600, weight: 600 as const, style: "normal" as const },
    { name: "Outfit", data: outfit400, weight: 400 as const, style: "normal" as const },
  ];
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BRAND.bg,
        color: BRAND.fg,
        fontFamily: "Outfit",
        padding: "64px 72px",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

function Logo({ size = 44 }: { size?: number }) {
  return <div style={{ fontFamily: "Bagel", fontSize: size, color: BRAND.pink, lineHeight: 1 }}>duo deck.</div>;
}

function CardStack({ accent, text, locked }: { accent: Accent; text: string; locked?: boolean }) {
  const back = ACCENT_HEX[accent === "cream" ? "magenta" : accent];
  return (
    <div style={{ display: "flex", position: "relative", width: 420, height: 500 }}>
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 40,
          width: 360,
          height: 450,
          borderRadius: 40,
          border: `6px solid ${BRAND.pink}`,
          background: back.bg,
          transform: "rotate(8deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 10,
          width: 360,
          height: 450,
          borderRadius: 40,
          border: `6px solid ${BRAND.pink}`,
          background: locked ? ACCENT_HEX.berry.bg : BRAND.cream,
          color: locked ? "#FFFFFF" : BRAND.ink,
          transform: "rotate(-4deg)",
          display: "flex",
          alignItems: locked ? "center" : "flex-end",
          justifyContent: locked ? "center" : "flex-start",
          padding: 36,
          fontSize: locked ? 64 : text.length > 70 ? 32 : 38,
          fontWeight: 600,
          lineHeight: 1.18,
        }}
      >
        {text}
      </div>
    </div>
  );
}

export async function deckImage(deck: {
  name: string;
  tagline: string;
  accent: Accent;
  is_spicy: boolean;
  sample?: string;
  meta: string;
}) {
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column", width: 640, height: "100%" }}>
          <Logo />
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" }}>
            <div style={{ fontFamily: "Bagel", fontSize: deck.name.length > 16 ? 72 : 96, lineHeight: 1.02 }}>
              {deck.name}
            </div>
            <div style={{ fontSize: 34, color: BRAND.muted, marginTop: 20, lineHeight: 1.3 }}>
              {deck.is_spicy ? "Flirty card game for couples. 18+ only." : deck.tagline}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: BRAND.fg }}>
            {deck.meta} · Free · No download
          </div>
        </div>
        <CardStack
          accent={deck.accent}
          locked={deck.is_spicy}
          text={deck.is_spicy ? "18+" : (deck.sample ?? deck.tagline)}
        />
      </Frame>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}

export async function cardImage(card: { text: string; deckName: string; isWyr: boolean }) {
  return new ImageResponse(
    (
      <Frame>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 700,
            height: 500,
            borderRadius: 44,
            border: `6px solid ${BRAND.pink}`,
            background: BRAND.cream,
            color: BRAND.ink,
            padding: "40px 48px",
            transform: "rotate(-2deg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: BRAND.orange,
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {card.isWyr ? `${card.deckName} · Would you rather` : card.deckName}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "auto",
              marginBottom: "auto",
              fontSize: card.text.length > 90 ? 44 : 54,
              fontWeight: 600,
              lineHeight: 1.15,
            }}
          >
            {card.text}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 300, marginLeft: 56, justifyContent: "space-between" }}>
          <Logo size={48} />
          <div style={{ display: "flex", flexDirection: "column", fontSize: 30, lineHeight: 1.3 }}>
            <div>Ask your partner.</div>
            <div style={{ color: BRAND.muted }}>Free card games for couples</div>
          </div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
