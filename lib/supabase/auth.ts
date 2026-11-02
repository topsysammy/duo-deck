"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSupabase, hasSignedInFlag, isSupabaseConfigured, setSignedInFlag } from "./client";
import { syncNow } from "@/lib/sync/sync";
import { track } from "@/lib/analytics/track";
import { deleteLocalData } from "@/lib/db/settings";

/** Where to go after sign-in, and how the user signed in (for analytics). */
const RETURN_TO = "dd-signin-return";
const METHOD = "dd-signin-method";

export type SignInMethod = "google" | "email_link" | "email_code";

// ---------- auth state store ----------

export interface AuthState {
  configured: boolean;
  /** True until we know whether a signed-in device still has a session. */
  loading: boolean;
  email: string | null;
}

const SERVER: AuthState = { configured: false, loading: false, email: null };
let state: AuthState = SERVER;
const listeners = new Set<() => void>();
let started = false;
let subscribed = false;

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Starts listening to Supabase auth, loading the client only for devices that signed in before. */
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const configured = isSupabaseConfigured();
  if (!configured || !hasSignedInFlag()) {
    set({ configured, loading: false, email: null });
    return;
  }
  set({ configured, loading: true });
  void watch();
}

async function watch() {
  try {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    set({ loading: false, email: data.session?.user.email ?? null });
    if (!data.session) setSignedInFlag(false);
    if (subscribed) return;
    subscribed = true;
    sb.auth.onAuthStateChange((_event, session) => {
      set({ email: session?.user.email ?? null });
      setSignedInFlag(Boolean(session));
    });
  } catch {
    set({ loading: false });
  }
}

export function useAuth(): AuthState {
  useEffect(start, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER,
  );
}

// ---------- actions ----------

function rememberReturn(returnTo: string, method: SignInMethod) {
  try {
    sessionStorage.setItem(RETURN_TO, returnTo);
    sessionStorage.setItem(METHOD, method);
  } catch {
    /* ignore */
  }
}

export function takeReturnTo(): { returnTo: string; method: SignInMethod } {
  try {
    const returnTo = sessionStorage.getItem(RETURN_TO) || "/";
    const method = (sessionStorage.getItem(METHOD) as SignInMethod | null) ?? "email_link";
    sessionStorage.removeItem(RETURN_TO);
    sessionStorage.removeItem(METHOD);
    // Only same-site paths.
    return { returnTo: returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/", method };
  } catch {
    return { returnTo: "/", method: "email_link" };
  }
}

const callbackUrl = () => `${window.location.origin}/auth/callback`;

export async function signInWithGoogle(returnTo: string) {
  rememberReturn(returnTo, "google");
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
  if (error) throw error;
}

/**
 * Sends a sign-in email with both a link and a one-time code. The code matters
 * on iPhone: an installed app and Safari don't share storage, so a link opened
 * from Mail can't finish sign-in inside the app, but a typed code can.
 */
export async function sendEmailSignIn(email: string, returnTo: string) {
  rememberReturn(returnTo, "email_link");
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw error;
  await afterSignIn("email_code");
}

/** Common tail of every sign-in: remember the device, merge guest data (ON-4), record the event. */
export async function afterSignIn(method: SignInMethod) {
  setSignedInFlag(true);
  started = false;
  start();
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  set({ configured: true, loading: false, email: data.session?.user.email ?? null });
  await syncNow();
  void import("@/lib/sync/watch").then((m) => m.startSyncWatcher());
  track("signin_completed", { method });
}

/** Sign out. Guest data stays on this phone so play continues. */
export async function signOut() {
  const sb = await getSupabase();
  await sb.auth.signOut();
  setSignedInFlag(false);
  set({ email: null });
}

/** ON-5: delete the account and everything in it, then wipe this phone. */
export async function deleteAccount(): Promise<void> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch("/api/account/delete", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
  await sb.auth.signOut({ scope: "local" }).catch(() => {});
  setSignedInFlag(false);
  set({ email: null });
  await deleteLocalData();
}
