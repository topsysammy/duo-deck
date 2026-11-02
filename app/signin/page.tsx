import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Logo } from "@/components/brand/primitives";
import { ChevronLeft } from "@/components/brand/icons";
import { buttonVariants } from "@/components/ui/button";
import { SignInWithNext } from "./sign-in-next";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/** Optional sign-in to sync (ON-2). `?next=/path` says where to go afterwards. */
export default function SignInPage() {
  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link href="/us" aria-label="Back" className={buttonVariants({ variant: "secondary", size: "icon" })}>
          <ChevronLeft />
        </Link>
        <Logo className="text-[26px]" />
        <span className="size-[46px]" aria-hidden="true" />
      </div>
      <h1 className="mt-8 font-display text-[38px] leading-[1.04] font-normal tracking-[-0.5px]">
        Keep your cards on any phone
      </h1>
      <p className="mt-3 text-[17px] leading-[1.4] text-muted">
        Sign in to sync your favorites, history and settings. It&apos;s optional: everything works without an account.
      </p>
      <SignInWithNext />
    </AppShell>
  );
}
