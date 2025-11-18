'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Flame } from 'lucide-react'
import { useLocation } from '@/context/LocationContext'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'
import { getBestSellers, type DeliveryLocation, type SimplifiedProduct } from '@/lib/products'
import type { Dict } from '@/types/Dict'
import Link from 'next/link'
import Image from 'next/image'

type BestItem = SimplifiedProduct & {
  sold_qty?: number
  link?: string | null
}

export default function BestSellers({ dict }: { dict: Dict }) {
  const { locale } = useParams() as { locale: string }
  const { location } = useLocation()
  const { addItem } = useCart()
  const router = useRouter()

  const [items, setItems] = useState<BestItem[]>([])
  const [loading, setLoading] = useState(true)

  // PERF: render progresivo
  const [visibleCount, setVisibleCount] = useState<number>(0)
  const lastCardRef = useRef<HTMLElement | null>(null)

  const t = {
    title: dict?.bestsellers?.title ?? (locale === 'en' ? 'Best Sellers' : 'Más vendidos'),
    subtitle:
      dict?.bestsellers?.subtitle ??
      (locale === 'en' ? 'What people loved recently' : 'Lo que más compran últimamente'),
    addToCart: dict?.cart?.addToCart ?? (locale === 'en' ? 'Add to Cart' : 'Agregar al carrito'),
    added: dict?.cart?.added ?? (locale === 'en' ? 'Product added to the cart' : 'Producto agregado al carrito'),
    login_required:
      dict?.cart?.login_required ??
      (locale === 'en'
        ? 'You must be logged in to add products to your cart.'
        : 'Debes iniciar sesión para agregar productos a tu carrito.'),
    empty: locale === 'en' ? 'No best sellers yet.' : 'Aún no hay más vendidos.',
  }

  const loc = useMemo(
    () =>
      location
        ? ({
          country: location.country,
          province: location.province,
          municipality: location.municipality,
          area_type: location.area_type,
        } as DeliveryLocation)
        : undefined,
    [location?.country, location?.province, location?.municipality, location?.area_type]
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const list = await getBestSellers(
          loc,
          { limit: 12, days: 60 },
          locale === 'en' ? 'en' : 'es'
        )
        if (!cancelled) {
          const data = list ?? []
          setItems(data as BestItem[])

          const w = typeof window !== 'undefined' ? window.innerWidth : 768
          const initial = w < 640 ? 4 : 8
          setVisibleCount(Math.min(initial, data.length))

          const idle = (cb: () => void) => {
            if (typeof window !== 'undefined' && window.requestIdleCallback) {
              return window.requestIdleCallback(cb)
            }
            return setTimeout(cb, 200)
          }
          idle(() =>
            setVisibleCount(v =>
              Math.min(Math.max(v, initial), Math.min(12, data.length))
            )
          )
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [loc, locale])

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  const handleAdd = useCallback(
    async (p: BestItem) => {
      const isLoggedIn = await checkCustomerAuth()
      if (!isLoggedIn) {
        toast.error(t.login_required, { position: 'bottom-center' })
        router.push(`/${locale}/login`)
        return
      }
      try {
        await addItem(Number(p.id), 1)
        toast.success(`${t.added}`, { position: 'bottom-center' })
      } catch {
        toast.error(
          locale === 'en'
            ? 'At the moment, you can’t add products to the cart.'
            : 'En este momento no se pueden agregar productos al carrito.',
          { position: 'bottom-center' }
        )
      }
    },
    [addItem, locale, router, t.added, t.login_required]
  )

  // Cargar más cuando el usuario llega al final del grid
  useEffect(() => {
    if (!lastCardRef.current) return
    const el = lastCardRef.current
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisibleCount(v => Math.min(v + 6, items.length))
          }
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [items.length, visibleCount])

  return (
    <section className="py-8 px-4 md:px-12 lg:px-20 bg-white">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <Flame className="text-orange-500" /> {t.title}
        </h2>
        <p className="text-gray-600 text-sm mt-1">{t.subtitle}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-100 animate-pulse aspect-[4/3]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                <div className="h-9 bg-gray-100 rounded mt-2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-gray-500">{t.empty}</p>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4
                     [content-visibility:auto] [contain-intrinsic-size:720px]"
        >
          {items.slice(0, Math.max(visibleCount, 1)).map((p, idx, arr) => {
            const hasExternalLink = !!p.link && p.link.trim() !== ''
            const href = hasExternalLink ? p.link!.trim() : `/${locale}/product/${p.id}`

            return (
              <article
                key={p.id}
                ref={idx === arr.length - 1 ? lastCardRef : undefined}
                className="border rounded-xl overflow-hidden shadow-sm bg-white flex flex-col"
              >
                {/* Imagen → detalle o enlace externo */}
                {hasExternalLink ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative bg-white aspect-[4/3] block"
                  >
                    <Image
                      src={p.imageSrc}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-contain p-2"
                      loading="lazy"
                      fetchPriority="low"
                      decoding="async"
                      draggable={false}
                    />
                    {(() => {
                      const sold = Number(p.sold_qty ?? 0)
                      return sold > 0 ? (
                        <span className="absolute top-2 left-2 text-[11px] bg-orange-500 text-white px-2 py-0.5 rounded-full">
                          {locale === 'en' ? `Sold ${sold}+` : `Vendidos ${sold}+`}
                        </span>
                      ) : null
                    })()}
                  </a>
                ) : (
                  <Link
                    href={href}
                    prefetch={false}
                    className="relative bg-white aspect-[4/3] block"
                  >
                    <Image
                      src={p.imageSrc}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-contain p-2"
                      loading="lazy"
                      fetchPriority="low"
                      decoding="async"
                      draggable={false}
                    />
                    {(() => {
                      const sold = Number(p.sold_qty ?? 0)
                      return sold > 0 ? (
                        <span className="absolute top-2 left-2 text-[11px] bg-orange-500 text-white px-2 py-0.5 rounded-full">
                          {locale === 'en' ? `Sold ${sold}+` : `Vendidos ${sold}+`}
                        </span>
                      ) : null
                    })()}
                  </Link>
                )}

                <div className="p-3 flex-1 flex flex-col">
                  {hasExternalLink ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:underline">
                        {p.name}
                      </h3>
                    </a>
                  ) : (
                    <Link href={href} prefetch={false}>
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:underline">
                        {p.name}
                      </h3>
                    </Link>
                  )}

                  {p.description ? (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-3">{p.description}</p>
                  ) : (
                    <span className="mt-1" />
                  )}

                  <p className="mt-1 text-[11px] text-gray-500 leading-tight text-left">
                    {locale === 'en'
                      ? 'As an Amazon Associate, we earn from qualifying purchases.'
                      : 'Como afiliados de Amazon, ganamos comisiones por compras calificadas.'}
                  </p>

                  <div className="mt-auto">
                    <div className="text-green-700 font-semibold text-sm">
                      {fmt.format(p.price)}
                    </div>

                    {hasExternalLink ? (
                      <>

                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 w-full inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white text-sm py-2 rounded transition"
                        >
                          {locale === 'en' ? 'View on Amazon' : 'Ver en Amazon'}
                        </a>

                      </>
                    ) : (
                      <button
                        onClick={() => handleAdd(p)}
                        className="mt-3 w-full bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition"
                      >
                        {t.addToCart}
                      </button>
                    )}

                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
