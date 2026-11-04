"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  confirmSignUpCode,
  resendSignUpCode,
  resetPasswordWithCode,
  sendPasswordReset,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  useAuth,
} from "@/lib/supabase/auth";
import { getAuthProviders } from "@/lib/supabase/client";
import { getSettings } from "@/lib/db/dexie";
import { updateSettings } from "@/lib/db/settings";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AuthMode = "signin" | "signup" | "forgot" | "confirm" | "reset";

const MIN_PASSWORD = 8;

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-border bg-bg px-4 text-[15px] text-white placeholder:text-dot focus:border-pink";

function Field({
  label,
  hint,
  aside,
  children,
}: {
  label: string;
  hint?: string;
  aside?: React.ReactNode;
  children: (id: string, hintId?: string) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {aside}
      </div>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  describedBy?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={autoComplete === "new-password" ? MIN_PASSWORD : undefined}
        required
        aria-describedby={describedBy}
        className={cn(inputClass, "pr-12")}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted hover:text-fg"
      >
        <EyeIcon off={shown} />
      </button>
    </div>
  );
}

function TextLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-6 cursor-pointer items-center font-medium text-fg underline underline-offset-4 hover:text-pink-soft"
    >
      {children}
    </button>
  );
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Connect to the internet and try again.";
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  if (/already registered|already exists/i.test(message)) return "There's already an account with this email. Sign in instead.";
  if (/expired|invalid|otp/i.test(message)) return "That code didn't work or has expired. Check it, or send a new one.";
  if (/password.*(at least|should|weak|short)/i.test(message)) return `Use a stronger password: at least ${MIN_PASSWORD} characters.`;
  if (/rate|too many|security purposes/i.test(message)) return "Too many tries. Wait a minute and try again.";
  return "Something went wrong. Please try again.";
}

const TITLES: Record<AuthMode, [string, string]> = {
  signin: ["Sign in", "Welcome back. Sign in to get your favorites and history on this phone."],
  signup: ["Create account", "Keep your favorites, history and settings safe on any phone."],
  forgot: ["Reset password", "Enter your email and we'll send you a code to set a new password."],
  confirm: ["Check your email", ""],
  reset: ["Set a new password", ""],
};

/**
 * Sign in / create account (ON-2), laid out as a card: Google (when it's
 * switched on in Supabase), then email + password. Sign-up confirmation and
 * password resets use the 6-digit code from the email (or its link).
 * `onSignedIn` replaces the default "go to `next`" after an in-page sign-in;
 * link and Google sign-ins come back through /auth/callback to `next`.
 */
