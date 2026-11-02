"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSettings } from "@/hooks/use-settings";
import { confirmAdult, deleteLocalData, updateSettings } from "@/lib/db/settings";
import { downloadAllDecks, offlineDeckCount } from "@/lib/pwa/offline";
import { IosInstallSheet, useInstall } from "@/components/pwa/install";
import { deleteAccount, signOut, useAuth } from "@/lib/supabase/auth";
import { lastSyncedAt, syncNow } from "@/lib/sync/sync";
import { analyticsAllowed, setAnalyticsEnabled } from "@/lib/analytics/track";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOTAL_DECKS = 10;

/** Settings (brief: partner names, content filter, offline, install, delete data, about). */
export function SettingsView() {
  const { settings, loaded } = useSettings();

  return (
    <div className="mt-6 flex flex-col gap-7">
      <Section title="You two" id="names">
        {loaded ? <Names initialA={settings.partnerA} initialB={settings.partnerB} /> : <div className="h-[76px]" />}
        <Link href="/welcome?step=quiz" className="mt-3 inline-flex min-h-11 items-center text-[15px]">
          Redo the quiz
        </Link>
      </Section>

      <Section title="Content" id="content">
        <ContentFilter hideSpicy={settings.hideSpicy} is18Confirmed={settings.is18Confirmed} />
      </Section>

      <AccountSection />

      <Section title="Offline" id="offline">
        <OfflineDownload />
      </Section>

      <InstallRow />

      <Section title="Your data" id="data">
        <DeleteData />
      </Section>

      <Section title="About" id="about">
        <p className="text-[15px] leading-relaxed text-muted">
          Duo Deck is free: every deck, no ads, no payments. Your cards, favorites and settings stay on this phone
          unless you sign in to sync.
        </p>
        <UsageStats />
        <Link href="/privacy" className="mt-2 inline-flex min-h-11 items-center text-[15px]">
          Privacy policy
        </Link>
      </Section>
    </div>
  );
}

function Section({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`settings-${id}`}>
      <h2 id={`settings-${id}`} className="mb-3 text-[19px] font-semibold">
        {title}
      </h2>
      <div className="rounded-panel border border-border bg-surface p-4">{children}</div>
    </section>
  );
}

function Names({ initialA, initialB }: { initialA: string; initialB: string }) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [status, setStatus] = useState("");

  async function save() {
    if (a.trim() === initialA && b.trim() === initialB) return;
    await updateSettings({ partnerA: a.trim(), partnerB: b.trim() });
    setStatus("Saved");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid grid-cols-2 gap-2.5"
    >
      {[
        { label: "You", value: a, set: setA },
        { label: "Your partner", value: b, set: setB },
      ].map((f) => (
        <label key={f.label} className="flex flex-col gap-1.5 text-[13px] text-muted">
          {f.label}
          <input
            value={f.value}
            onChange={(e) => {
              f.set(e.target.value);
              setStatus("");
            }}
            onBlur={() => void save()}
            maxLength={24}
            autoComplete="off"
            autoCapitalize="words"
            className="h-[50px] rounded-[25px] border border-border bg-surface-2 px-[18px] text-base text-white focus:border-pink"
          />
        </label>
      ))}
      <p role="status" className="col-span-2 min-h-5 text-sm text-pink-soft">
        {status}
      </p>
    </form>
  );
}

function Switch({
  checked,
  onToggle,
  labelId,
  descId,
}: {
  checked: boolean;
  onToggle: () => void;
  labelId: string;
  descId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={descId}
      onClick={onToggle}
      className={cn("relative h-8 w-[52px] shrink-0 cursor-pointer rounded-full transition-colors", checked ? "bg-pink" : "bg-dot")}
    >
      <span
        aria-hidden="true"
        className={cn("absolute top-1 left-1 size-6 rounded-full bg-white transition-transform", checked && "translate-x-5")}
      />
    </button>
  );
}

function UsageStats() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(analyticsAllowed()), []);
  return (
    <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
      <div className="grow">
        <p id="stats-label" className="text-base font-semibold">
          Share anonymous usage stats
        </p>
        <p id="stats-desc" className="text-[13px] text-muted">
          Which cards get skipped or saved, so we can write better ones. No cookies, no ads.
        </p>
      </div>
      <Switch
        checked={on}
        labelId="stats-label"
        descId="stats-desc"
        onToggle={() => {
          setAnalyticsEnabled(!on);
          setOn(!on);
        }}
      />
    </div>
  );
}

function AccountSection() {
  const auth = useAuth();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [synced, setSynced] = useState(0);
  const deleteRef = useRef<HTMLDialogElement>(null);

  useEffect(() => setSynced(lastSyncedAt()), [auth.email]);
  if (!auth.configured) {
    return (
      <Section title="Account" id="account">
        <p className="text-[15px] text-muted">
          Sign-in isn&apos;t switched on yet. Once it is, you can sign in here to keep your favorites, history and
          settings on any phone, and sign out or delete your account. Until then, everything is saved on this phone.
        </p>
      </Section>
    );
  }

  async function sync() {
    setBusy(true);
    const r = await syncNow();
    setSynced(lastSyncedAt());
    setStatus(r === "synced" ? "All synced." : r === "offline" ? "You're offline. We'll sync when you're back." : "Couldn't sync. Try again.");
    setBusy(false);
  }

  return (
    <Section title="Account" id="account">
      {auth.loading ? (
        <div className="h-[76px]" aria-busy="true" />
      ) : auth.email ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px]">
            Signed in as <span className="font-semibold break-all">{auth.email}</span>
          </p>
          <p className="text-[13px] text-muted">
            {synced ? `Last synced ${new Date(synced).toLocaleString()}` : "Not synced yet"}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="md" onClick={() => void sync()} disabled={busy}>
              Sync now
            </Button>
            <Button variant="secondary" size="md" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
          <Button variant="outline" size="md" className="border-pink-strong" onClick={() => deleteRef.current?.showModal()}>
            Delete account
          </Button>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-pink-soft">
            {status}
          </p>
          <ConfirmDialog
            ref={deleteRef}
            title="Delete your account?"
            body="Your account and everything synced to it are deleted for good, and this phone is cleared too. This can't be undone."
            confirmLabel="Delete account"
            onConfirm={async () => {
              try {
                await deleteAccount();
                window.location.assign("/welcome");
              } catch {
                setStatus("Couldn't delete your account. Check your connection and try again.");
              }
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-muted">
            Optional. Sign in to keep your favorites, history and settings on any phone.
          </p>
          <Link href="/signin?next=/us" className={buttonVariants({ variant: "light", size: "md" })}>
            Sign in to sync
          </Link>
        </div>
      )}
    </Section>
  );
}

