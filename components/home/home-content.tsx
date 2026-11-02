"use client";

import Link from "next/link";
import type { Accent, Category, DeckSummary } from "@/lib/content/types";
import { forYou, visibleDecks } from "@/lib/prefs/filters";
import { useSettings } from "@/hooks/use-settings";
import { Logo } from "@/components/brand/primitives";
import { UserIcon } from "@/components/brand/icons";
import { HeroPick } from "./hero-pick";
import { DeckRow, DeckTile } from "./deck-tile";

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

/**
 * Home body. Server-rendered with default prefs (identical to the client's
 * first render), then re-ranked from the quiz answers once IndexedDB loads.
 */
export function HomeContent({
  decks: allDecks,
  categories,
  accents,
}: {
  decks: DeckSummary[];
  categories: Category[];
  accents: Record<string, Accent>;
}) {
  const { settings, prefs } = useSettings();
  const decks = visibleDecks(allDecks, prefs);
  const [hero, ...rest] = forYou(decks, prefs);
  const accentOf = (d: DeckSummary) => accents[d.id] ?? "cream";
  const a = settings.partnerA.trim();
  const b = settings.partnerB.trim();

  return (
    <>
      <header className="flex items-center justify-between">
        <Logo className="text-[26px]" />
        <Link
          href="/us"
          aria-label="Your profile and settings"
          className="flex min-h-11 items-center no-underline"
        >
          {a || b ? (
            <span aria-hidden="true" className="flex">
              {[
                { n: a, cls: "bg-orange text-ink" },
                { n: b, cls: "-ml-3 bg-blue text-white" },
              ]
                .filter((x) => x.n)
                .map((x) => (
                  <span
                    key={x.cls}
                    className={`flex size-10 items-center justify-center rounded-full border-2 border-black font-semibold ${x.cls}`}
                  >
                    {initial(x.n)}
                  </span>
                ))}
            </span>
          ) : (
            <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-white">
              <UserIcon size={20} />
            </span>
          )}
        </Link>
      </header>

      <h1 className="mt-[22px] mb-1.5 font-display text-[40px] leading-[1.02] font-normal tracking-[-0.5px] break-words">
        {a && b ? (
          <>
            Hey {a}
            <br />
            &amp; {b}
          </>
        ) : a || b ? (
          `Hey ${a || b}`
        ) : (
          "Hey you two"
        )}
      </h1>
      <p className="text-[17px] text-muted">What are we talking about tonight?</p>

      {hero && <HeroPick deck={hero} accent={accentOf(hero)} />}

      <section aria-labelledby="for-you" className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 id="for-you" className="text-[19px] font-semibold">
            For you
          </h2>
          <a href="#all-decks" className="text-sm no-underline">
            See all
          </a>
        </div>
        <DeckRow label="Recommended decks">
          {rest.map((d, i) => (
            <li key={d.id} className="flex">
              <DeckTile deck={d} accent={accentOf(d)} index={i} />
            </li>
          ))}
        </DeckRow>
      </section>

      <div id="all-decks" className="scroll-mt-6">
        {categories.map((category) => {
          const inCategory = decks.filter((d) => d.category_id === category.id);
          if (inCategory.length === 0) return null;
          const headingId = `cat-${category.id}`;
          return (
            <section key={category.id} aria-labelledby={headingId} className="mt-4">
              <h2 id={headingId} className="text-[19px] font-semibold">
                {category.name}
              </h2>
              <p className="mt-0.5 text-sm text-muted">{category.description}</p>
              <DeckRow label={`${category.name} decks`}>
                {inCategory.map((d, i) => (
                  <li key={d.id} className="flex">
                    <DeckTile deck={d} accent={accentOf(d)} index={i + 1} />
                  </li>
                ))}
              </DeckRow>
            </section>
          );
        })}
      </div>
    </>
  );
}
