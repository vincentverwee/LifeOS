import { Caveat, Inter } from "next/font/google";
export { fraunces } from "@/components/home/fonts";

// Only the /preview look mockups use these; the variables are set on each look's root,
// so the rest of the app keeps Geist and never loads them.
export const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
export const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap" });
