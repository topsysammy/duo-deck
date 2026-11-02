import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

/** A new id per build so the precached app-shell pages refresh on every deploy. */
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID();

/**
 * Serwist (PWA, PRD §5.4). It hooks into webpack, so production builds run
 * with `next build --webpack`; the service worker is off in development.
 */
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // We register the worker ourselves (components/pwa) to drive the update banner.
  register: false,
  // Never reload on reconnect: it would interrupt a game (PW-4).
  reloadOnOnline: false,
  cacheOnNavigation: true,
  // Precache icons only. Deck packs are cached when opened (PW-2) or via "Download all decks".
  globPublicPatterns: ["icons/**/*"],
  // Skip font files (next/font emits every subset; only a few are used, cached at runtime
  // by app/sw.ts) and OG image route chunks (never used in the browser).
  manifestTransforms: [
    async (entries) => ({
      manifest: entries.filter((e) => !/\.woff2?$/.test(e.url) && !e.url.includes("opengraph-image")),
      warnings: [],
    }),
  ],
  additionalPrecacheEntries: ["/", "/~offline", "/saved", "/us", "/welcome", "/session", "/play/favorites"].map(
    (url) => ({ url, revision }),
  ),
});

export default process.env.NODE_ENV === "development" ? nextConfig : withSerwist(nextConfig);
