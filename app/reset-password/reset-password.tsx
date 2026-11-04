"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePassword, useAuth } from "@/lib/supabase/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_PASSWORD = 8;

export function ResetPassword() {
  const router = useRouter();
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!auth.loading && !auth.email) {
    return (
      <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-display text-[30px] leading-[1.05] font-normal">Link expired</h1>
        <p className="text-[15px] text-muted">
          This reset link didn&apos;t sign you in. Ask for a new code and type it in the app instead.
        </p>
        <Link href="/signin" className={cn(buttonVariants({ size: "lg" }), "h-[52px] rounded-xl text-base")}>
          Back to sign in
        </Link>
      </section>
    );
  }

  return (
    <form
      className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        updatePassword(password)
          .then(() => router.replace("/"))
          .catch(() => setError("Couldn't save your password. Try a longer one, or try again."))
          .finally(() => setBusy(false));
      }}
    >
      <h1 className="font-display text-[30px] leading-[1.05] font-normal">Set a new password</h1>
      <label htmlFor="new-password" className="text-sm font-medium">
        New password
      </label>
      <div className="relative -mt-2">
        <input
          id="new-password"
          type={shown ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          required
          aria-describedby="new-password-hint"
          className="h-12 w-full rounded-xl border border-border bg-bg px-4 pr-12 text-[15px] text-white focus:border-pink"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted hover:text-fg"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      <p id="new-password-hint" className="-mt-2 text-[13px] text-muted">
        At least {MIN_PASSWORD} characters.
      </p>
      <Button size="lg" type="submit" disabled={busy || password.length < MIN_PASSWORD} className="h-[52px] rounded-xl text-base">
        {busy ? "Please wait…" : "Save password"}
      </Button>
      <p role="alert" className="text-center text-sm text-pink-soft empty:hidden">
        {error}
      </p>
    </form>
  );
}
