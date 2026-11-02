"use client";

import { useSyncExternalStore } from "react";

/** Chrome/Android install prompt event (not in lib.dom). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaState {
  /** Android/Chrome: install prompt available. */
  installEvent: BeforeInstallPromptEvent | null;
  /** Running as an installed app, or just installed. */
  installed: boolean;
  /** iPhone/iPad: no install prompt, show instructions instead. */
  isIos: boolean;
  /** A new service worker is waiting (PW-4). */
  updateReady: boolean;
}

const SERVER: PwaState = { installEvent: null, installed: false, isIos: false, updateReady: false };
let state: PwaState = SERVER;
const listeners = new Set<() => void>();

export function setPwaState(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getPwaState() {
  return state;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, getPwaState, () => SERVER);
}

/** True when an install option should be offered at all. */
export function canOfferInstall(s: PwaState): boolean {
  return !s.installed && (s.installEvent !== null || s.isIos);
}

let registration: ServiceWorkerRegistration | null = null;
export function setRegistration(r: ServiceWorkerRegistration) {
  registration = r;
}

/** Activates the waiting worker and reloads once it takes control. */
export function applyUpdate() {
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  waiting.postMessage({ type: "SKIP_WAITING" });
}

/** Shows the Android install prompt. Returns true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const ev = state.installEvent;
  if (!ev) return false;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  setPwaState({ installEvent: null, installed: outcome === "accepted" });
  return outcome === "accepted";
}
