'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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

type SpotlightProduct = SimplifiedProduct & {
  link?: string | null
}

export default function ProductsSpotlight({ dict }: { dict: Dict }) {
  const { locale } = useParams() as { locale: string }
  const { location } = useLocation()
  const { addItem } = useCart()
  const router = useRouter()

  const [items, setItems] = useState<SpotlightProduct[]>([])
  const [loading, setLoading] = useState(true)

  const [visibleCount, setVisibleCount] = useState<number>(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)

  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const t = {
    title: dict.spotlight?.title ?? (locale === 'en' ? 'Popular right now' : 'Populares ahora'),
    subtitle:
      dict.spotlight?.subtitle ??
      (locale === 'en' ? 'Discover and add instantly' : 'Descubre y agrega al instante'),
    addToCart:
      dict.spotlight?.addToCart ??
      dict.cart?.addToCart ??
      (locale === 'en' ? 'Add to Cart' : 'Agregar al carrito'),
    added:
      dict.cart?.added ??
      (locale === 'en' ? 'Product added to the cart' : 'Producto agregado al carrito'),
    login_required:
      dict.spotlight?.login_required ??
      dict.cart?.login_required ??
      (locale === 'en'
        ? 'You must be logged in to add products to your cart.'
        : 'Debes iniciar sesión para agregar productos a tu carrito.'),
    viewAll: dict.spotlight?.viewAll ?? (locale === 'en' ? 'View all' : 'Ver todo'),
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
        const list = await getProducts(loc, locale === 'en' ? 'en' : 'es')
        if (!cancelled) {
          const trimmed = (list ?? []).slice(0, 20)
          setItems(trimmed as SpotlightProduct[])

          const w = typeof window !== 'undefined' ? window.innerWidth : 768
          const initial = w < 640 ? 4 : 8
          setVisibleCount(Math.min(initial, trimmed.length))

          const idle = (cb: () => void) => {
            if (
              typeof window !== 'undefined' &&
              'requestIdleCallback' in window
            ) {
              ;(window as unknown as { requestIdleCallback: (fn: () => void) => number }).requestIdleCallback(
                cb
              )
            } else {
              setTimeout(cb, 200)
            }
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
    return () => {
      cancelled = true
    }
  }, [loc, locale])

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  const recomputeControls = useCallback(() => {
    const el = railRef.current
    if (!el) {
      setCanPrev(false)
      setCanNext(false)
      return
    }
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const x = el.scrollLeft
    const tol = 1
    setCanPrev(x > tol)
    setCanNext(x < max - tol)
  }, [])

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = railRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-card]')
    const cs = getComputedStyle(el)
    let gapPx = parseFloat(cs.columnGap || '0')
    if (Number.isNaN(gapPx)) gapPx = 0
    const cardWidth = card ? card.getBoundingClientRect().width : 0
    const step = cardWidth + gapPx || el.clientWidth
    const perPage = Math.max(1, Math.floor(el.clientWidth / step))
    const delta = dir * perPage * step
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const target = el.scrollLeft + delta
    const clamped = Math.max(0, Math.min(target, max))
    if (Math.abs(clamped - el.scrollLeft) < 1) return
    el.scrollTo({ left: clamped, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    recomputeControls()
    const onScroll = () => recomputeControls()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => recomputeControls())
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [recomputeControls, visibleCount, items.length])

  useEffect(() => {
    if (!sentinelRef.current) return
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisibleCount(v => Math.min(v + 6, items.length))
          }
        }
      },
      { root: railRef.current, rootMargin: '200px', threshold: 0.01 }
    )
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [items.length])

  const railClasses = `
    flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2
    [-ms-overflow-style:none] [scrollbar-width:none]
    [&::-webkit-scrollbar]:hidden
    [content-visibility:auto] [contain-intrinsic-size:360px]
    [touch-action:pan-x_pan-y] overscroll-x-contain
  `

  return (
    <section id="populars" className="py-8 px-4 md:px-12 lg:px-20 bg-white">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
          {t.subtitle && <p className="text-gray-600 text-sm mt-1">{t.subtitle}</p>}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scrollByPage(-1)}
            className="p-2 rounded-full border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={locale === 'en' ? 'Previous' : 'Anterior'}
            disabled={!canPrev}
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => scrollByPage(1)}
            className="p-2 rounded-full border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={locale === 'en' ? 'Next' : 'Siguiente'}
            disabled={!canNext}
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
          <div ref={railRef} className={railClasses} onScroll={recomputeControls}>
            {items.slice(0, Math.max(visibleCount, 1)).map((p, idx, arr) => {
              const hasExternalLink = !!p.link && p.link.trim() !== ''
              const href = hasExternalLink ? p.link!.trim() : `/${locale}/product/${p.id}`

              return (
                <article
                  key={p.id}
                  className="w-[calc(50%-0.5rem)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]
                  flex-shrink-0 snap-start snap-always rounded-xl border shadow-sm bg-white flex flex-col overflow-hidden"
                  data-card
                  ref={idx === arr.length - 1 ? sentinelRef : undefined}
                >
                  {hasExternalLink ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-[4/3] bg-white rounded-t-xl overflow-hidden block"
                    >
                      <Image
                        src={p.imageSrc}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, (max-width: 1536px) 18vw, 16vw"
                        className="object-contain p-2"
                        loading="lazy"
                        fetchPriority="low"
                        decoding="async"
                        draggable={false}
                      />
                    </a>
                  ) : (
                    <Link
                      href={href}
                      prefetch={false}
                      className="relative aspect-[4/3] bg-white rounded-t-xl overflow-hidden block"
                    >
                      <Image
                        src={p.imageSrc}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, (max-width: 1536px) 18vw, 16vw"
                        className="object-contain p-2"
                        loading="lazy"
                        fetchPriority="low"
                        decoding="async"
                        draggable={false}
                      />
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

                    {hasExternalLink && (
                      <p className="mt-1 text-[11px] text-gray-500 leading-tight text-left">
                        {locale === 'en'
                          ? 'As an Amazon Associate, we earn from qualifying purchases.'
                          : 'Como afiliados de Amazon, ganamos comisiones por compras calificadas.'}
                      </p>
                    )}

                    <div className="mt-auto">
                      <div className="text-green-700 font-semibold text-sm">
                        {fmt.format(p.price)}
                      </div>

                      {hasExternalLink ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 w-full inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white text-sm py-2 rounded transition"
                        >
                          {locale === 'en' ? 'View on Amazon' : 'Ver en Amazon'}
                        </a>
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

          <div className="mt-4 flex justify-center md:hidden gap-3">
            <button
              onClick={() => scrollByPage(-1)}
              className="px-3 py-2 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!canPrev}
            >
              <span className="inline-flex items-center gap-1">
                <ChevronLeft size={16} /> {locale === 'en' ? 'Prev' : 'Anterior'}
              </span>
            </button>
            <button
              onClick={() => scrollByPage(1)}
              className="px-3 py-2 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!canNext}
            >
              <span className="inline-flex items-center gap-1">
                {locale === 'en' ? 'Next' : 'Siguiente'} <ChevronRight size={16} />
              </span>
            </button>
          </div>
        </div>
      )}
    </section>
  )

  async function handleAdd(p: SimplifiedProduct) {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(t.login_required, { position: 'bottom-center' })
      router.push(`/${locale}/login`)
      return
    }
    try {
      await addItem(Number(p.id), 1)
      toast.success(`${t.added}`, { position: 'bottom-center' })
    } catch (e: unknown) {
      const err = (e ?? {}) as { code?: string; available?: number }
      if (err.code === 'OUT_OF_STOCK') {
        toast.error(
          `Sin stock${Number.isFinite(err.available) ? ` (disp: ${err.available})` : ''}`,
          { position: 'bottom-center' }
        )
      } else {
        toast.error(
          locale === 'en'
            ? 'At the moment, you can’t add products to the cart.'
            : 'En este momento no se pueden agregar productos al carrito.',
          { position: 'bottom-center' }
        )
      }
    }
  }
}
