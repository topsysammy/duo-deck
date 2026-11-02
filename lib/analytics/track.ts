"use client";

/**
 * Analytics (PRD §10) via PostHog in cookieless mode: no cookies, no
 * localStorage, no session replay, no autocapture. posthog-js is loaded only
 * after the page is idle, so it never counts towards first-load JS; events
 * fired before that are queued. Respects Do Not Track / Global Privacy
 * Control and the in-app "Share anonymous usage stats" switch.
 */
import type { EventName } from "./events";

type PostHog = typeof import("posthog-js").default;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const OPT_OUT = "dd-analytics-off";
const MAX_QUEUE = 100;

let ph: PostHog | null = null;
let loading = false;
const queue: [EventName, Record<string, unknown>][] = [];

export function analyticsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return false;
  try {
    return localStorage.getItem(OPT_OUT) !== "1";
  } catch {
    return true;
  }
}

export function setAnalyticsEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(OPT_OUT);
    else localStorage.setItem(OPT_OUT, "1");
  } catch {
    /* ignore */
  }
  if (!on) {
    queue.length = 0;
    ph?.opt_out_capturing();
  } else {
    ph?.opt_in_capturing();
  }
}

function load() {
  if (loading || !KEY) return;
  loading = true;
  const start = () =>
    import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(KEY, {
          api_host: HOST,
          cookieless_mode: "always",
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          disable_session_recording: true,
          disable_surveys: true,
          person_profiles: "identified_only",
        });
        ph = posthog;
        for (const [name, props] of queue.splice(0)) ph.capture(name, props);
      })
      .catch(() => {
        loading = false; // offline: try again on the next event
      });
  if ("requestIdleCallback" in window) window.requestIdleCallback(() => void start(), { timeout: 4000 });
  else setTimeout(() => void start(), 2000);
}

export function track(name: EventName, props: Record<string, unknown> = {}): void {
  if (!analyticsAllowed()) return;
  if (process.env.NODE_ENV !== "production") console.debug("[analytics]", name, props);
  if (ph) {
    ph.capture(name, props);
    return;
  }
  if (queue.length < MAX_QUEUE) queue.push([name, props]);
  load();
}
