// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

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
      // Shein
      { protocol: "https", hostname: "img.ltwebstatic.com" },
      { protocol: "https", hostname: "img.shein.com" },
      { protocol: "https", hostname: "us.shein.com" },
    ],
  },

  async headers() {
    // ⚠️ CSP de prueba: amplia a https: en frame-src para que cualquier ACS/emisor pueda abrir el desafío.
    // Cuando verifiquemos que el modal aparece, podemos restringir dominios si el proveedor te los entrega.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.3dsintegrator.com",
      // permite iframes de emisores/ACS
      "frame-src 'self' https: data:",
      [
        "connect-src 'self'",
        "https://cdn.3dsintegrator.com",
        "https://api-sandbox.3dsintegrator.com",
        "https://acs-server-sandbox.3dsintegrator.com",   // 👈 NUEVO
        "https://services.bmspay.com",
        "https://services.bmspay.com/testing",
        "https://valeleebackend.onrender.com",
        "http://localhost:4000",
        (isProd ? "" : "ws:"),
        (isProd ? "" : "http://localhost:3000"),
      ].filter(Boolean).join(" "),
      "style-src 'self' 'unsafe-inline' https: data:",
      "img-src 'self' https: data: blob:",
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
          // Importante: sólo una cabecera CSP. Si ya pones CSP en Nginx/Render/Cloudflare,
          // evita duplicarla o se pelean.
          { key: "Content-Security-Policy", value: csp },
          // Recomendados:
          { key: "X-Frame-Options", value: "SAMEORIGIN" }, // ok: el ACS va en un iframe INYECTADO, no embebes tu app en otros
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "accelerometer=(),camera=(),geolocation=(),gyroscope=(),magnetometer=(),microphone=(),payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
