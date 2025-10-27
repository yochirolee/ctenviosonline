// app/[locale]/product/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
// ⬇️ usa el detalle completo
import { getProductDetailById } from '@/lib/products'
import ProductDetailClient from './product-detail-client'
import BackButton from '@/components/BackButton'

type Params = { locale: string; id: string }
type PageProps = { params: Promise<Params> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const prod = await getProductDetailById(Number(id), locale === 'en' ? 'en' : 'es')
  if (!prod) return {}

  const title = prod.name
  const description = prod.description?.slice(0, 160) || ''
  const images = prod.imageSrc ? [{ url: prod.imageSrc }] : []

  return {
    title,
    description,
    openGraph: { title, description, images, locale, type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: prod.imageSrc ? [prod.imageSrc] : [] },
    alternates: { canonical: `/${locale}/product/${id}` },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, id } = await params
  const product = await getProductDetailById(Number(id), locale === 'en' ? 'en' : 'es')
  if (!product) notFound()

  return (
    <main className="px-4 md:px-12 lg:px-20 py-8">
      <BackButton label={locale === 'en' ? 'Back' : 'Atrás'} />
      {/* ProductDetailClient debe soportar options + variants y pasar variantId al addItem */}
      <ProductDetailClient product={product} locale={locale} />
    </main>
  )
}
