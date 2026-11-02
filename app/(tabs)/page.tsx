import { AppShell } from "@/components/layout/app-shell";
import { HomeContent } from "@/components/home/home-content";
import { getCategories, getDeckInfoMap, getDeckSummaries } from "@/lib/content/load.server";
import { ONBOARDED_FLAG } from "@/lib/db/flags";

/**
 * First-time visitors go to onboarding before anything paints. Shared deck
 * and card links never hit this, so they open straight into the game.
 */
const FIRST_VISIT_REDIRECT = `try{if(!localStorage.getItem(${JSON.stringify(ONBOARDED_FLAG)}))location.replace("/welcome")}catch(e){}`;

export default function HomePage() {
  const info = getDeckInfoMap();
  const accents = Object.fromEntries(Object.entries(info).map(([id, d]) => [id, d.accent]));
  return (
    <AppShell withTabBar>
      <script dangerouslySetInnerHTML={{ __html: FIRST_VISIT_REDIRECT }} />
      <HomeContent decks={getDeckSummaries()} categories={getCategories()} accents={accents} />
    </AppShell>
  );
}
