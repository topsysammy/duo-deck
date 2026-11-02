import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Outfit } from "next/font/google";
import { siteUrl } from "@/lib/utils";
import { CAPTURE_INSTALL_PROMPT, PwaProvider } from "@/components/pwa/pwa-provider";
import { UpdateBanner } from "@/components/pwa/update-banner";
import { AppEffects } from "@/components/providers/app-effects";
import "./globals.css";

const bagel = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bagel",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Duo Deck · Card games for couples", template: "%s · Duo Deck" },
  description:
    "Free conversation-card games for couples. Swipe through prompts that spark laughter and closeness. No sign-up, works offline.",
  applicationName: "Duo Deck",
  appleWebApp: { capable: true, title: "Duo Deck", statusBarStyle: "black" },
  // Declaring icons here replaces the automatic app/icon.svg link, so list both.
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
  openGraph: { siteName: "Duo Deck", type: "website", locale: "en_NG" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bagel.variable} ${outfit.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: CAPTURE_INSTALL_PROMPT }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-chip focus:bg-white focus:px-4 focus:py-2 focus:text-ink-strong"
        >
          Skip to content
        </a>
        <PwaProvider />
        <AppEffects />
        <UpdateBanner />
        {children}
      </body>
    </html>
  );
}
