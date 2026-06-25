import type { NextConfig } from "next";

// 本地代理使用 fake-ip DNS（198.18.0.0/15）时，Next 图片优化器会因 SSRF 防护
// 拒绝解析到私有/保留 IP 的上游图片。开发期可在 .env.local 设置
// NEXT_IMAGE_UNOPTIMIZED=true 绕过服务端优化器，改由浏览器直接加载。
const unoptimizedImages = process.env.NEXT_IMAGE_UNOPTIMIZED === "true";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    unoptimized: unoptimizedImages,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
