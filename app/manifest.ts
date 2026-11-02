import type { MetadataRoute } from "next";

/** Web app manifest (PW-1): installable, standalone, black splash. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Duo Deck",
    short_name: "Duo Deck",
    description: "Free card games for couples. Swipe, talk, get closer. Works offline.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["lifestyle", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
