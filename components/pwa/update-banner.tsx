"use client";

import { usePathname } from "next/navigation";
import { applyUpdate, usePwa } from "@/lib/pwa/pwa-store";
import { Button } from "@/components/ui/button";

/**
 * "New decks available — refresh" (PW-4). Never shown during a game, so
 * nothing reloads mid-card; it appears again once the player leaves Play.
 */
export function UpdateBanner() {
  const { updateReady } = usePwa();
  const pathname = usePathname();
  if (!updateReady || pathname.startsWith("/play")) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-40 mx-auto flex max-w-app items-center gap-3 px-gutter pt-[calc(10px+env(safe-area-inset-top))]"
    >
      <div className="flex w-full items-center gap-3 rounded-panel border border-border bg-surface p-2 pl-4 shadow-lg shadow-black/60">
        <p className="grow text-sm font-medium">New decks available</p>
        <Button size="sm" onClick={applyUpdate}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
