import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Local (dev)
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/cats/**" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/img/**" },
      // Producción (Render)
      { protocol: "https", hostname: "valeleebackend.onrender.com", pathname: "/cats/**" },
      { protocol: "https", hostname: "valeleebackend.onrender.com", pathname: "/img/**" },
    ],
  },
};

export default nextConfig;
