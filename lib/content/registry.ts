/**
 * Static content registry. Imports every deck JSON so it is bundled with the
 * server (build-time pages, OG images). Import only from server code — use
 * `load.server.ts` in the app; tests import this file directly.
 *
 * Adding a deck: drop the JSON in /content/decks, add it below and to
 * /content/manifest.json. The content test fails if they drift apart.
 */
import afterDark from "@/content/decks/after-dark.json";
import dateNightIn from "@/content/decks/date-night-in.json";
import deepTalk from "@/content/decks/deep-talk.json";
import faithAndFamily from "@/content/decks/faith-and-family.json";
import firstSpark from "@/content/decks/first-spark.json";
import longDistance from "@/content/decks/long-distance.json";
import loveLanguages from "@/content/decks/love-languages.json";
import moneyMatters from "@/content/decks/money-matters.json";
import thisOrThat from "@/content/decks/this-or-that.json";
import wouldYouRatherSpicy from "@/content/decks/would-you-rather-spicy.json";
import categoriesJson from "@/content/categories.json";
import manifestJson from "@/content/manifest.json";
import type { Category, ContentManifest, Deck } from "./types";

// JSON imports widen literal unions to `string`; the content test verifies
// every value against the real types, so these casts are checked in CI.
export const DECKS = [
  firstSpark,
  thisOrThat,
  deepTalk,
  loveLanguages,
  moneyMatters,
  dateNightIn,
  faithAndFamily,
  longDistance,
  afterDark,
  wouldYouRatherSpicy,
] as unknown as Deck[];

export const CATEGORIES = (categoriesJson as unknown as Category[])
  .slice()
  .sort((a, b) => a.order - b.order);

export const MANIFEST = manifestJson as ContentManifest;
