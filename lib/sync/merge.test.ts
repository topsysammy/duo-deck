import { describe, expect, it } from "vitest";
import type { Favorite, SessionRecord } from "@/lib/db/dexie";
import {
  favoriteToRemote,
  mergeFavorites,
  mergeProfile,
  mergeSessions,
  sessionToRemote,
  type RemoteFavorite,
  type RemoteProfile,
  type SyncedSettings,
} from "./merge";

const U = "user-1";
const T = (min: number) => Date.UTC(2026, 10, 2, 12, min);
const fav = (cardId: string, p: Partial<Favorite> = {}): Favorite => ({
  cardId,
  deckId: cardId.replace(/-\d+$/, ""),
  createdAt: T(0),
  deletedAt: null,
  synced: 0,
  ...p,
});
const remoteFav = (cardId: string, p: Partial<Favorite> = {}): RemoteFavorite => favoriteToRemote(fav(cardId, p), U);

describe("mergeFavorites", () => {
  it("guest favorites go up on first sign-in, nothing lost (ON-4)", () => {
    const m = mergeFavorites([fav("deep-talk-001"), fav("first-spark-002")], [], U);
    expect(m.push.map((r) => r.card_id)).toEqual(["deep-talk-001", "first-spark-002"]);
    expect(m.putLocal.every((f) => f.synced === 1)).toBe(true);
  });

  it("account favorites come down to a new phone", () => {
    const m = mergeFavorites([fav("deep-talk-001")], [remoteFav("love-languages-003")], U);
    const ids = m.putLocal.map((f) => f.cardId).sort();
    expect(ids).toEqual(["deep-talk-001", "love-languages-003"]);
    expect(m.push.map((r) => r.card_id)).toEqual(["deep-talk-001"]);
  });

  it("a newer local un-heart wins over an older remote heart", () => {
    const m = mergeFavorites([fav("a-001", { synced: 0, deletedAt: T(10) })], [remoteFav("a-001", { createdAt: T(5) })], U);
    expect(m.push[0]?.deleted_at).not.toBeNull();
    expect(m.putLocal[0]?.deletedAt).toBe(T(10));
  });

  it("a newer remote change wins over an older unsynced local one", () => {
    const m = mergeFavorites([fav("a-001", { createdAt: T(1) })], [remoteFav("a-001", { createdAt: T(0), deletedAt: T(20) })], U);
    expect(m.push).toEqual([]);
    expect(m.putLocal[0]?.deletedAt).toBe(T(20));
  });

  it("already-synced local rows follow the account", () => {
    const m = mergeFavorites([fav("a-001", { synced: 1 })], [remoteFav("a-001", { deletedAt: T(3) })], U);
    expect(m.push).toEqual([]);
    expect(m.putLocal[0]?.deletedAt).toBe(T(3));
  });

  it("drops never-synced tombstones instead of uploading them", () => {
    const m = mergeFavorites([fav("a-001", { deletedAt: T(2) })], [], U);
    expect(m.deleteLocal).toEqual(["a-001"]);
    expect(m.push).toEqual([]);
  });

  it("keeps a note that only the account has", () => {
    const m = mergeFavorites([fav("a-001", { createdAt: T(9) })], [remoteFav("a-001", { createdAt: T(1), note: "our answer" })], U);
    expect(m.push[0]?.note).toBe("our answer");
  });
});

describe("mergeSessions", () => {
  const s = (id: string, synced: 0 | 1 = 0): SessionRecord => ({
    id,
    deckId: "deep-talk",
    mode: "deck",
    cardsSeen: ["deep-talk-001"],
    skipped: 0,
    favoritesSaved: 0,
    favoritedIds: [],
    completed: false,
    startedAt: T(0),
    endedAt: T(5),
    synced,
  });

  it("pushes local history and pulls history from other devices", () => {
    const remote = [sessionToRemote(s("r1"), U), sessionToRemote(s("both", 1), U)];
    const m = mergeSessions([s("l1"), s("both", 1)], remote, U);
    expect(m.push.map((x) => x.id)).toEqual(["l1"]);
    expect(m.pull.map((x) => x.id)).toEqual(["r1"]);
    expect(m.pull[0]?.synced).toBe(1);
  });
});

describe("mergeProfile", () => {
  const local = (p: Partial<SyncedSettings> = {}): SyncedSettings => ({
    partnerA: "",
    partnerB: "",
    stage: null,
    moods: [],
    hideSpicy: true,
    is18Confirmed: false,
    updatedAt: T(0),
    ...p,
  });
  const remote = (p: Partial<RemoteProfile> = {}): RemoteProfile => ({
    id: U,
    display_name: null,
    partner_name: null,
    relationship_stage: null,
    moods: [],
    content_filter: true,
    is_18_confirmed: false,
    updated_at: new Date(T(0)).toISOString(),
    ...p,
  });

  it("creates the profile from the guest's settings", () => {
    const m = mergeProfile(local({ partnerA: "Ada", updatedAt: T(1) }), null, 0, U);
    expect(m.push?.display_name).toBe("Ada");
  });

  it("fills empty local fields from the account without wiping filled ones", () => {
    const m = mergeProfile(
      local({ partnerA: "Ada", updatedAt: T(1) }),
      remote({ partner_name: "Chidi", relationship_stage: "married", updated_at: new Date(T(5)).toISOString() }),
      0,
      U,
    );
    expect(m.local).toMatchObject({ partnerA: "Ada", partnerB: "Chidi", stage: "married" });
    expect(m.push?.display_name).toBe("Ada");
  });

  it("newer local edits win when both sides are filled", () => {
    const m = mergeProfile(
      local({ partnerA: "Tolu", updatedAt: T(10) }),
      remote({ display_name: "Ada", updated_at: new Date(T(5)).toISOString() }),
      T(2),
      U,
    );
    expect(m.local?.partnerA).toBe("Tolu");
  });

  it("an account edit wins when this device hasn't changed since last sync", () => {
    const m = mergeProfile(
      local({ partnerA: "Tolu", updatedAt: T(1) }),
      remote({ display_name: "Ada", updated_at: new Date(T(5)).toISOString() }),
      T(1),
      U,
    );
    expect(m.local?.partnerA).toBe("Ada");
    expect(m.push).toBeNull();
  });

  it("keeps an 18+ confirmation from either side", () => {
    expect(mergeProfile(local(), remote({ is_18_confirmed: true }), 0, U).local?.is18Confirmed).toBe(true);
    expect(mergeProfile(local({ is18Confirmed: true, updatedAt: T(1) }), remote(), 0, U).push?.is_18_confirmed).toBe(true);
  });
});
