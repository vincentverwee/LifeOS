import { THEME_COLORS } from "@/lib/theme";

/**
 * Light / dark per device: "system" follows the phone, "light"/"dark" force it.
 * Kept in a cookie, so the root layout renders `data-mode` on <html> (and the
 * status-bar colour) straight from the server: no script, no flash. globals.css
 * reads data-mode next to prefers-color-scheme.
 */
export type ColorMode = "system" | "light" | "dark";

export const COLOR_MODE_COOKIE = "color-mode";

export function parseColorMode(value: unknown): ColorMode {
  return value === "light" || value === "dark" ? value : "system";
}

/** Browser only: the mode the page is showing. */
export function readColorMode(): ColorMode {
  return parseColorMode(document.documentElement.getAttribute("data-mode"));
}

/** Browser only: remember the choice (a year) and switch the page at once. */
export function saveColorMode(mode: ColorMode) {
  document.cookie =
    mode === "system"
      ? `${COLOR_MODE_COOKIE}=; path=/; max-age=0; samesite=lax`
      : `${COLOR_MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;

  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-mode");
  else root.setAttribute("data-mode", mode);

  // The status-bar colour tags: one per media query in system mode, both forced otherwise.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const media = meta.getAttribute("media") ?? "";
    if (mode === "system") {
      meta.content = media.includes("dark") ? THEME_COLORS.backgroundDark : THEME_COLORS.background;
    } else {
      meta.content = mode === "dark" ? THEME_COLORS.backgroundDark : THEME_COLORS.background;
    }
  });
}
