"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { ShareSheet, type ShareTarget } from "@/components/share/share-sheet";

/** Opens the share sheet for a deck link (CB-3). */
export function ShareDeckButton({ name, slug }: { name: string; slug: string }) {
  const [target, setTarget] = useState<ShareTarget | null>(null);
  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        aria-label={`Share ${name}`}
        onClick={() => setTarget({ kind: "deck", slug, name })}
      >
        <ShareIcon />
      </Button>
      <ShareSheet target={target} onClose={() => setTarget(null)} />
    </>
  );
}
