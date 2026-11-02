import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Us", robots: { index: false } };

export default function UsPage() {
  return (
    <AppShell withTabBar>
      <h1 className="mt-4 font-display text-[40px] leading-none font-normal">Us</h1>
      <SettingsView />
    </AppShell>
  );
}
