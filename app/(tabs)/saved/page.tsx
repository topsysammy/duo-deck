import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { SavedList } from "@/components/saved/saved-list";
import { getDeckInfoMap, getDeckSummaries } from "@/lib/content/load.server";

export const metadata: Metadata = { title: "Saved cards", robots: { index: false } };

export default function SavedPage() {
  return (
    <AppShell withTabBar>
      <h1 className="mt-4 font-display text-[40px] leading-none font-normal">Saved</h1>
      <SavedList decks={getDeckInfoMap()} order={getDeckSummaries().map((d) => d.id)} />
    </AppShell>
  );
}
