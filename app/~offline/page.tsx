import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Logo } from "@/components/brand/primitives";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

/** Served by the service worker when a page isn't cached and there's no network. */
export default function OfflinePage() {
  return (
    <AppShell className="items-center justify-center gap-4 text-center">
      <Logo className="text-[30px]" />
      <h1 className="font-display text-[32px] leading-none font-normal">You&apos;re offline</h1>
      <p className="text-muted">
        This page isn&apos;t saved on your phone yet. Decks you&apos;ve opened before still work. Pick one from
        your decks.
      </p>
      <Link href="/" className={buttonVariants({ size: "md" })}>
        Go to my decks
      </Link>
    </AppShell>
  );
}
