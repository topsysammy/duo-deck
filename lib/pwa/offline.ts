"use client";

import manifest from "@/content/manifest.json";
import type { ContentManifest } from "@/lib/content/types";
import { deckDataUrl } from "@/lib/content/fetch-deck";
import { DECK_CACHE, PAGES_CACHE } from "./constants";

const MANIFEST = manifest as ContentManifest;

function cachesAvailable() {
  return typeof window !== "undefined" && "caches" in window && navigator.serviceWorker?.controller != null;
}

/**
 * Makes an opened deck fully playable offline (PW-2): stores its Play and
 * Deck pages so a cold start or reload works with no network. The pack itself
 * is cached by the service worker when Play fetches it. Best effort, silent.
 */
export async function keepDeckOffline(slug: string): Promise<void> {
  if (!cachesAvailable()) return;
  try {
    const pages = await caches.open(PAGES_CACHE);
    await Promise.all(
      [`/play/${slug}`, `/deck/${slug}`].map(async (url) => {
        if (!(await pages.match(url))) await pages.add(url);
      }),
    );
  } catch {
    /* offline or quota: try again next time */
  }
}

/** "Download all decks" (PW-3): every pack plus its pages. Reports progress 0–1. */
export async function downloadAllDecks(onProgress: (done: number, total: number) => void): Promise<boolean> {
  if (!cachesAvailable()) return false;
  const entries = Object.entries(MANIFEST.decks);
  const [decks, pages] = await Promise.all([caches.open(DECK_CACHE), caches.open(PAGES_CACHE)]);
  let done = 0;
  onProgress(0, entries.length);
  for (const [slug, { version }] of entries) {
    await Promise.all([decks.add(deckDataUrl(slug, version)), pages.add(`/play/${slug}`), pages.add(`/deck/${slug}`)]);
    onProgress(++done, entries.length);
  }
  return true;
}

/** How many decks are stored for offline play. */
export async function offlineDeckCount(): Promise<number> {
  if (typeof window === "undefined" || !("caches" in window)) return 0;
  const cache = await caches.open(DECK_CACHE);
  const keys = await cache.keys();
  const current = new Set(Object.entries(MANIFEST.decks).map(([slug, { version }]) => deckDataUrl(slug, version)));
  return keys.filter((r) => current.has(new URL(r.url).pathname)).length;
}
