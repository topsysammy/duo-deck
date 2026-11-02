"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { afterSignIn, takeReturnTo } from "@/lib/supabase/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Logo } from "@/components/brand/primitives";
import { buttonVariants } from "@/components/ui/button";

/**
 * Landing page for Google and email-link sign-in. Supabase (PKCE) swaps the
 * code in the URL for a session, then we merge guest data and go back.
 */
export function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, "&"));
    if (params.get("error_description")) {
      setError(params.get("error_description") ?? "Sign-in was cancelled.");
      return;
    }
    (async () => {
      try {
        const sb = await getSupabase();
        const { data, error: sessionError } = await sb.auth.getSession();
        if (sessionError || !data.session) throw sessionError ?? new Error("No session");
        const { returnTo, method } = takeReturnTo();
        await afterSignIn(method);
        router.replace(returnTo);
      } catch {
        setError(
          "This sign-in link didn't work here. Open it on the same phone and browser you used to ask for it, or type the code from the email instead.",
        );
      }
    })();
  }, [router]);

  return (
    <AppShell className="items-center justify-center gap-4 text-center">
      <Logo className="text-[30px]" />
      {error ? (
        <>
          <h1 className="font-display text-[30px] leading-none font-normal">Couldn&apos;t sign you in</h1>
          <p role="alert" className="text-muted">
            {error}
          </p>
          <Link href="/signin" className={buttonVariants({ size: "md" })}>
            Try again
          </Link>
        </>
      ) : (
        <>
          <h1 className="font-display text-[30px] leading-none font-normal">Signing you in…</h1>
          <p role="status" className="text-muted">
            Bringing your favorites along.
          </p>
        </>
      )}
    </AppShell>
  );
}