function ContentFilter({ hideSpicy, is18Confirmed }: { hideSpicy: boolean; is18Confirmed: boolean }) {
  const confirmRef = useRef<HTMLDialogElement>(null);

  function toggle() {
    if (!hideSpicy) void updateSettings({ hideSpicy: true });
    else if (is18Confirmed) void updateSettings({ hideSpicy: false });
    else confirmRef.current?.showModal(); // ON-6: confirm 18+ before showing spicy decks
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="grow">
          <p id="filter-label" className="text-base font-semibold">
            Hide spicy decks
          </p>
          <p id="filter-desc" className="text-[13px] text-muted">
            Faith-friendly mode. Spicy decks are 18+ and never shown in previews.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hideSpicy}
          aria-labelledby="filter-label"
          aria-describedby="filter-desc"
          onClick={toggle}
          className={cn(
            "relative h-8 w-[52px] shrink-0 cursor-pointer rounded-full transition-colors",
            hideSpicy ? "bg-pink" : "bg-dot",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1 left-1 size-6 rounded-full bg-white transition-transform",
              hideSpicy && "translate-x-5",
            )}
          />
        </button>
      </div>

      <ConfirmDialog
        ref={confirmRef}
        title="Are you both 18 or older?"
        body="Spicy decks are flirty and suggestive, never explicit. They're only for adults."
        confirmLabel="Yes, show spicy decks"
        onConfirm={() => void confirmAdult()}
      />
    </>
  );
}

function OfflineDownload() {
  const [count, setCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && navigator.serviceWorker.controller !== null);
    void offlineDeckCount().then(setCount);
  }, []);

  async function download() {
    setBusy(true);
    try {
      const ok = await downloadAllDecks((done, total) => setProgress(`Saving ${done} of ${total} decks…`));
      setProgress(ok ? "All decks saved. You can play anywhere, even with no data." : "");
      setCount(await offlineDeckCount());
    } catch {
      setProgress("Download stopped. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] text-muted">
        Decks you open are saved automatically. Downloading the rest uses well under 1 MB.{" "}
        {count !== null && (
          <>
            {count} of {TOTAL_DECKS} decks are on this phone.
          </>
        )}
      </p>
      <Button
        variant="outline"
        size="md"
        onClick={download}
        disabled={busy || !supported || count === TOTAL_DECKS}
      >
        {count === TOTAL_DECKS ? "All decks downloaded" : "Download all decks"}
      </Button>
      {!supported && (
        <p className="text-[13px] text-muted">Available once the app has finished setting up. Reload and try again.</p>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-pink-soft">
        {progress}
      </p>
    </div>
  );
}

function InstallRow() {
  const { available, install, iosOpen, closeIos } = useInstall();
  if (!available) return <IosInstallSheet open={iosOpen} onClose={closeIos} />;
  return (
    <Section title="App" id="app">
      <div className="flex items-center gap-3">
        <p className="grow text-[15px] text-muted">Add Duo Deck to your home screen. It opens full-screen and works offline.</p>
        <Button variant="light" size="sm" className="h-11" onClick={() => void install()}>
          Install
        </Button>
      </div>
      <IosInstallSheet open={iosOpen} onClose={closeIos} />
    </Section>
  );
}

function DeleteData() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <p className="text-[15px] text-muted">
        Removes your favorites, history, names and settings from this phone straight away.
      </p>
      <Button
        variant="outline"
        size="md"
        className="mt-3 w-full border-pink-strong"
        onClick={() => ref.current?.showModal()}
      >
        Delete my data
      </Button>
      <ConfirmDialog
        ref={ref}
        title="Delete everything on this phone?"
        body="Your favorites, play history, names and settings will be removed. This can't be undone."
        confirmLabel="Delete my data"
        onConfirm={async () => {
          await deleteLocalData();
          window.location.assign("/welcome");
        }}
      />
    </>
  );
}

const ConfirmDialog = ({
  ref,
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  ref: React.Ref<HTMLDialogElement>;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}) => (
  <dialog
    ref={ref}
    aria-labelledby={`${confirmLabel}-title`}
    onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    className="m-auto w-[calc(100%-48px)] max-w-[360px] rounded-[28px] border border-border bg-surface p-0 text-fg backdrop:bg-black/70"
  >
    <form method="dialog" className="flex flex-col gap-3 p-6">
      <h2 id={`${confirmLabel}-title`} className="font-display text-2xl leading-tight font-normal">
        {title}
      </h2>
      <p className="text-[15px] text-muted">{body}</p>
      <Button size="md" value="confirm" onClick={() => void onConfirm()}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="md" value="cancel">
        Cancel
      </Button>
    </form>
  </dialog>
);
