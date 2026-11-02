"use client";

import { useEffect } from "react";
import { setPwaState, setRegistration, type BeforeInstallPromptEvent } from "@/lib/pwa/pwa-store";
import { track } from "@/lib/analytics/track";

declare global {
  interface Window {
    /** Captured by an inline script in the root layout before React hydrates. */
    __ddBip?: BeforeInstallPromptEvent;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

/** Inline script: catch the install prompt even if it fires before hydration. */
export const CAPTURE_INSTALL_PROMPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__ddBip=e;});`;

/** Registers the service worker and tracks install/update state. Renders nothing. */
export function PwaProvider() {
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    setPwaState({ installed: standalone, isIos, installEvent: window.__ddBip ?? null });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPwaState({ installEvent: e as BeforeInstallPromptEvent });
    };
    const onInstalled = () => {
      setPwaState({ installed: true, installEvent: null });
      track("pwa_installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let onVisible: (() => void) | undefined;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          setRegistration(reg);
          const hasController = () => navigator.serviceWorker.controller !== null;
          if (reg.waiting && hasController()) setPwaState({ updateReady: true });
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && hasController()) setPwaState({ updateReady: true });
            });
          });
          onVisible = () => {
            if (document.visibilityState === "visible") void reg.update().catch(() => {});
          };
          document.addEventListener("visibilitychange", onVisible);
        })
        .catch((err) => console.warn("Service worker registration failed", err));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
