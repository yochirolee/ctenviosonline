import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    // Reglas específicas para Googlebot
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // No cambies tu UI: esto sólo envuelve tus páginas admin y les aplica el meta robots
  return <>{children}</>;
}
