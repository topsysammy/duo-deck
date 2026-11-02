import { db } from "./dexie";

/** Heart / un-heart a card (EN-1). Works offline; never throws to the UI. */
export async function setFavorite(cardId: string, deckId: string, on: boolean): Promise<void> {
  try {
    const existing = await db.favorites.get(cardId);
    if (on) {
      await db.favorites.put({
        cardId,
        deckId,
        createdAt: existing && !existing.deletedAt ? existing.createdAt : Date.now(),
        deletedAt: null,
        synced: 0,
        note: existing?.note,
      });
    } else if (existing) {
      // Never-synced favorites can simply go; synced ones keep a tombstone.
      if (existing.synced) await db.favorites.put({ ...existing, deletedAt: Date.now(), synced: 0 });
      else await db.favorites.delete(cardId);
    }
  } catch (err) {
    console.warn("Could not save favorite", err);
  }
}

export function isActiveFavorite(f: { deletedAt: number | null } | undefined): boolean {
  return Boolean(f && !f.deletedAt);
}
