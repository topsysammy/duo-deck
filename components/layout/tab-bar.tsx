"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DecksIcon, HeartIcon, UserIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Decks", Icon: DecksIcon },
  { href: "/saved", label: "Saved", Icon: HeartIcon },
  { href: "/us", label: "Us", Icon: UserIcon },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/90 to-transparent pt-6 pb-[calc(16px+env(safe-area-inset-bottom))]">
      <nav
        aria-label="Main"
        className="pointer-events-auto mx-auto flex w-[calc(100%-48px)] max-w-[392px] gap-1.5 rounded-[32px] border border-border bg-surface p-1.5"
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[50px] flex-1 items-center justify-center gap-1.5 rounded-[25px] text-[15px] no-underline transition-colors",
                active
                  ? "bg-pink font-semibold text-ink-strong hover:text-ink-strong"
                  : "font-medium text-white hover:bg-surface-2 hover:text-white",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
