import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mentor onboarding uploads (photo + CV) can exceed the default 1MB limit.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
