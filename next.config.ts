import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb", // or "2mb", "10mb", etc.
      allowedOrigins: ["*"], // or specify origins
    },
  },
  headers: async () => [
    {
      source: "/enc.js",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store",
        },
      ],
    },
  ],
  async redirects() {
    return [
      {
        source: "/enc.js",
        destination: "/", // Or handle it however you'd like
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
