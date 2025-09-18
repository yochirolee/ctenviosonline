'use client'

import { useEffect, useMemo, useRef, useState, useCallback, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { getProducts, type DeliveryLocation, type SimplifiedProduct } from '@/lib/products'
import { useLocation } from '@/context/LocationContext'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'
import type { Dict } from '@/types/Dict'
import Image from 'next/image'
import Link from 'next/link'

export default function ProductsSpotlight({ dict }: { dict: Dict }) {
  const { locale } = useParams() as { locale: string }
  const { location } = useLocation()
  const { addItem } = useCart()
  const router = useRouter()

  const [items, setItems] = useState<SimplifiedProduct[]>([])
  const [loading, setLoading] = useState(true)

  // PERF: render progresivo (pocas al inicio, luego más)
  const [visibleCount, setVisibleCount] = useState<number>(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const railRef = useRef<HTMLDivElement>(null)

  const t = {
    title: dict.spotlight?.title ?? (locale === 'en' ? 'Popular right now' : 'Populares ahora'),
    subtitle:
      dict.spotlight?.subtitle ??
      (locale === 'en' ? 'Discover and add instantly' : 'Descubre y agrega al instante'),
    addToCart: dict.spotlight?.addToCart ?? dict.cart?.addToCart ?? (locale === 'en' ? 'Add to Cart' : 'Agregar al carrito'),
    added: dict.spotlight?.added ?? dict.cart?.added ?? (locale === 'en' ? 'added to the cart' : 'agregado al carrito'),
    login_required:
      dict.spotlight?.login_required ??
      dict.cart?.login_required ??
      (locale === 'en'
        ? 'You must be logged in to add products to your cart.'
        : 'Debes iniciar sesión para agregar productos a tu carrito.'),
    viewAll: dict.spotlight?.viewAll ?? (locale === 'en' ? 'View all' : 'Ver todo'),
  }

  // Memoiza la ubicación para usarla como única dependencia en el efecto
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
        const list = await getProducts(loc)
        if (!cancelled) {
          const trimmed = (list ?? []).slice(0, 20)
          setItems(trimmed)

          // PERF: decide cuántas mostrar de entrada según viewport (muy simple y conservador)
          const w = typeof window !== 'undefined' ? window.innerWidth : 768
          const initial = w < 640 ? 4 : 8 // 2 filas móviles ~ 4 items visibles, en desktop 8
          setVisibleCount(Math.min(initial, trimmed.length))

          // PERF: hidrata más en idle (hasta 12) sin bloquear interacción
          const idle = (cb: () => void) => {            
            if (window.requestIdleCallback) return window.requestIdleCallback(cb)
            return setTimeout(cb, 200)
          }
          idle(() => {
            setVisibleCount(v => Math.min(Math.max(v, 8), Math.min(12, trimmed.length)))
          })
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [loc])

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  // PERF: evita recrear función por render
  const handleAdd = useCallback(async (p: SimplifiedProduct) => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(t.login_required, { position: 'bottom-center' })
      router.push(`/${locale}/login`)
      return
    }
    try {
      await addItem(Number(p.id), 1)
      toast.success(`${p.name} ${t.added}`, { position: 'bottom-center' })
    } catch (e: unknown) {
      const err = (e ?? {}) as { code?: string; available?: number }
      if (err.code === 'OUT_OF_STOCK') {
        toast.error(`Sin stock${Number.isFinite(err.available) ? ` (disp: ${err.available})` : ''}`, { position: 'bottom-center' })
      } else {
        toast.error(locale === 'en' ? 'At the moment, you can’t add products to the cart.' : 'En este momento no se pueden agregar productos al carrito.', { position: 'bottom-center' })
      }
    }
  }, [addItem, locale, router, t.login_required, t.added])

  const scrollBy = (delta: number) => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  // PERF: cargar más cuando el usuario se acerca al final (horizontal)
  useEffect(() => {
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setVisibleCount(v => Math.min(v + 6, items.length))
        }
      }
    }, { root: railRef.current, rootMargin: '200px', threshold: 0.01 })
    io.observe(el)
    return () => io.disconnect()
  }, [items.length])

  return (
    <section className="py-8 px-4 md:px-12 lg:px-20 bg-white">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
          {t.subtitle && <p className="text-gray-600 text-sm mt-1">{t.subtitle}</p>}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scrollBy(-360)}
            className="p-2 rounded-full border hover:bg-gray-50"
            aria-label={locale === 'en' ? 'Previous' : 'Anterior'}
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => scrollBy(360)}
            className="p-2 rounded-full border hover:bg-gray-50"
            aria-label={locale === 'en' ? 'Next' : 'Siguiente'}
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-56 flex-shrink-0 rounded-xl border shadow-sm overflow-hidden">
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
        <p className="text-gray-500">
          {locale === 'en' ? 'No products to show.' : 'No hay productos para mostrar.'}
        </p>
      ) : (
        <div className="relative">
          <div
            ref={railRef}
            // PERF: content-visibility reduce trabajo del main thread fuera de viewport
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2
                       [-ms-overflow-style:none] [scrollbar-width:none]
                       [&::-webkit-scrollbar]:hidden
                       [content-visibility:auto] [contain-intrinsic-size:360px]"
          >
            {items.slice(0, Math.max(visibleCount, 1)).map((p, idx, arr) => (
              <article
                key={p.id}
                className="w-[calc(50%-0.5rem)] sm:w-56 flex-shrink-0 snap-start rounded-xl border shadow-sm bg-white flex flex-col overflow-hidden"
                ref={idx === arr.length - 1 ? sentinelRef : undefined}
              >
                {/* Imagen click → detalle */}
                <Link
                  href={`/${locale}/product/${p.id}`}
                  prefetch={false} // PERF: evita prefetch masivo de 20 páginas
                  className="relative aspect-[4/3] bg-white rounded-t-xl overflow-hidden block"
                >
                  <Image
                    src={p.imageSrc}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 224px"
                    className="object-contain p-2"
                    // PERF: mantener lazy, y baja prioridad de fetch
                    loading="lazy"
                    fetchPriority="low"
                    decoding="async"
                    draggable={false}
                  />
                </Link>

                <div className="p-3 flex-1 flex flex-col">
                  <Link href={`/${locale}/product/${p.id}`} prefetch={false}>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:underline">
                      {p.name}
                    </h3>
                  </Link>

                  {p.description ? (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-3">{p.description}</p>
                  ) : (
                    <span className="mt-1" />
                  )}

                  <div className="mt-auto">
                    <div className="text-green-700 font-semibold text-sm">{fmt.format(p.price)}</div>
                    <button
                      onClick={() => handleAdd(p)}
                      className="mt-3 w-full bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition"
                    >
                      {t.addToCart}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Controles móviles */}
          <div className="mt-4 flex justify-center md:hidden gap-3">
            <button onClick={() => scrollBy(-320)} className="px-3 py-2 rounded border text-sm">
              <span className="inline-flex items-center gap-1">
                <ChevronLeft size={16} /> {locale === 'en' ? 'Prev' : 'Anterior'}
              </span>
            </button>
            <button onClick={() => scrollBy(320)} className="px-3 py-2 rounded border text-sm">
              <span className="inline-flex items-center gap-1">
                {locale === 'en' ? 'Next' : 'Siguiente'} <ChevronRight size={16} />
              </span>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
