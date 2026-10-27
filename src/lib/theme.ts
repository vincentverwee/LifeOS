// Per-deployment look. The default is Meadow: green with a sheep. A second copy of the app (another
// Vercel project on the same repo) sets NEXT_PUBLIC_THEME=cat for a pink theme with a cat instead.
// NEXT_PUBLIC_ variables are inlined at build time, so changing it needs a redeploy.

export type Theme = "sheep" | "cat";

export const THEME: Theme = process.env.NEXT_PUBLIC_THEME === "cat" ? "cat" : "sheep";

/** The mascot's name in copy ("tap the sheep"). */
export const MASCOT = THEME;

/** Colours outside CSS (browser chrome, PWA manifest); keep in sync with globals.css. */
export const THEME_COLORS =
  THEME === "cat"
    ? { background: "#fbf8f9", backgroundDark: "#130e11", primary: "#b83a72" }
    : { background: "#faf9f6", backgroundDark: "#0f120c", primary: "#1f5c3b" };
