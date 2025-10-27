// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    // 👇 opcional pero ayuda en algunos entornos
    domains: [
      "res.cloudinary.com",
      "m.media-amazon.com",
      "images-na.ssl-images-amazon.com",
      "img.ltwebstatic.com",
      "img.shein.com",
      "us.shein.com",
      "valeleebackend.onrender.com",
      "localhost",
    ],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/cats/**" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/img/**" },
      { protocol: "https", hostname: "valeleebackend.onrender.com", pathname: "/cats/**" },
      { protocol: "https", hostname: "valeleebackend.onrender.com", pathname: "/img/**" },
      { protocol: "https", hostname: "m.media-amazon.com", pathname: "/**" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com", pathname: "/**" },
      { protocol: "https", hostname: "img.ltwebstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "img.shein.com", pathname: "/**" },
      { protocol: "https", hostname: "us.shein.com", pathname: "/**" },
    ],
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.3dsintegrator.com",
      "frame-src 'self' https: data:",
      [
        "connect-src 'self'",
        "https://cdn.3dsintegrator.com",
        "https://api-sandbox.3dsintegrator.com",
        "https://acs-server-sandbox.3dsintegrator.com",
        "https://services.bmspay.com",
        "https://services.bmspay.com/testing",
        "https://valeleebackend.onrender.com",
        "http://localhost:4000",
        (isProd ? "" : "ws:"),
        (isProd ? "" : "http://localhost:3000"),
      ].filter(Boolean).join(" "),
      "style-src 'self' 'unsafe-inline' https: data:",
      "img-src 'self' https: data: blob:", // ✅ permite el optimizer /_next/image y remotos https
      "font-src 'self' https: data:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https:",
      "worker-src 'self' blob:",
      "media-src 'self' https: data:",
      "manifest-src 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "accelerometer=(),camera=(),geolocation=(),gyroscope=(),magnetometer=(),microphone=(),payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
