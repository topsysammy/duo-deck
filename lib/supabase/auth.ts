"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSupabase, hasSignedInFlag, isSupabaseConfigured, setSignedInFlag } from "./client";
import { syncNow } from "@/lib/sync/sync";
import { track } from "@/lib/analytics/track";
import { deleteLocalData } from "@/lib/db/settings";

/** Where to go after sign-in, and how the user signed in (for analytics). */
const RETURN_TO = "dd-signin-return";
const METHOD = "dd-signin-method";

export type SignInMethod = "google" | "email_link" | "email_code" | "password" | "signup" | "recovery";

// ---------- auth state store ----------

export interface AuthState {
  configured: boolean;
  /** True until we know whether a signed-in device still has a session. */
  loading: boolean;
  email: string | null;
}

// Server render and hydration assume the common case (signed out), so the page doesn't jump when it hydrates.
const SERVER: AuthState = { configured: isSupabaseConfigured(), loading: false, email: null };
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

// ---------- email + password ----------
// Every email Supabase sends (confirm sign-up, reset password) carries a link AND
// a 6-digit code ({{ .Token }} in the template). The code matters on iPhone: an
// installed app and Safari don't share storage, so a link opened from Mail
// can't finish inside the app, but a typed code can.

export async function signInWithPassword(email: string, password: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await afterSignIn("password");
}

/**
 * Creates an account. Returns "signed-in" when Supabase doesn't require email
 * confirmation, or "confirm" when a code/link was emailed first.
 */
export async function signUpWithPassword(name: string, email: string, password: string, returnTo: string) {
  rememberReturn(returnTo, "signup");
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl(), data: { full_name: name } },
  });
  if (error) throw error;
  // Supabase hides whether an email is taken: an existing address comes back with no identities.
  if (data.user && data.user.identities?.length === 0) throw new Error("User already registered");
  if (data.session) {
    await afterSignIn("signup");
    return "signed-in" as const;
  }
  return "confirm" as const;
}

/** Finishes sign-up with the 6-digit code from the "Confirm signup" email. */
export async function confirmSignUpCode(email: string, code: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.verifyOtp({ email, token: code, type: "signup" });
  if (error) throw error;
  await afterSignIn("signup");
}

export async function resendSignUpCode(email: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: callbackUrl() } });
  if (error) throw error;
}

/** Sends the "Reset password" email (link + 6-digit code). */
export async function sendPasswordReset(email: string) {
  rememberReturn("/reset-password", "recovery");
  const sb = await getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
  if (error) throw error;
}

/** Signs in with the reset code, then sets the new password. */
export async function resetPasswordWithCode(email: string, code: string, password: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (error) throw error;
  const { error: updateError } = await sb.auth.updateUser({ password });
  if (updateError) throw updateError;
  await afterSignIn("recovery");
}

/** Sets a new password for the signed-in user (after a reset link). */
export async function updatePassword(password: string) {
  const sb = await getSupabase();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
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
