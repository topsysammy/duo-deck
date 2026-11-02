"use client";

import { useCallback, useEffect, useState } from "react";
import type { Deck } from "@/lib/content/types";
import { fetchDeck } from "@/lib/content/fetch-deck";

type DeckState =
  | { status: "loading"; deck: null }
  | { status: "ready"; deck: Deck }
  | { status: "error"; deck: null };

/** Loads a deck pack on the client (cached by the service worker for offline play). */
export function useDeckData(slug: string, version: number) {
  const [state, setState] = useState<DeckState>({ status: "loading", deck: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading", deck: null });
    fetchDeck(slug, version, ctrl.signal)
      .then((deck) => setState({ status: "ready", deck }))
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          console.warn(err);
          setState({ status: "error", deck: null });
        }
      });
    return () => ctrl.abort();
  }, [slug, version, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
