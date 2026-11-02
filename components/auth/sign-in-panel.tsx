"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendEmailSignIn, signInWithGoogle, useAuth, verifyEmailCode } from "@/lib/supabase/auth";
import { Button, buttonVariants } from "@/components/ui/button";

type Step = "start" | "code";

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Optional sign-in (ON-2): Google, or email with a link + one-time code. */
export function SignInPanel({ next }: { next: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [step, setStep] = useState<Step>("start");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!auth.configured) {
    return (
      <p className="mt-6 rounded-panel border border-border bg-surface p-4 text-[15px] text-muted">
        Sign-in isn&apos;t set up on this server yet. Everything else works without an account.
      </p>
    );
  }

  if (auth.email) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-[17px]">
          You&apos;re signed in as <strong className="font-semibold">{auth.email}</strong>. Your favorites and history sync
          automatically.
        </p>
        <Link href={next} className={buttonVariants({ size: "lg" })}>
          Continue
        </Link>
      </div>
    );
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        !navigator.onLine
          ? "You're offline. Connect to the internet to sign in."
          : /expired|invalid/i.test(message)
            ? "That code didn't work or has expired. Check it, or send a new one."
            : /rate|too many/i.test(message)
              ? "Too many tries. Wait a minute and try again."
              : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form
        className="mt-6 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await verifyEmailCode(email.trim(), code.trim());
            router.replace(next);
          });
        }}
      >
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-[15px] text-muted">
          We sent a sign-in link and a code to <span className="text-fg">{email}</span>. Tap the link, or type the code
          here. On iPhone, typing the code works best if you&apos;ve installed the app.
        </p>
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          Code from the email
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6,10}"
            maxLength={10}
            required
            className="h-[54px] rounded-[27px] border border-border bg-surface px-5 text-center text-2xl tracking-[0.3em] text-white focus:border-pink"
          />
        </label>
        <Button size="lg" type="submit" disabled={busy || code.length < 6}>
          Sign in
        </Button>
        <Button variant="ghost" size="md" type="button" onClick={() => setStep("start")}>
          Use a different email
        </Button>
        <p role="alert" className="min-h-5 text-center text-sm text-pink-soft">
          {error}
        </p>
      </form>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <Button variant="light" size="lg" disabled={busy} onClick={() => void run(() => signInWithGoogle(next))}>
        <GoogleMark /> Continue with Google
      </Button>
      <div className="my-1 flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px grow bg-border" /> or <span className="h-px grow bg-border" />
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await sendEmailSignIn(email.trim(), next);
            setStep("code");
          });
        }}
      >
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            className="h-[54px] rounded-[27px] border border-border bg-surface px-5 text-base text-white focus:border-pink"
          />
        </label>
        <Button size="lg" type="submit" disabled={busy || !email.includes("@")}>
          Email me a sign-in link
        </Button>
      </form>
      <p role="alert" className="min-h-5 text-center text-sm text-pink-soft">
        {error}
      </p>
    </div>
  );
}
