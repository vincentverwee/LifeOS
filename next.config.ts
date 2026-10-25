import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Recipe photos from the Spoonacular API.
    remotePatterns: [{ protocol: "https", hostname: "img.spoonacular.com" }],
  },
};

export default nextConfig;
