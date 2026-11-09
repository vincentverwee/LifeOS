import type { Metadata, Viewport } from "next";
import { QuickRail } from "@/components/home/QuickRail";
import { railSections } from "@/components/home/TileBodies";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { StandaloneStart } from "@/components/StandaloneStart";
import { TimeZoneSync } from "@/components/TimeZoneSync";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { OutboxSync } from "@/components/OutboxSync";
import { LocationSync } from "@/components/LocationSync";
import { cookies } from "next/headers";
import { COLOR_MODE_COOKIE, parseColorMode } from "@/lib/colorMode";
import { THEME, THEME_COLORS, THEME_ICONS } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life Analytics",
  description: "Your personal data, in one place.",
  icons: { icon: THEME_ICONS.favicon, apple: THEME_ICONS.apple },
  appleWebApp: {
    capable: true,
    title: "LifeOS",
    statusBarStyle: "default",
  },
};

/** The status-bar colour follows Settings → Appearance (a cookie), else the phone. */
export async function generateViewport(): Promise<Viewport> {
  const mode = parseColorMode((await cookies()).get(COLOR_MODE_COOKIE)?.value);
  const light = THEME_COLORS.background;
  const dark = THEME_COLORS.backgroundDark;
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: mode === "dark" ? dark : light },
      { media: "(prefers-color-scheme: dark)", color: mode === "light" ? light : dark },
    ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const mode = parseColorMode((await cookies()).get(COLOR_MODE_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-theme={THEME}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-mode={mode === "system" ? undefined : mode}
    >
      <body className="min-h-full flex flex-col">
        <Navigation />
        {/* Swipe left on any page for the column of section mascots (Home renders its own, with moods and dots). */}
        <QuickRail global sections={railSections()} />
        <TimeZoneSync />
        <StandaloneStart />
        <ServiceWorkerRegister />
        <OutboxSync />
        <LocationSync />
        <main className="mx-auto w-full max-w-3xl flex-1 has-[[data-waypoint]]:max-w-6xl px-4 pt-5 pb-10 max-sm:has-[.pb-tabbar]:pb-0 sm:px-6 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
