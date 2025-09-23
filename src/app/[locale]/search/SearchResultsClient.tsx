'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useLocation } from '@/context/LocationContext'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'
import { searchProductsPaged, type DeliveryLocation, type SimplifiedProduct } from '@/lib/products'
import type { Dict } from '@/types/Dict'
import Link from 'next/link'

type Props = {
  locale: string
  dict: Dict
  initialQuery: string
  initialPage: number
}

export default function SearchResultsClient({ locale, dict, initialQuery, initialPage }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const { location } = useLocation()
  const { addItem } = useCart()

  const [q, setQ] = useState(initialQuery)
  const [page, setPage] = useState(initialPage)
  const [items, setItems] = useState<SimplifiedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await searchProductsPaged(
                    q,
                    location as DeliveryLocation | undefined,
                    { page, limit: 12 },
                    locale === 'en' ? 'en' : 'es' 
                  )
        if (!cancelled) {
          setItems(res.items)
          setHasMore(res.has_more)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // Incluimos `location` para satisfacer la regla sin cambiar la lógica
  }, [q, page, locale, location, location?.country, location?.province, location?.municipality, location?.area_type])

  useEffect(() => {
    const params = new URLSearchParams(sp?.toString())
    if (q) params.set('q', q)
    else params.delete('q')
    params.set('page', String(page))
    router.replace(`?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const handleAdd = async (p: SimplifiedProduct) => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(
        dict?.cart?.login_required ||
          (locale === 'en'
            ? 'You must be logged in to add products to your cart.'
            : 'Debes iniciar sesión para agregar productos.'), { position: 'bottom-center' }
      )
      router.push(`/${locale}/login`)
      return
    }
    try {
      await addItem(Number(p.id), 1)
      toast.success(
        `${p.name} ${
          dict?.cart?.added || (locale === 'en' ? 'added to the cart' : 'agregado al carrito')
        }`, { position: 'bottom-center' }
      )
    } catch {
      toast.error(locale === 'en' ? 'Error adding to cart' : 'Error agregando al carrito', { position: 'bottom-center' })
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-2 max-w-2xl">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              dict?.cart?.search || (locale === 'en' ? 'Search product...' : 'Buscar producto...')
            }
            className="w-full border rounded-lg px-3 py-2 shadow-sm text-base md:text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
          >
            {locale === 'en' ? 'Search' : 'Buscar'}
          </button>
        </div>
      </form>

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-xl overflow-hidden shadow-sm">
                <div className="h-36 bg-gray-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                  <div className="h-9 bg-gray-100 rounded mt-2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-gray-500">
            {locale === 'en' ? 'No results found.' : 'No se encontraron resultados.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {items.map((p) => (
                <article
                key={p.id}
                className="border rounded-xl overflow-hidden shadow-sm bg-white flex flex-col"
              >
                {/* Imagen click → detalle, con ratio fijo y sin recorte */}
                <Link
                  href={`/${locale}/product/${p.id}`}
                  className="relative aspect-[4/3] bg-gray-50 block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageSrc}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                </Link>
              
                <div className="p-3 flex flex-col grow">
                  {/* Título click → detalle */}
                  <Link href={`/${locale}/product/${p.id}`}>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:underline">
                      {p.name}
                    </h3>
                  </Link>
              
                  {p.description ? (
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{p.description}</p>
                  ) : (
                    <span className="mt-0.5" />
                  )}
              
                  {/* Footer pegado abajo: precio + botón */}
                  <div className="mt-auto pt-1">
                    <div className="text-green-700 font-semibold text-sm">
                      {fmt.format(p.price)}
                    </div>
                    <button
                      onClick={() => handleAdd(p)}
                      className="mt-2 w-full bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition"
                    >
                      {dict?.cart?.addToCart ||
                        (locale === 'en' ? 'Add to Cart' : 'Agregar al carrito')}
                    </button>
                  </div>
                </div>
              </article>
              
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`px-3 py-1.5 rounded border text-sm ${
                  page <= 1 ? 'text-gray-400 border-gray-200' : 'hover:bg-gray-50'
                }`}
              >
                {locale === 'en' ? 'Previous' : 'Anterior'}
              </button>

              <span className="text-sm text-gray-700">
                {locale === 'en' ? 'Page' : 'Página'} {page}
              </span>

              <button
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
                className={`px-3 py-1.5 rounded border text-sm ${
                  !hasMore ? 'text-gray-400 border-gray-200' : 'hover:bg-gray-50'
                }`}
              >
                {locale === 'en' ? 'Next' : 'Siguiente'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
