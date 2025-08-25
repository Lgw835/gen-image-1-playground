import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false, // 隐藏左下角的Next.js开发工具按钮
  
  // 忽略ESLint错误，允许构建继续
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 忽略TypeScript错误，允许构建继续
  typescript: {
    ignoreBuildErrors: true,
  },

  // 配置外部图像域名
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.20250131.xyz',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
