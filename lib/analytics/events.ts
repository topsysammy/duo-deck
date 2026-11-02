/**
 * Analytics event contract (PRD §10). Pure: names and property builders only.
 */
import type { Card, DeckMode } from "@/lib/content/types";

export const EVENTS = [
  "app_opened",
  "onboarding_completed",
  "deck_opened",
  "card_viewed",
  "card_skipped",
  "card_favorited",
  "card_shared",
  "level_changed",
  "session_ended",
  "pwa_install_prompted",
  "pwa_installed",
  "signin_completed",
  "shared_link_opened",
] as const;

export type EventName = (typeof EVENTS)[number];

/** Play mode as reported in analytics. */
export type PlayModeProp = DeckMode | "favorites";

/** Every card event carries deck_id, card_id, level and mode (PRD §10). */
export interface CardProps {
  deck_id: string;
  card_id: string;
  level: number;
  mode: PlayModeProp;
  [key: string]: unknown;
}

/**
 * `level` is the card's level in its own deck. In the favorites mini-deck the
 * engine flattens levels, so callers pass the original card.
 */
export function cardProps(card: Pick<Card, "id" | "deck_id" | "level">, mode: PlayModeProp): CardProps {
  return { deck_id: card.deck_id, card_id: card.id, level: card.level, mode };
}

/** A shared link landing: /deck/<slug> or /deck/<slug>/card/<id>. */
export function sharedLinkProps(pathname: string): { deck_id: string; card_id: string | null } | null {
  const m = /^\/deck\/([a-z0-9-]+)(?:\/card\/([a-z0-9-]+))?\/?$/.exec(pathname);
  return m ? { deck_id: m[1] as string, card_id: m[2] ?? null } : null;
}
