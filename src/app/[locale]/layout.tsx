// app/[locale]/layout.tsx
import type { Metadata } from "next"
import "../globals.css"

import { Toaster } from "sonner"
import Navbar from "@/components/Navbar"
import CartDrawer from "@/components/Cart"
import { CartProvider } from "@/context/CartContext"
import { CustomerProvider } from "@/context/CustomerContext"
import { LocationProvider } from "@/context/LocationContext"
import BannerLocationPicker from "@/components/location/BannerLocationPicker"
import GlobalSearch from "@/components/GlobalSearch"
import { getDictionary } from "@/lib/dictionaries"
import type { Dict } from "@/types/Dict"
import EncargosDrawer from '@/components/EncargosDrawer'

type Params = { locale: string }

// Helper seguro que acepta objeto o Promise
async function resolveParams(p: Params | Promise<Params>): Promise<Params> {
  return Promise.resolve(p)
}

// Utilidades SEO
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://valelee.com"
const defaultOG = `${SITE_URL}/og-image.jpg`
const icons = {
  icon: "/favicon.ico",
  shortcut: "/favicon.ico",
  apple: "/apple-touch-icon.png",
}

export async function generateMetadata({
  params,
}: { params: Params | Promise<Params> }): Promise<Metadata> {
  const { locale } = await resolveParams(params)
  const isES = (locale as "es" | "en") === "es"

  const baseKeywordsES = [
    "tienda online Miami",
    "envíos a Cuba",
    "compras en Miami",
    "envíos dentro de Estados Unidos",
    "productos para Cuba",
    "Valelee",
    "comprar online desde Miami",
    "envíos rápidos a Cuba",
    "tienda con envíos internacionales",
    // extra SEO
    "electrodomésticos Miami",
    "electrónica Miami",
    "envíos Miami a Cuba",
    "comprar y enviar a Cuba",
    "delivery a Cuba",
    "ofertas Miami online",
  ]

  const baseKeywordsEN = [
    "online store Miami",
    "shipping to Cuba",
    "Miami shopping",
    "shipping within USA",
    "products for Cuba",
    "Valelee",
    "buy online from Miami",
    "fast shipping to Cuba",
    "international shipping store",
    // extra SEO
    "appliances Miami",
    "electronics Miami",
    "Miami to Cuba shipping",
    "buy and ship to Cuba",
    "delivery to Cuba",
    "Miami online deals",
  ]

  const metadataByLocale: Record<"es" | "en", Metadata> = {
    es: {
      metadataBase: new URL(SITE_URL),
      title: "Valelee - Tienda en Miami con envíos a Cuba y Estados Unidos",
      description:
        "Valelee, tu tienda en Miami para enviar productos a Cuba y comprar desde cualquier lugar de Estados Unidos. Variedad, buenos precios y envíos rápidos.",
      keywords: baseKeywordsES,
      alternates: { canonical: "/", languages: { en: "/en" } },
      openGraph: {
        title: "Valelee Online - Tienda en Miami con envíos a Cuba y Estados Unidos",
        description:
          "Compra en Valelee y recibe en Cuba o en cualquier parte de Estados Unidos. Precios competitivos y servicio confiable.",
        url: SITE_URL,
        siteName: "Valelee",
        images: [{ url: defaultOG, width: 1200, height: 630, alt: "Valelee - Tu tienda online" }],
        locale: "es_ES",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Valelee - Tienda en Miami con envíos a Cuba y Estados Unidos",
        description:
          "Compra en Valelee y recibe en Cuba o en cualquier parte de Estados Unidos. Servicio confiable y rápido.",
        images: [defaultOG],
      },
      robots: { index: true, follow: true },
      icons,
      other: {
        "theme-color": "#0f3d2e",
      },
    },
    en: {
      metadataBase: new URL(SITE_URL),
      title: "Valelee - Miami Store Shipping to Cuba and the USA",
      description:
        "Valelee, your Miami store to send products to Cuba and shop from anywhere in the USA. Wide selection, great prices, and fast shipping.",
      keywords: baseKeywordsEN,
      alternates: { canonical: "/en", languages: { es: "/" } },
      openGraph: {
        title: "Valelee - Miami Store Shipping to Cuba and the USA",
        description:
          "Shop at Valelee and receive in Cuba or anywhere in the USA. Competitive prices and reliable service.",
        url: `${SITE_URL}/en`,
        siteName: "Valelee",
        images: [{ url: defaultOG, width: 1200, height: 630, alt: "Valelee - Your online store" }],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Valelee - Miami Store Shipping to Cuba and the USA",
        description:
          "Shop at Valelee and receive in Cuba or anywhere in the USA. Reliable and fast service.",
        images: [defaultOG],
      },
      robots: { index: true, follow: true },
      icons,
      other: {
        "theme-color": "#0f3d2e",
      },
    },
  }

  return metadataByLocale[(locale as "es" | "en") ?? "es"]
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Params | Promise<Params>
}) {
  const { locale } = await resolveParams(params)
  const dict = (await getDictionary(locale)) as Dict

  // JSON-LD (Organization + WebSite+SearchAction)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: "Valelee",
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        sameAs: [
          "https://www.facebook.com/ctenvio/",   // <-- si cambias tus redes, actualiza aquí
          "https://www.instagram.com/ctenvios/",
          "https://wa.me/17864519573",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: "Valelee",
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
        inLanguage: ["es", "en"],
      },
    ],
  }

  return (
    <LocationProvider>
      <CustomerProvider>
        <CartProvider>
          <Navbar dict={dict} />
          <CartDrawer dict={dict} />
          <BannerLocationPicker dict={dict} />
          <GlobalSearch dict={dict} />
          {/* JSON-LD inline para SEO */}
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {children}
          <EncargosDrawer dict={dict} />
          <Toaster position="top-center" />
        </CartProvider>
      </CustomerProvider>
    </LocationProvider>
  )
}
