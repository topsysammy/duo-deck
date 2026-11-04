"use client";

import { useEffect, useRef } from "react";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { ChevronLeft } from "@/components/brand/icons";
import { Logo, Pill } from "@/components/brand/primitives";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/db/dexie";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

/** Where Google and email-link sign-ins return to during onboarding. */
export const ONBOARDING_SIGNED_IN = "/welcome?step=signed-in";

/**
 * Login screen after the intro slides: sign in (Google when enabled, or email
 * with a link + code), or continue as a guest.
 */
export function LoginStep({ onBack, onGuest, onSignedIn }: { onBack: () => void; onGuest: () => void; onSignedIn: () => void }) {
  const configured = isSupabaseConfigured();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-gutter pt-7 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="icon" aria-label="Back" className="size-11" onClick={onBack}>
          <ChevronLeft />
        </Button>
        <Logo className="text-[26px]" />
        <span className="size-11" aria-hidden="true" />
      </div>

      {configured ? (
        <SignInPanel next={ONBOARDING_SIGNED_IN} onSignedIn={onSignedIn} initialMode="signup" />
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          <Pill tone="orange" rotate={-5} className="self-start">
            Welcome
          </Pill>
          <h1 className="font-display text-[38px] leading-[1.04] font-normal tracking-[-0.5px]">Ready to play?</h1>
          <p className="text-base leading-[1.4] text-muted">Everything is saved on this phone. No account needed.</p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-6">
        {configured && (
          <div className="mb-1 flex items-center gap-3 text-sm text-muted" aria-hidden="true">
            <span className="h-px grow bg-border" /> or <span className="h-px grow bg-border" />
          </div>
        )}
        <Button variant={configured ? "secondary" : "primary"} size="lg" onClick={onGuest}>
          Continue as guest
        </Button>
        <p className="text-center text-[13px] leading-snug text-muted">
          Your cards and favorites stay on this phone. You can sign in any time from Us.
        </p>
      </div>
    </div>
  );
}

/** True when the synced account already answered the quiz (stage or mood), so it can be skipped. */
// Names alone don't count: a brand-new account has the name typed at sign-up.
async function accountHasAnswers(): Promise<boolean> {
  const s = await getSettings();
  return Boolean(s.stage || s.moods.length);
}

/**
 * Shown right after sign-in while we check the account: an existing account
 * with saved answers goes straight to Home; a new one continues to the quiz.
 * (Sign-in has already merged the account's profile into this phone.)
 */
export function SignedInStep({ onExisting, onNew, onNotSignedIn }: { onExisting: () => void; onNew: () => void; onNotSignedIn: () => void }) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        const { data } = await (await getSupabase()).auth.getSession();
        if (!data.session) return onNotSignedIn();
        if (await accountHasAnswers()) onExisting();
        else onNew();
      } catch {
        onNotSignedIn();
      }
    })();
  }, [onExisting, onNew, onNotSignedIn]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center gap-4 px-gutter text-center">
      <Logo className="text-[30px]" />
      <p role="status" className="text-muted">
        Getting your account ready…
      </p>
    </div>
  );
}
