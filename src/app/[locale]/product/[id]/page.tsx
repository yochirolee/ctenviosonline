// app/[locale]/product/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductById } from '@/lib/products'
import ProductDetailClient from './product-detail-client'
import BackButton from '@/components/BackButton'


type Params = { locale: string; id: string }
type PageProps = { params: Promise<Params> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale, id } = await params
    const prod = await getProductById(Number(id), locale === 'en' ? 'en' : 'es')
    if (!prod) return {}
  
    const title = prod.name
    const description = prod.description?.slice(0, 160) || ''
    const images = prod.imageSrc ? [{ url: prod.imageSrc }] : []
  
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images,            // [{ url: ... }]
        locale,
        type: 'website',   // <- en Next no existe 'product'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: prod.imageSrc ? [prod.imageSrc] : [],
      },
      alternates: {
        canonical: `/${locale}/product/${id}`,
      },
    }
  }
  

export default async function ProductPage({ params }: PageProps) {
  const { locale, id } = await params
  const product = await getProductById(Number(id), locale === 'en' ? 'en' : 'es')
  if (!product) notFound()

  const fmt = new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' })

  return (
    <main className="px-4 md:px-12 lg:px-20 py-8">
       <BackButton label={locale === 'en' ? 'Back' : 'Atrás'} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Imagen */}
        <div className="rounded-xl border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative aspect-[4/3]">
            <img
              src={product.imageSrc}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

          {product.description && (
            <p className="text-gray-700 mt-3 whitespace-pre-line">{product.description}</p>
          )}

          <div className="mt-6 text-2xl font-semibold text-green-700">
            {fmt.format(product.price)}
          </div>

          <div className="mt-6">
            <ProductDetailClient product={product} locale={locale} />
          </div>
        </div>
      </div>
    </main>
  )
}
