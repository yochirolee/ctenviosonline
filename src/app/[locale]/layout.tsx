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

/** ---- Helper para aceptar params como objeto o como Promise ---- */
type Params = { locale: string }

async function resolveParams(p: Params | Promise<Params>): Promise<Params> {
  // Normaliza de forma segura sin usar `any`
  return Promise.resolve(p)
}

/** ---- Metadata por locale (acepta params como Promise o como objeto) ---- */
export async function generateMetadata({
  params,
}: { params: Params | Promise<Params> }): Promise<Metadata> {
  const { locale } = await resolveParams(params)

  const metadataByLocale: Record<"es" | "en", Metadata> = {
    es: {
      title: "Valelee - Tienda en Miami con envíos a Cuba y Estados Unidos",
      description:
        "Valelee, tu tienda en Miami para enviar productos a Cuba y comprar desde cualquier lugar de Estados Unidos. Variedad, buenos precios y envíos rápidos.",
      keywords: [
        "tienda online Miami",
        "envíos a Cuba",
        "compras en Miami",
        "envíos dentro de Estados Unidos",
        "productos para Cuba",
        "Valelee",
        "comprar online desde Miami",
        "envíos rápidos a Cuba",
        "tienda con envíos internacionales",
      ],
      alternates: { languages: { en: "/en" } },
      openGraph: {
        title: "Valelee Online - Tienda en Miami con envíos a Cuba y Estados Unidos",
        description:
          "Compra en Valelee y recibe en Cuba o en cualquier parte de Estados Unidos. Precios competitivos y servicio confiable.",
        url: "https://valelee.com/",
        siteName: "Valelee",
        images: [{ url: "https://valelee.com/og-image.jpg", width: 1200, height: 630 }],
        locale: "es_ES",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Valelee - Tienda en Miami con envíos a Cuba y Estados Unidos",
        description:
          "Compra en Valelee y recibe en Cuba o en cualquier parte de Estados Unidos. Servicio confiable y rápido.",
        images: ["https://valelee.com/og-image.jpg"],
      },
    },
    en: {
      title: "Valelee - Miami Store Shipping to Cuba and the USA",
      description:
        "Valelee, your Miami store to send products to Cuba and shop from anywhere in the USA. Wide selection, great prices, and fast shipping.",
      keywords: [
        "online store Miami",
        "shipping to Cuba",
        "Miami shopping",
        "shipping within USA",
        "products for Cuba",
        "Valelee",
        "buy online from Miami",
        "fast shipping to Cuba",
        "international shipping store",
      ],
      alternates: { languages: { es: "/" } },
      openGraph: {
        title: "Valelee - Miami Store Shipping to Cuba and the USA",
        description:
          "Shop at Valelee and receive in Cuba or anywhere in the USA. Competitive prices and reliable service.",
        url: "https://valelee.com/",
        siteName: "Valelee",
        images: [{ url: "https://valelee.com/og-image.jpg", width: 1200, height: 630 }],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Valelee - Miami Store Shipping to Cuba and the USA",
        description:
          "Shop at Valelee Online and receive in Cuba or anywhere in the USA. Reliable and fast service.",
        images: ["https://valelee.com/og-image.jpg"],
      },
    },
  }

  return metadataByLocale[(locale as "es" | "en") ?? "es"]
}

/** ---- Layout (acepta params como Promise u objeto) ---- */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Params | Promise<Params>
}) {
  const { locale } = await resolveParams(params)
  const dict = (await getDictionary(locale)) as Dict

  return (
    <LocationProvider>
      <CustomerProvider>
        <CartProvider>
          {/* Si prefieres que el banner vaya arriba del navbar, muévelo aquí */}
          <Navbar dict={dict} />
          <CartDrawer dict={dict} />
          <BannerLocationPicker dict={dict} />
          <GlobalSearch dict={dict} />
          {children}
          <EncargosDrawer dict={dict} />
          <Toaster position="top-center" />
        </CartProvider>
      </CustomerProvider>
    </LocationProvider>
  )
}
