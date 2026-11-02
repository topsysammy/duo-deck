"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Reads a query-string value without `useSearchParams`, which would make
 * statically prerendered pages bail out to client-only rendering (empty server
 * HTML, late first paint). Returns undefined on the server and during
 * hydration, then the value (or null when absent) straight after.
 */
export function useQueryParam(name: string): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(
    noop,
    () => new URLSearchParams(window.location.search).get(name),
    () => undefined,
  );
}
