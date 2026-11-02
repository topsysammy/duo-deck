import type { Accent } from "./types";

/**
 * Raw accent values for places CSS variables can't reach (OG images rendered
 * by Satori, canvas share images). Must match the tokens in app/globals.css.
 */
export const ACCENT_HEX: Record<Accent, { bg: string; fg: string }> = {
  cream: { bg: "#FFF1E8", fg: "#1A1218" },
  orange: { bg: "#E8961F", fg: "#1A1218" },
  yellow: { bg: "#FFC24B", fg: "#1A1218" },
  sky: { bg: "#5E95E3", fg: "#1A1218" },
  magenta: { bg: "#C8177E", fg: "#FFFFFF" },
  blue: { bg: "#1E5FD9", fg: "#FFFFFF" },
  berry: { bg: "#8E1453", fg: "#FFFFFF" },
  purple: { bg: "linear-gradient(160deg, #3D5FD6 0%, #6B4FE0 60%, #7A55DE 100%)", fg: "#FFFFFF" },
};

export const BRAND = {
  bg: "#000000",
  fg: "#FFFFFF",
  muted: "#A7A3AD",
  pink: "#EC6F96",
  ink: "#1A1218",
  cream: "#FFF1E8",
  orange: "#E8961F",
} as const;
