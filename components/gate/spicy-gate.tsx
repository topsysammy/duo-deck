"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSettings } from "@/hooks/use-settings";
import { confirmAdult } from "@/lib/db/settings";
import { canSeeSpicy } from "@/lib/prefs/filters";
import { AppShell } from "@/components/layout/app-shell";
import { AccentCard, Logo } from "@/components/brand/primitives";
import { HeartDoodle } from "@/components/brand/doodles";
import { LockIcon } from "@/components/brand/icons";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * 18+ gate for spicy decks (ON-6, CB-4), including when opened from a shared
 * link. Children (and any spicy content they fetch) mount only after the
 * visitor confirms 18+ and the content filter is off.
 */
export function SpicyGate({ deckName, children }: { deckName: string; children: ReactNode }) {
  const { prefs, loaded } = useSettings();

  if (!loaded) return <AppShell>{null}</AppShell>;
  if (canSeeSpicy(prefs)) return <>{children}</>;

  const filtered = prefs.is18Confirmed && prefs.hideSpicy;

  return (
    <AppShell>
      <Logo className="text-center text-[28px]" />
      <div className="relative mx-auto mt-10 h-[210px] w-[270px]" aria-hidden="true">
        <AccentCard accent="magenta" rotate={-9} className="absolute top-6 left-0 h-[160px] w-[150px]" />
        <AccentCard accent="berry" rotate={7} className="absolute top-1 left-[104px] flex h-[170px] w-[150px] items-center justify-center">
          <span className="flex flex-col items-center gap-1 text-white">
            <LockIcon size={34} />
            <span className="text-xl font-semibold">18+</span>
          </span>
        </AccentCard>
        <HeartDoodle className="top-[170px] left-[228px] rotate-12" />
      </div>

      <h1 className="mt-8 font-display text-[36px] leading-[1.04] font-normal tracking-[-0.5px]">
        {filtered ? "Spicy decks are hidden" : "Just for grown-ups"}
      </h1>
      <p className="mt-3 text-[17px] leading-[1.4] text-muted">
        {filtered
          ? `${deckName} is hidden by your content filter. Show spicy decks again?`
          : `${deckName} is a flirty deck for couples aged 18 and over. Suggestive, never explicit.`}
      </p>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <Button size="lg" onClick={() => void confirmAdult()}>
          {filtered ? "Show spicy decks" : "We’re both 18 or older"}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "md" })}>
          Take me back
        </Link>
        <p className="text-center text-[13px] text-muted">You can hide spicy decks any time in Us → Content.</p>
      </div>
    </AppShell>
  );
}
