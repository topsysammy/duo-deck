"use client";

import { useEffect, useRef, useState } from "react";
import { canOfferInstall, promptInstall, usePwa } from "@/lib/pwa/pwa-store";
import { updateSettings } from "@/lib/db/settings";
import { useSettings } from "@/hooks/use-settings";
import { track } from "@/lib/analytics/track";
import { CloseIcon, ShareIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";

/** Hook: one function that installs on Android or opens iOS instructions. */
export function useInstall() {
  const pwa = usePwa();
  const [iosOpen, setIosOpen] = useState(false);
  async function install() {
    if (pwa.installEvent) {
      track("pwa_install_prompted", { platform: "android" });
      await promptInstall();
    } else if (pwa.isIos) {
      track("pwa_install_prompted", { platform: "ios" });
      setIosOpen(true);
    }
  }
  return { available: canOfferInstall(pwa), install, iosOpen, closeIos: () => setIosOpen(false) };
}

/** iOS has no install prompt: Share → Add to Home Screen (PW-5). */
export function IosInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="ios-install-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="mx-auto mt-auto mb-0 w-full max-w-app rounded-t-[32px] border border-b-0 border-border bg-surface p-0 text-fg backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-4 px-gutter pt-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <h2 id="ios-install-title" className="font-display text-[26px] leading-none font-normal">
          Add Duo Deck to your Home Screen
        </h2>
        <ol className="flex flex-col gap-3 text-base">
          <li className="flex items-center gap-3">
            <Badge n={1} />
            <span>
              Tap the Share button <ShareIcon size={18} className="inline align-[-3px]" /> in Safari&apos;s toolbar.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Badge n={2} />
            <span>
              Scroll and choose <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Badge n={3} />
            <span>
              Tap <strong>Add</strong>. Duo Deck opens full-screen and works offline.
            </span>
          </li>
        </ol>
        <Button size="md" onClick={() => ref.current?.close()}>
          Got it
        </Button>
      </div>
    </dialog>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange font-bold text-ink">
      {n}
    </span>
  );
}

/**
 * "Add to home screen" card on the session end screen, offered after the first
 * completed session and until dismissed or installed (PW-5).
 */
export function InstallCard() {
  const { settings, loaded } = useSettings();
  const { available, install, iosOpen, closeIos } = useInstall();
  const [hidden, setHidden] = useState(false);

  if (!loaded || hidden || !available || settings.installPromptSeen) {
    return <IosInstallSheet open={iosOpen} onClose={closeIos} />;
  }

  const seen = () => void updateSettings({ installPromptSeen: true });

  return (
    <>
      <div className="mt-4 flex items-center gap-3 rounded-panel border border-border bg-surface p-4">
        <div
          aria-hidden="true"
          className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-pink font-display text-lg text-ink-strong"
        >
          dd
        </div>
        <div className="grow">
          <p className="text-[15px] font-semibold">Add to home screen</p>
          <p className="text-[13px] text-muted">Play offline, anytime.</p>
        </div>
        <Button
          variant="light"
          size="sm"
          className="h-11"
          onClick={async () => {
            await install();
            seen();
          }}
        >
          Add
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Not now"
          className="-mr-2 size-11 px-0"
          onClick={() => {
            setHidden(true);
            seen();
          }}
        >
          <CloseIcon size={20} />
        </Button>
      </div>
      <IosInstallSheet open={iosOpen} onClose={closeIos} />
    </>
  );
}