export function SignInPanel({
  next,
  onSignedIn,
  initialMode = "signin",
}: {
  next: string;
  onSignedIn?: () => void;
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const auth = useAuth();
  const [google, setGoogle] = useState(false);
  const [mode, setModeState] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void getAuthProviders().then((p) => setGoogle(p.google));
  }, []);

  const setMode = (m: AuthMode) => {
    setModeState(m);
    setError("");
    setNotice("");
    setCode("");
    if (m !== "confirm") setPassword("");
  };

  const done = () => (onSignedIn ? onSignedIn() : router.replace(next));

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/email not confirmed/i.test(message)) {
        // Signed up earlier but never confirmed: send a fresh code and ask for it.
        await resendSignUpCode(email.trim()).catch(() => {});
        setModeState("confirm");
        setCode("");
        setNotice("Your email isn't confirmed yet. We've sent you a new code.");
      } else setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  /** The name typed at sign-up becomes the "You" name, unless one is already set. */
  async function keepName() {
    const n = name.trim();
    if (n && !(await getSettings()).partnerA) await updateSettings({ partnerA: n.slice(0, 24) });
  }

  if (!auth.configured) {
    return (
      <p className="mt-6 rounded-2xl border border-border bg-surface p-5 text-[15px] text-muted">
        Sign-in isn&apos;t set up on this server yet. Everything else works without an account.
      </p>
    );
  }

  if (auth.email) {
    return (
      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <p className="text-[17px]">
          You&apos;re signed in as <strong className="font-semibold break-all">{auth.email}</strong>. Your favorites and
          history sync automatically.
        </p>
        {onSignedIn ? (
          <Button size="lg" className="rounded-xl" onClick={onSignedIn}>
            Continue
          </Button>
        ) : (
          <Link href={next} className={cn(buttonVariants({ size: "lg" }), "rounded-xl")}>
            Continue
          </Link>
        )}
      </div>
    );
  }

  const [title, sub] = TITLES[mode];
  const subtitle =
    mode === "confirm"
      ? `We sent a 6-digit code to ${email.trim()}. Type it here, or tap the link in the email.`
      : mode === "reset"
        ? `We sent a 6-digit code to ${email.trim()}. Type it here with your new password.`
        : sub;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    void run(async () => {
      if (mode === "signin") {
        await signInWithPassword(em, password);
        done();
      } else if (mode === "signup") {
        const result = await signUpWithPassword(name.trim(), em, password, next);
        await keepName();
        if (result === "signed-in") done();
        else setMode("confirm");
      } else if (mode === "confirm") {
        await confirmSignUpCode(em, code.trim());
        await keepName();
        done();
      } else if (mode === "forgot") {
        await sendPasswordReset(em);
        setMode("reset");
      } else {
        await resetPasswordWithCode(em, code.trim(), password);
        done();
      }
    });
  };

  const codeField = (
    <Field label="Code from the email">
      {(id) => (
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6,10}"
          maxLength={10}
          required
          className={cn(inputClass, "text-center text-2xl tracking-[0.3em]")}
        />
      )}
    </Field>
  );

  const submitLabel = { signin: "Sign in", signup: "Create account", forgot: "Send code", confirm: "Confirm", reset: "Save password" }[mode];
  const canSubmit =
    !busy &&
    (mode === "confirm"
      ? code.length >= 6
      : mode === "reset"
        ? code.length >= 6 && password.length >= MIN_PASSWORD
        : email.includes("@") && (mode === "forgot" || password.length >= (mode === "signup" ? MIN_PASSWORD : 1)));

  return (
    <section aria-labelledby="auth-title" className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <h1 id="auth-title" className="font-display text-[30px] leading-[1.05] font-normal">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-[15px] leading-[1.45] text-muted">{subtitle}</p>}

      {google && (mode === "signin" || mode === "signup") && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => signInWithGoogle(next))}
            className="mt-5 flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-surface-2 text-base font-medium text-fg hover:border-muted disabled:opacity-50"
          >
            <GoogleMark /> Continue with Google
          </button>
          <div className="mt-5 flex items-center gap-3 text-sm text-muted" aria-hidden="true">
            <span className="h-px grow bg-border" /> or with email <span className="h-px grow bg-border" />
          </div>
        </>
      )}

      <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate={false}>
        {mode === "signup" && (
          <Field label="Your name">
            {(id) => (
              <input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                autoCapitalize="words"
                maxLength={24}
                className={inputClass}
              />
            )}
          </Field>
        )}

        {(mode === "signin" || mode === "signup" || mode === "forgot") && (
          <Field label="Email">
            {(id) => (
              <input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                required
                className={inputClass}
              />
            )}
          </Field>
        )}

        {(mode === "confirm" || mode === "reset") && codeField}

        {(mode === "signin" || mode === "signup" || mode === "reset") && (
          <Field
            label={mode === "reset" ? "New password" : "Password"}
            hint={mode === "signin" ? undefined : `At least ${MIN_PASSWORD} characters.`}
          >
            {(id, hintId) => (
              <PasswordInput
                id={id}
                value={password}
                onChange={setPassword}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                describedBy={hintId}
              />
            )}
          </Field>
        )}

        {mode === "signin" && (
          <div className="-mt-1 flex justify-end text-sm">
            <TextLink onClick={() => setMode("forgot")}>Forgot password?</TextLink>
          </div>
        )}

        <Button size="lg" type="submit" disabled={!canSubmit} className="mt-1 h-[52px] rounded-xl text-base">
          {busy ? "Please wait…" : submitLabel}
        </Button>

        <p role="alert" className="min-h-5 text-center text-sm text-pink-soft empty:min-h-0">
          {error}
        </p>
        {notice && (
          <p role="status" className="-mt-2 text-center text-sm text-muted">
            {notice}
          </p>
        )}
      </form>

      <p className="mt-1 text-center text-sm text-muted">
        {mode === "signin" && (
          <>
            New here? <TextLink onClick={() => setMode("signup")}>Create an account</TextLink>
          </>
        )}
        {mode === "signup" && (
          <>
            Already have an account? <TextLink onClick={() => setMode("signin")}>Sign in</TextLink>
          </>
        )}
        {mode === "forgot" && <TextLink onClick={() => setMode("signin")}>Back to sign in</TextLink>}
        {mode === "confirm" && (
          <>
            No email?{" "}
            <TextLink
              onClick={() =>
                void run(async () => {
                  await resendSignUpCode(email.trim());
                  setNotice("New code sent.");
                })
              }
            >
              Send a new code
            </TextLink>
          </>
        )}
        {mode === "reset" && (
          <>
            No email? <TextLink onClick={() => setMode("forgot")}>Send a new code</TextLink>
          </>
        )}
      </p>
    </section>
  );
}
