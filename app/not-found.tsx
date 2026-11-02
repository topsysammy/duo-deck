import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Logo } from "@/components/brand/primitives";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppShell className="items-center justify-center gap-4 text-center">
      <Logo className="text-[34px]" />
      <h1 className="font-display text-[32px] leading-none font-normal">This card got lost</h1>
      <p className="text-muted">The page you opened doesn&apos;t exist.</p>
      <Link href="/" className={buttonVariants({ size: "md" })}>
        Back to decks
      </Link>
    </AppShell>
  );
}
