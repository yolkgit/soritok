import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 소리톡 단일 오리진(/aqua/) 경로로 서빙
  basePath: "/aqua",
  images: {
    // 이미지 최적화 비활성화 — 생성 이미지가 이미 800×500 소용량이라 리사이즈가 불필요하고,
    // _next/image 최적화(w=3840 등)가 저사양 서버에서 프로세스를 죽여 502 를 유발했음
    unoptimized: true,
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
