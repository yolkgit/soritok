import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 소리톡 단일 오리진(/aqua/) 경로로 서빙
  basePath: "/aqua",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      }
    ],
  },
};

export default nextConfig;
