import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Phone-first column: full width up to 440 px, centred on tablet/desktop.
 * `withTabBar` reserves space so content never hides behind the tab bar.
 */
export function AppShell({
  children,
  withTabBar = false,
  className,
}: {
  children: ReactNode;
  withTabBar?: boolean;
  className?: string;
}) {
  return (
    <main
      id="main"
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-app flex-col px-gutter pt-6",
        withTabBar
          ? "pb-[calc(var(--tabbar-h)+40px+env(safe-area-inset-bottom))]"
          : "pb-[calc(32px+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </main>
  );
}
