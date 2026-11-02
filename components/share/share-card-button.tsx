"use client";

import { useState } from "react";
import type { Accent, Card } from "@/lib/content/types";
import { ShareIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { ShareSheet, type ShareTarget } from "./share-sheet";

export function ShareCardButton(props: { card: Card; deckName: string; deckIsSpicy: boolean; accent: Accent }) {
  const [target, setTarget] = useState<ShareTarget | null>(null);
  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Share this card"
        onClick={() => setTarget({ kind: "card", ...props })}
      >
        <ShareIcon />
      </Button>
      <ShareSheet target={target} onClose={() => setTarget(null)} />
    </>
  );
}
