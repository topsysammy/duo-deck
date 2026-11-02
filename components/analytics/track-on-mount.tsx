"use client";

import { useEffect } from "react";
import type { EventName } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/** Fires one analytics event when a (server-rendered) page mounts. */
export function TrackOnMount({ event, props }: { event: EventName; props: Record<string, string | number | boolean | null> }) {
  const key = JSON.stringify(props);
  useEffect(() => {
    track(event, JSON.parse(key) as Record<string, unknown>);
  }, [event, key]);
  return null;
}
