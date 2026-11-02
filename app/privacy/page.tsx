import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ChevronLeft } from "@/components/brand/icons";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Duo Deck handles your data: on your phone by default, no ads, no selling data.",
};

/**
 * Plain-language privacy notice (PRD §8: NDPA 2023, GDPR, CCPA).
 * DRAFT: placeholders in [brackets] must be filled and the text reviewed before launch.
 */
export default function PrivacyPage() {
  return (
    <AppShell>
      <Link href="/us" aria-label="Back" className={buttonVariants({ variant: "secondary", size: "icon" })}>
        <ChevronLeft />
      </Link>
      <article className="mt-6 flex flex-col gap-4 text-[16px] leading-relaxed text-muted [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg">
        <h1 className="font-display text-[38px] leading-none font-normal text-fg">Privacy</h1>
        <p>Last updated: [DATE]. Duo Deck is free, has no ads and never sells or shares your personal data.</p>

        <h2>If you play without an account</h2>
        <p>
          Your favorites, play history, partner names and settings are stored only in this browser on your phone
          (IndexedDB). We can&apos;t see them. Clearing your browser data, or Us → Delete my data, removes them.
        </p>

        <h2>If you sign in</h2>
        <p>
          Signing in (Google or an email link) is optional and only used to sync your favorites, play history and
          settings across devices. We store your email address, display name and that synced data with our database
          provider, Supabase, protected so only you can read your rows.
        </p>

        <h2>Analytics</h2>
        <p>
          We measure how the app is used (for example, which cards are skipped or saved) with privacy-friendly,
          cookieless analytics, to improve the cards. We don&apos;t track you across other sites or use ad trackers.
        </p>

        <h2>Your rights</h2>
        <p>
          Under the Nigeria Data Protection Act 2023, the GDPR and the CCPA you can access, correct or delete your
          data. Deleting your account removes your synced data within 30 days; data on your phone is removed
          immediately.
        </p>

        <h2>Contact</h2>
        <p>[CONTROLLER NAME AND ADDRESS] · [CONTACT EMAIL]</p>
      </article>
    </AppShell>
  );
}
