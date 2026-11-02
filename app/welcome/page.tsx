import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <main id="main" className="mx-auto w-full max-w-app">
      <Suspense>
        <OnboardingFlow />
      </Suspense>
    </main>
  );
}
