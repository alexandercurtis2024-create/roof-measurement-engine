import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "server.arcgisonline.com" },
      { protocol: "https", hostname: "services.arcgisonline.com" },
      { protocol: "https", hostname: "mdgeodata.md.gov" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
