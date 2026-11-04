"use client";

import { useQueryParam } from "@/hooks/use-query-param";
import { SignInPanel } from "@/components/auth/sign-in-panel";

/** Reads ?next= and renders the sign-in panel. */
export function SignInWithNext() {
  const raw = useQueryParam("next") ?? "/";
  // Same-site paths only (no open redirects).
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const mode = useQueryParam("mode");
  // Remount once the query is known, so ?mode=signup opens on Create account.
  return <SignInPanel key={mode ?? ""} next={next} initialMode={mode === "signup" ? "signup" : "signin"} />;
}
