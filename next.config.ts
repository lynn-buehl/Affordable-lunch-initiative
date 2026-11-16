import type { NextConfig } from "next";

// Sent with every response. The site holds people's names and balances, so
// it should never be framed by another site, sniffed as a different content
// type, or downgraded to plain HTTP.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    serverActions: {
      // Receipt photos are downscaled in the browser before upload, but still
      // exceed the 1 MB default.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
