"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Tolerate a pasted API endpoint ("…/rest/v1/") or trailing slash.
const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/(rest|auth)\/v1\/?$/, "").replace(/\/+$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** localStorage flag: this device has signed in, so load Supabase at start-up to sync. */
export const SIGNED_IN_FLAG = "dd-signed-in";

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON_KEY);
}

export function hasSignedInFlag(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_FLAG) === "1";
  } catch {
    return false;
  }
}

export function setSignedInFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(SIGNED_IN_FLAG, "1");
    else localStorage.removeItem(SIGNED_IN_FLAG);
  } catch {
    /* storage blocked */
  }
}

let client: Promise<SupabaseClient> | null = null;

/**
 * Supabase is optional (guests never need it), so the ~45 KB client is only
 * downloaded when someone signs in or a signed-in device starts up.
 * The anon key is public by design; Row Level Security protects the data.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured()) return Promise.reject(new Error("Supabase is not configured"));
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL, ANON_KEY, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return client;
}
