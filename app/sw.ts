/// <reference lib="webworker" />
/**
 * Service worker (PRD §5.4, §8 Offline).
 * - App shell + JS chunks: precached at install.
 * - Deck packs (/decks/<slug>.v<n>.json): cache-first. Filenames are versioned, so a
 *   cached pack never goes stale; a new version is a new URL.
 * - Pages: network-first with a 3 s timeout (slow 4G), falling back to the cache,
 *   then to /~offline.
 * - Updates wait until the user taps "Refresh" in the banner (no reload mid-game).
 */
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import { DECK_CACHE, PAGES_CACHE } from "@/lib/pwa/constants";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && /^\/decks\/[a-z0-9-]+\.v\d+\.json$/.test(url.pathname),
      handler: new CacheFirst({
        cacheName: DECK_CACHE,
        plugins: [new ExpirationPlugin({ maxEntries: 60 })],
      }),
    },
    {
      // Self-hosted fonts (next/font): only the subsets actually used get fetched.
      // Cache-first with no expiry so offline play keeps the real typefaces.
      matcher: ({ url, sameOrigin }) => sameOrigin && /^\/_next\/static\/media\/.+\.woff2$/.test(url.pathname),
      handler: new CacheFirst({ cacheName: "app-fonts", plugins: [new ExpirationPlugin({ maxEntries: 12 })] }),
    },
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 200 })],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

serwist.addEventListeners();
