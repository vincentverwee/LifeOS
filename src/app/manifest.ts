import type { MetadataRoute } from "next";
import { THEME_COLORS, THEME_ICONS } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Analytics",
    short_name: "LifeOS",
    description: "Your personal data, in one place.",
    start_url: "/",
    display: "standalone",
    background_color: THEME_COLORS.background,
    theme_color: THEME_COLORS.primary,
    icons: [
      { src: THEME_ICONS.pwa192, sizes: "192x192", type: "image/png" },
      { src: THEME_ICONS.pwa512, sizes: "512x512", type: "image/png" },
      { src: THEME_ICONS.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
