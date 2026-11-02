import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AccentCard, Logo } from "@/components/brand/primitives";
import { CrownDoodle } from "@/components/brand/doodles";
import { ChevronLeft } from "@/components/brand/icons";
import { buttonVariants } from "@/components/ui/button";
import { ShareCardButton } from "@/components/share/share-card-button";
import { SpicyGate } from "@/components/gate/spicy-gate";
import { SpicyCardText } from "@/components/gate/spicy-card-text";
import { getCategories, getDeck } from "@/lib/content/load.server";
import { DECKS } from "@/lib/content/registry";
import { deckAccent } from "@/lib/content/deck-utils";
import { canShareAsImage, cardPath } from "@/lib/share/share";
import type { Card } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type Params = { slug: string; id: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return DECKS.flatMap((d) => d.cards.map((c) => ({ slug: d.slug, id: c.id })));
}

function find(params: Params) {
  const deck = getDeck(params.slug);
  const card = deck?.cards.find((c) => c.id === params.id);
  return deck && card ? { deck, card } : null;
}

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = find(await params);
  if (!found) return {};
  const { deck, card } = found;
  const hidden = !canShareAsImage(card, deck.is_spicy);
  const title = hidden ? `A card from ${deck.name}` : clip(card.text, 70);
  const description = hidden
    ? `A flirty card from ${deck.name} on Duo Deck. 18+ only.`
    : `Ask your partner: “${card.text}” A card from ${deck.name}, free on Duo Deck.`;
  return {
    title,
    description,
    alternates: { canonical: cardPath(card) },
    openGraph: { title: `${title} · Duo Deck`, description, url: cardPath(card) },
  };
}

/**
 * Shared card link (PRD flow 1): shows the card, then "Play this deck".
 * Spicy card text is never put in this HTML: the 18+ gate comes first, then
 * the text is fetched on the client.
 */
export default async function CardPage({ params }: { params: Promise<Params> }) {
  const found = find(await params);
  if (!found) notFound();
  const { deck, card } = found;
  const hidden = !canShareAsImage(card, deck.is_spicy);
  const accent = deckAccent(deck, getCategories());

  // Never send spicy text to the client.
  const shareCard: Card = hidden ? { ...card, text: "", option_a: null, option_b: null } : card;

  const page = (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link
          href={`/deck/${deck.slug}`}
          aria-label={`See the ${deck.name} deck`}
          className={buttonVariants({ variant: "secondary", size: "icon" })}
        >
          <ChevronLeft />
        </Link>
        <Logo className="text-[26px]" />
        <ShareCardButton card={shareCard} deckName={deck.name} deckIsSpicy={deck.is_spicy} accent={accent} />
      </div>

      <p className="mt-7 text-[15px] text-muted">A card from</p>
      <h1 className="font-display text-[38px] leading-[1.04] font-normal tracking-[-0.5px]">{deck.name}</h1>

      <div className="relative mt-8 h-[380px]">
        <AccentCard
          accent={accent === "cream" ? "magenta" : accent}
          rotate={5}
          className="absolute inset-[18px_6px_8px_14px] rounded-card-lg"
        />
        <div className="card-border absolute inset-[8px_10px_16px_4px] flex -rotate-2 flex-col rounded-card-lg bg-cream px-6 pt-7 pb-6 text-ink">
          {hidden ? (
            <>
              <SpicyCardText deckId={deck.id} cardId={card.id} />
              <p className="text-sm text-ink-muted">Ask your partner, then play the whole deck.</p>
            </>
          ) : (
            <>
              {card.type === "would_you_rather" && (
                <p className="text-[13px] font-semibold tracking-[0.5px] text-ink-muted uppercase">Would you rather</p>
              )}
              <blockquote className="my-auto text-[clamp(24px,7.4vw,29px)] leading-[1.16] font-semibold tracking-[-0.4px]">
                {card.text}
              </blockquote>
              <p className="text-sm text-ink-muted">Ask your partner, then play the whole deck.</p>
            </>
          )}
        </div>
        <CrownDoodle width={44} className="-top-[22px] -right-1 rotate-[18deg]" />
      </div>

      <div className="mt-auto flex flex-col gap-1.5 pt-8">
        <Link href={`/play/${deck.slug}`} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Play this deck
        </Link>
        <Link href="/" className="flex min-h-11 items-center self-center text-sm text-muted hover:text-fg">
          See all decks · free, no sign-up
        </Link>
      </div>
    </AppShell>
  );
  return deck.is_spicy ? <SpicyGate deckName={deck.name}>{page}</SpicyGate> : page;
}
