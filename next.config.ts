import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Receipt photos are downscaled in the browser before upload, but still
      // exceed the 1 MB default.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
