"use client";

import { useEffect } from "react";
import { hasSignedInFlag, isSupabaseConfigured } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/track";
import { sharedLinkProps } from "@/lib/analytics/events";

/**
 * App-wide side effects, mounted once in the root layout. Renders nothing.
 * - Analytics: app_opened and shared_link_opened (PRD §10).
 * - Sync: loads the sync watcher (and Supabase) only on devices that signed in.
 */
export function AppEffects() {
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    track("app_opened", { standalone, path: window.location.pathname });

    const shared = sharedLinkProps(window.location.pathname);
    const fromOutside = !document.referrer || !document.referrer.startsWith(window.location.origin);
    if (shared && fromOutside) track("shared_link_opened", shared);

    if (isSupabaseConfigured() && hasSignedInFlag()) {
      void import("@/lib/sync/watch").then((m) => m.startSyncWatcher());
    }
  }, []);
  return null;
}
