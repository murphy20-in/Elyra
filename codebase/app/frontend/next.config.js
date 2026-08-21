/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const baseConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    domains: ["localhost", "elyra-media.s3.ap-south-1.amazonaws.com"],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    const apiBase = process.env.BACKEND_INTERNAL_URL || "http://localhost:8000";
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/socket.io/:path*", destination: `${apiBase}/socket.io/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

const isProd = process.env.NODE_ENV === "production";

let withPWA;
try {
  withPWA = require("next-pwa")({
    dest: "public",
    disable: !isProd,
    register: true,
    skipWaiting: true,
  });
} catch {
  withPWA = (cfg) => cfg;
}

let finalConfig = withPWA(baseConfig);

if (isProd && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    const { withSentryConfig } = require("@sentry/nextjs");
    finalConfig = withSentryConfig(finalConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    });
  } catch {
    // Sentry not installed; skip
  }
}

module.exports = withNextIntl(finalConfig);
