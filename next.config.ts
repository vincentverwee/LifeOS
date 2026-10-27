import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Recipe photos from the Spoonacular API.
    remotePatterns: [{ protocol: "https", hostname: "img.spoonacular.com" }],
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
