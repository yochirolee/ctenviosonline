import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Local (dev)
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/cats/**" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/img/**" },
      // Producción (Render)
      { protocol: "https", hostname: "valeleebackend.onrender.com", pathname: "/cats/**" },
      { protocol: "https", hostname: "valeleebackend.onrender.com", pathname: "/img/**" },
      // Amazon
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
       // Shein (comunes):
       { protocol: 'https', hostname: 'img.ltwebstatic.com' },
       { protocol: 'https', hostname: 'img.shein.com' },
       { protocol: 'https', hostname: 'us.shein.com' },
    ],
  },
};

export default nextConfig;
