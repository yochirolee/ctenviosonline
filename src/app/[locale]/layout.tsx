import { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { CartProvider } from "../../context/CartContext"; 
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const metadataByLocale = {
    es: {
      title: "Servicios de Jardinería en Sarasota - Wicho Landscaping | Diseño, Césped, Riego",
      description: "Expertos en jardinería en Sarasota. Diseño de jardines, mulch, césped, iluminación y riego.",
      keywords: [
        "jardinería Sarasota",
        "diseño de jardines Sarasota",
        "instalación de mulch Sarasota",
        "mantenimiento de jardines Sarasota",
        "corte y siembra de césped Sarasota",
        "iluminación de jardines",
        "sistema de riego para jardines Sarasota ",
      ],
      alternates: {
        languages: {
          en: "/en",
        },
      },
      openGraph: {
        title: "Servicios de Jardinería en Sarasota - Wicho Landscaping",
        description: "Expertos en jardinería en Sarasota. Diseño de jardines, mulch, césped, iluminación y riego.",
        url: "https://landscapingproy.vercel.app/",
        siteName: "Wicho Landscaping",
        images: [
          {
            url: "https://landscapingproy.vercel.app/landscaping-garden-design-sarasota.webp",
            width: 1200,
            height: 630,
          },
        ],
        locale: "es_ES",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Servicios de Jardinería en Sarasota - Wicho Landscaping",
        description: "Expertos en jardinería en Sarasota. Diseño de jardines, mulch, césped, iluminación y riego.",
        images: ["https://landscapingproy.vercel.app/landscaping-garden-design-sarasota.webp"],
      },
    },
    en: {
      title: "Landscaping Services in Sarasota - Wicho Landscaping | Garden Design & Irrigation",
      description: "Landscaping experts in Sarasota. Garden design, mulch installation, lawn care, lighting, and irrigation systems.",
      keywords: [
        "landscaping Sarasota",
        "garden design Sarasota",
        "mulch installation Sarasota",
        "lawn care and planting Sarasota",
        "irrigation systems for gardens",
        "garden lighting sarasota",
        "garden mainteinance Sarasota",
        "outdoor garden lighting Sarasota",
      ],
      alternates: {
        languages: {
          es: "/",
        },
      },
      openGraph: {
        title: "Landscaping Services in Sarasota - Wicho Landscaping",
        description: "Landscaping experts in Sarasota. Garden design, mulch installation, lawn care, lighting, and irrigation systems.",
        url: "https://landscapingproy.vercel.app/",
        siteName: "Wicho Landscaping",
        images: [
          {
            url: "https://landscapingproy.vercel.app/landscaping-garden-design-sarasota.webp",
            width: 1200,
            height: 630,
          },
        ],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Landscaping Services in Sarasota - Wicho Landscaping",
        description: "Landscaping experts in Sarasota...",
        images: ["https://landscapingproy.vercel.app/landscaping-garden-design-sarasota.webp"],
      },
    },
  };

  return metadataByLocale[locale as "es" | "en"];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  return <>{children}</>
}