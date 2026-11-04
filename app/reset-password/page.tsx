import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Logo } from "@/components/brand/primitives";
import { ResetPassword } from "./reset-password";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

/** Where a password-reset link lands (via /auth/callback, already signed in). */
export default function ResetPasswordPage() {
  return (
    <AppShell>
      <Logo className="self-center text-[26px]" />
      <ResetPassword />
    </AppShell>
  );
}
