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

/** App icons per theme, all in public/ (layout metadata + manifest). The cat ones are generated
 *  from src/components/icons/Cat.tsx, the sheep ones from public/icon.svg. */
export const THEME_ICONS =
  THEME === "cat"
    ? {
        favicon: [{ url: "/icon-cat.svg", type: "image/svg+xml" }],
        apple: "/apple-icon-cat.png",
        pwa192: "/icon-cat-192.png",
        pwa512: "/icon-cat-512.png",
        maskable512: "/icon-cat-maskable-512.png",
      }
    : {
        favicon: [
          { url: "/favicon.ico", sizes: "any" },
          { url: "/icon.svg", type: "image/svg+xml" },
        ],
        apple: "/apple-icon.png",
        pwa192: "/icon-192.png",
        pwa512: "/icon-512.png",
        maskable512: "/icon-maskable-512.png",
      };
