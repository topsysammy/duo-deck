"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignInPanel } from "@/components/auth/sign-in-panel";

function Inner() {
  const raw = useSearchParams().get("next") ?? "/";
  // Same-site paths only (no open redirects).
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  return <SignInPanel next={next} />;
}

/** Reads ?next= and renders the sign-in panel. */
export function SignInWithNext() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
