import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Re-opening a page seen in the last minute is instant (no server render). Every
    // mutating server action calls revalidatePath, which clears this cache, so edits show at once.
    staleTimes: { dynamic: 60 },
  },
  images: {
    // Recipe photos from the Spoonacular API.
    remotePatterns: [{ protocol: "https", hostname: "img.spoonacular.com" }],
  },
  async redirects() {
    // Was the Notifications page; old links and notification taps still land.
    return [{ source: "/notifications", destination: "/settings", permanent: true }];
  },
  async headers() {
    return [
      {
        // Always fetch the service worker fresh, so changes to it roll out.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
