/**
 * Runs supabase/migrations in real Postgres (PGlite, WASM) with a minimal stub of
 * Supabase's auth schema and roles, and checks Row Level Security end to end.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

let db: PGlite;

/** Run SQL as a Supabase role, with auth.uid() = sub. */
async function as<T>(role: "authenticated" | "anon", sub: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false); set role ${role};`);
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Minimal stand-in for what Supabase provides.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  const dir = join(process.cwd(), "supabase/migrations");
  for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(join(dir, file), "utf8"));
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}');`);
}, 30_000);

describe("RLS: favorites", () => {
  it("lets a user write and read their own rows", async () => {
    await as("authenticated", A, "insert into favorites (user_id, card_id, deck_id) values ($1, 'deep-talk-001', 'deep-talk')", [A]);
    const { rows } = await as<{ card_id: string }>("authenticated", A, "select card_id from favorites");
    expect(rows.map((r) => r.card_id)).toEqual(["deep-talk-001"]);
  });

  it("refuses writing rows for someone else", async () => {
    await expect(
      as("authenticated", A, "insert into favorites (user_id, card_id, deck_id) values ($1, 'x-001', 'x')", [B]),
    ).rejects.toThrow(/row-level security/);
  });

  it("hides other users' rows and blocks changing them", async () => {
    await as("authenticated", B, "insert into favorites (user_id, card_id, deck_id) values ($1, 'first-spark-001', 'first-spark')", [B]);
    const seen = await as<{ user_id: string }>("authenticated", A, "select user_id from favorites");
    expect(seen.rows.every((r) => r.user_id === A)).toBe(true);
    const upd = await as("authenticated", A, "update favorites set note = 'hacked' where user_id = $1", [B]);
    expect(upd.affectedRows).toBe(0);
    const del = await as("authenticated", A, "delete from favorites where user_id = $1", [B]);
    expect(del.affectedRows).toBe(0);
  });

  it("gives anonymous visitors no access at all", async () => {
    await expect(as("anon", null, "select * from favorites")).rejects.toThrow(/permission denied/);
  });
});

describe("RLS: profiles and sessions", () => {
  it("scopes profiles to their owner", async () => {
    await as("authenticated", A, "insert into profiles (id, display_name) values ($1, 'Ada')", [A]);
    await expect(as("authenticated", A, "insert into profiles (id) values ($1)", [B])).rejects.toThrow(/row-level security/);
    const { rows } = await as("authenticated", B, "select * from profiles");
    expect(rows).toHaveLength(0);
  });

  it("scopes sessions to their owner", async () => {
    await as(
      "authenticated",
      A,
      "insert into sessions (id, user_id, deck_id, started_at, ended_at) values (gen_random_uuid(), $1, 'deep-talk', now(), now())",
      [A],
    );
    expect((await as("authenticated", B, "select * from sessions")).rows).toHaveLength(0);
    expect((await as("authenticated", A, "select * from sessions")).rows).toHaveLength(1);
  });

  it("rejects bad values", async () => {
    await expect(
      as("authenticated", A, "update profiles set relationship_stage = 'situationship' where id = $1", [A]),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("account deletion (ON-5)", () => {
  it("removes every row of the user when the auth user is deleted", async () => {
    await db.exec(`delete from auth.users where id = '${A}'`);
    for (const t of ["favorites", "sessions"]) {
      const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from ${t} where user_id = $1`, [A]);
      expect(rows[0]?.n, t).toBe(0);
    }
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from profiles where id = $1", [A]);
    expect(rows[0]?.n).toBe(0);
    // B is untouched
    const b = await db.query<{ n: number }>("select count(*)::int as n from favorites where user_id = $1", [B]);
    expect(b.rows[0]?.n).toBe(1);
  });
});
