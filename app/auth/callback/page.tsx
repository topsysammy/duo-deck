import type { Metadata } from "next";
import { AuthCallback } from "./auth-callback";

export const metadata: Metadata = { title: "Signing in", robots: { index: false } };

export default function AuthCallbackPage() {
  return <AuthCallback />;
}
