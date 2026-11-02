/**
 * Sharing (EN-3, CB-3). Pure helpers first, then thin browser wrappers.
 * Order of preference: Web Share API → WhatsApp (wa.me) → copy / download.
 */
import type { Card } from "@/lib/content/types";

// ---------- pure ----------

export function deckPath(slug: string): string {
  return `/deck/${slug}`;
}

export function cardPath(card: Pick<Card, "id" | "deck_id">): string {
  return `/deck/${card.deck_id}/card/${card.id}`;
}

/**
 * Spicy content is never rendered into an image (PRD §11, brief). A card is
 * image-shareable only if it is clean and comes from a non-spicy deck.
 */
export function canShareAsImage(card: Pick<Card, "spice_level">, deckIsSpicy: boolean): boolean {
  return !deckIsSpicy && card.spice_level === 0;
}

/** Text that goes with a shared card. Spicy card text is never included. */
export function cardShareText(card: Pick<Card, "text" | "spice_level">, deckName: string, deckIsSpicy: boolean): string {
  if (deckIsSpicy || card.spice_level > 0) return `A card from ${deckName} on Duo Deck (18+)`;
  return `“${card.text}” — from ${deckName} on Duo Deck`;
}

export function deckShareText(deckName: string): string {
  return `Let's play ${deckName} on Duo Deck — free card games for couples`;
}

export function whatsappHref(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

/** File name for a downloaded card image. */
export function imageFileName(card: Pick<Card, "id">): string {
  return `duo-deck-${card.id}.png`;
}

// ---------- browser ----------

export type ShareOutcome = "shared" | "cancelled" | "unsupported" | "failed";

export function absoluteUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

export function canWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

async function webShare(data: ShareData): Promise<ShareOutcome> {
  if (!canWebShare()) return "unsupported";
  if (navigator.canShare && !navigator.canShare(data)) return "unsupported";
  try {
    await navigator.share(data);
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    return "failed";
  }
}

export function shareLink(data: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  return webShare(data);
}

export function shareImageFile(blob: Blob, fileName: string, data: { title: string; text: string }): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: "image/png" });
  return webShare({ ...data, files: [file] });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Renders a DOM node to a 1080×1920 PNG. html-to-image is loaded only when needed. */
export async function renderNodeToPng(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, { width: 1080, height: 1920, pixelRatio: 1, cacheBust: true });
  if (!blob) throw new Error("Could not render image");
  return blob;
}
