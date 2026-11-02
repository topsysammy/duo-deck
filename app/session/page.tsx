import type { Metadata } from "next";
import { Suspense } from "react";
import { getDeckInfoMap } from "@/lib/content/load.server";
import { SessionSummary } from "./session-summary";

export const metadata: Metadata = { title: "Nice one", robots: { index: false } };

export default function SessionPage() {
  return (
    <Suspense>
      <SessionSummary decks={getDeckInfoMap()} />
    </Suspense>
  );
}
