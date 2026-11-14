import { Caveat, Inter } from "next/font/google";

// Only the /preview look mockups use these; the variables are set on each look's root,
// so the rest of the app keeps Geist and never loads them. Not preloaded: the build puts
// their @font-face in the CSS Home shares with /preview, and a preload would make Home
// download both; without one a font is only fetched where text actually uses it.
export const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", preload: false });
export const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap", preload: false });
