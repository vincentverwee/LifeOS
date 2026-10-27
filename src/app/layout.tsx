import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { StandaloneStart } from "@/components/StandaloneStart";
import { TimeZoneSync } from "@/components/TimeZoneSync";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { OutboxSync } from "@/components/OutboxSync";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.background },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.backgroundDark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme={THEME}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navigation />
        <TimeZoneSync />
        <StandaloneStart />
        <ServiceWorkerRegister />
        <OutboxSync />
        <main className="mx-auto w-full max-w-3xl flex-1 has-[[data-waypoint]]:max-w-6xl px-4 pt-5 pb-10 max-sm:has-[.pb-tabbar]:pb-0 sm:px-6 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
