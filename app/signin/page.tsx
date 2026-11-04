import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Logo } from "@/components/brand/primitives";
import { ChevronLeft } from "@/components/brand/icons";
import { buttonVariants } from "@/components/ui/button";
import { SignInWithNext } from "./sign-in-next";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/** Optional sign-in to sync (ON-2). `?next=/path` says where to go afterwards; `?mode=signup` opens Create account. */
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
      <SignInWithNext />
    </AppShell>
  );
}
