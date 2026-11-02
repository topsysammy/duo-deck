"use client";

import { useEffect, useRef, useState } from "react";
import type { Accent, Card } from "@/lib/content/types";
import {
  absoluteUrl,
  canShareAsImage,
  canWebShare,
  cardPath,
  cardShareText,
  copyText,
  deckPath,
  deckShareText,
  downloadBlob,
  imageFileName,
  renderNodeToPng,
  shareImageFile,
  shareLink,
  whatsappHref,
} from "@/lib/share/share";
import { Button } from "@/components/ui/button";
import { ShareImage } from "./share-image";
import { track } from "@/lib/analytics/track";

export type ShareTarget =
  | { kind: "card"; card: Card; deckName: string; deckIsSpicy: boolean; accent: Accent }
  | { kind: "deck"; slug: string; name: string };

/**
 * Share sheet (EN-3, CB-3): image (non-spicy cards only), WhatsApp, native
 * share, copy link, download. Native <dialog> for focus trap + Esc.
 */
export function ShareSheet({ target, onClose }: { target: ShareTarget | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [webShare, setWebShare] = useState(false);

  useEffect(() => setWebShare(canWebShare()), []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (target && !d.open) {
      setStatus("");
      d.showModal();
    } else if (!target && d.open) d.close();
  }, [target]);

  if (!target) return <dialog ref={dialogRef} className="hidden" />;

  const isCard = target.kind === "card";
  const path = isCard ? cardPath(target.card) : deckPath(target.slug);
  const title = isCard ? target.deckName : target.name;
  const text = isCard ? cardShareText(target.card, target.deckName, target.deckIsSpicy) : deckShareText(target.name);
  const imageAllowed = isCard && canShareAsImage(target.card, target.deckIsSpicy);
  const url = typeof window === "undefined" ? path : absoluteUrl(path);
  const shared = (method: string) =>
    track("card_shared", {
      method,
      target: target.kind,
      deck_id: isCard ? target.card.deck_id : target.slug,
      card_id: isCard ? target.card.id : null,
      level: isCard ? target.card.level : null,
    });

  async function makeImage(): Promise<Blob | null> {
    if (!imageRef.current) return null;
    setBusy(true);
    setStatus("Making your image…");
    try {
      await document.fonts.ready;
      return await renderNodeToPng(imageRef.current);
    } catch (err) {
      console.warn(err);
      setStatus("Couldn't make the image. Try sharing the link instead.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onShareImage() {
    if (target?.kind !== "card") return;
    const blob = await makeImage();
    if (!blob) return;
    const outcome = await shareImageFile(blob, imageFileName(target.card), { title, text: `${text}\n${url}` });
    if (outcome === "unsupported" || outcome === "failed") {
      downloadBlob(blob, imageFileName(target.card));
      setStatus("Image saved. Post it anywhere!");
      shared("image_download");
    } else {
      setStatus(outcome === "shared" ? "Shared!" : "");
      if (outcome === "shared") shared("image");
    }
  }

  async function onDownload() {
    if (target?.kind !== "card") return;
    const blob = await makeImage();
    if (!blob) return;
    downloadBlob(blob, imageFileName(target.card));
    setStatus("Image saved.");
    shared("download");
  }

  async function onShareLink() {
    const outcome = await shareLink({ title, text, url });
    if (outcome === "shared") {
      setStatus("Shared!");
      shared("link");
    }
  }

  async function onCopy() {
    const ok = await copyText(url);
    setStatus(ok ? "Link copied." : "Couldn't copy. Long-press the link to copy it.");
    if (ok) shared("copy");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="share-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-app rounded-t-[32px] border border-b-0 border-border bg-surface p-0 text-fg backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-2.5 px-gutter pt-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <h2 id="share-title" className="font-display text-[26px] leading-none font-normal">
          {isCard ? "Share this card" : `Share ${target.name}`}
        </h2>
        <p className="mb-1.5 text-sm text-muted">
          {isCard && !imageAllowed
            ? "Spicy cards are shared as a link only. Whoever opens it confirms they're 18+."
            : "Opens straight into the game. No download needed."}
        </p>

        {imageAllowed && (
          <Button size="lg" onClick={onShareImage} disabled={busy}>
            Share as image
          </Button>
        )}
        <Button asChild variant={imageAllowed ? "light" : "primary"} size="lg">
          <a href={whatsappHref(text, url)} target="_blank" rel="noopener noreferrer" onClick={() => shared("whatsapp")}>
            Send on WhatsApp
          </a>
        </Button>
        <div className="grid grid-cols-2 gap-2.5">
          {webShare ? (
            <Button variant="secondary" size="md" onClick={onShareLink}>
              More apps
            </Button>
          ) : null}
          <Button variant="secondary" size="md" onClick={onCopy} className={webShare ? "" : "col-span-2"}>
            Copy link
          </Button>
          {imageAllowed && (
            <Button variant="secondary" size="md" onClick={onDownload} disabled={busy} className="col-span-2">
              Download image
            </Button>
          )}
        </div>
        <Button variant="ghost" size="md" onClick={() => dialogRef.current?.close()}>
          Close
        </Button>
        <p role="status" aria-live="polite" className="min-h-5 text-center text-sm text-pink-soft">
          {status}
        </p>
      </div>

      {imageAllowed && (
        <div aria-hidden="true" className="pointer-events-none fixed top-0 -left-[20000px]">
          <ShareImage
            ref={imageRef}
            card={target.card}
            deckName={target.deckName}
            accent={target.accent}
            host={typeof window === "undefined" ? "" : window.location.host}
          />
        </div>
      )}
    </dialog>
  );
}
