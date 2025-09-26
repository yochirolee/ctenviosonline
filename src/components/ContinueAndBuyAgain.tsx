'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCustomer } from '@/context/CustomerContext'
import { useCart } from '@/context/CartContext'
import { useLocation } from '@/context/LocationContext'
import { getProducts, type DeliveryLocation, type SimplifiedProduct } from '@/lib/products'
import type { Dict as AppDict } from '@/types/Dict'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

// ---------- tipos de datos ----------
type OrderItem = {
  product_id: number
  product_name?: string
  product_name_en?: string | null
  unit_price: number // USD en /orders
  quantity: number
  image_url?: string | null
  metadata?: { title_en?: string | null } | null
}
type OrderRow = { order_id: number; created_at?: string; items: OrderItem[] }

type CartMeta = { title_en?: string | null } & Record<string, unknown>

type CartLine = {
  product_id: number
  title?: string | null
  thumbnail?: string | null
  unit_price: number // CENTAVOS en CartContext
  metadata?: CartMeta | null
}

type MiniProduct = { id: number; name: string; price: number; imageSrc?: string | null }

// ---------- utils/guards ----------
function isRecord(o: unknown): o is Record<string, unknown> {
  return typeof o === 'object' && o !== null
}
function isOrderItem(o: unknown): o is OrderItem {
  if (!isRecord(o)) return false
  return typeof o.product_id === 'number'
    && typeof o.unit_price === 'number'
    && (o.image_url === undefined || o.image_url === null || typeof o.image_url === 'string')
    && (o.product_name === undefined || typeof o.product_name === 'string')
    && (o.product_name_en === undefined || o.product_name_en === null || typeof o.product_name_en === 'string')
    && (o.metadata === undefined || o.metadata === null || isRecord(o.metadata))
}
function isOrderRow(o: unknown): o is OrderRow {
  if (!isRecord(o)) return false
  return typeof o.order_id === 'number'
    && Array.isArray(o.items)
    && o.items.every(isOrderItem)
    && (o.created_at === undefined || typeof o.created_at === 'string')
}
function isOrderRows(o: unknown): o is OrderRow[] {
  return Array.isArray(o) && o.every(isOrderRow)
}
function isCartLine(o: unknown): o is CartLine {
  if (!isRecord(o)) return false
  return typeof o.product_id === 'number'
    && (o.title === undefined || o.title === null || typeof o.title === 'string')
    && (o.thumbnail === undefined || o.thumbnail === null || typeof o.thumbnail === 'string')
    && typeof o.unit_price === 'number'
    && (o.metadata === undefined || o.metadata === null || isRecord(o.metadata))
}

// ---------- helpers ----------
function nameForLocaleOrder(it: OrderItem, locale: string) {
  if (locale === 'en') {
    return (it.product_name_en && it.product_name_en.trim())
      || (it.metadata?.title_en && it.metadata.title_en.trim())
      || (it.product_name && it.product_name.trim())
      || `Product #${it.product_id}`
  }
  return (it.product_name && it.product_name.trim()) || `Producto #${it.product_id}`
}
function titleEnFromCartMeta(meta: unknown): string | undefined {
  if (!isRecord(meta)) return undefined
  const v = (meta as { title_en?: unknown }).title_en
  return typeof v === 'string' ? v.trim() : undefined
}

// ---------- hooks de layout ----------
function useIsLg(breakpointPx = 1024) {
  const [isLg, setIsLg] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(min-width:${breakpointPx}px)`)
    const on = () => setIsLg(mq.matches)
    on()
    const listener = (e: MediaQueryListEvent) => setIsLg(e.matches)
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', listener)
    else mq.addListener(listener)
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', listener)
      else mq.removeListener(listener)
    }
  }, [breakpointPx])
  return isLg
}

/** Mide si caben 3 columnas reales dentro del grid padre */
function useCanFitThree(minColPx = 380, gapPx = 24) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [canFitThree, setCanFitThree] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0
      const cols = Math.floor((w + gapPx) / (minColPx + gapPx))
      setCanFitThree(cols >= 3)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [minColPx, gapPx])

  return { containerRef, canFitThree }
}

/** Map SimplifiedProduct -> MiniProduct */
function toMini(p: SimplifiedProduct): MiniProduct {
  return { id: Number(p.id), name: p.name, price: p.price, imageSrc: p.imageSrc }
}

// ======================================================

export default function ContinueAndBuyAgain({ dict: _dict }: { dict: AppDict }) {
  void _dict
  const pathname = usePathname()
  const locale = (pathname?.split('/')[1] || 'es') as 'es' | 'en'
  const isEn = locale === 'en'

  const { customer } = useCustomer()
  const isAuthed = !!customer

  const { items: cartItems, setIsCartOpen } = useCart()
  const { location } = useLocation()

  const loc: DeliveryLocation | undefined = useMemo(() => {
    if (!location) return undefined
    return {
      country: location.country,
      province: location.province,
      municipality: location.municipality,
      area_type: location.area_type,
    }
  }, [location?.country, location?.province, location?.municipality, location?.area_type])

  const [buyAgain, setBuyAgain] = useState<MiniProduct[]>([])
  const [continueItems, setContinueItems] = useState<MiniProduct[]>([])
  const [popularItems, setPopularItems] = useState<MiniProduct[]>([])
  const [loading, setLoading] = useState(true)

  const t = {
    continueTitle: isEn ? 'Continue where you left off' : 'Continúa donde te quedaste',
    buyAgainTitle: isEn ? 'Buy again' : 'Comprar de nuevo',
    popularTitle: isEn ? 'Popular right now' : 'Populares ahora',
    empty: isEn ? 'No items yet.' : 'Aún no hay elementos.',
    viewCart: isEn ? 'View cart' : 'Ver carrito',
    checkout: isEn ? 'Checkout' : 'Pagar',
    viewAll: isEn ? 'More' : 'Más productos',
    prev: isEn ? 'Scroll left' : 'Desplazar a la izquierda',
    next: isEn ? 'Scroll right' : 'Desplazar a la derecha',
  }

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }),
    [locale]
  )

  // ----- Comprar de nuevo (orders) -----
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        if (!isAuthed) { setBuyAgain([]); setLoading(false); return }
        try {
          setLoading(true)
          const token = typeof window === 'undefined' ? null : localStorage.getItem('token')
          const res = await fetch(`${API_URL}/customers/${customer!.id}/orders`, {
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            cache: 'no-store',
          })
          const raw: unknown = await res.json().catch(() => null)
          if (!isOrderRows(raw)) { setBuyAgain([]); return }

          type Agg = { p: MiniProduct; count: number; last: number }
          const map = new Map<number, Agg>()
          for (const o of raw) {
            const last = o.created_at ? new Date(o.created_at).getTime() : 0
            for (const it of o.items) {
              const id = Number(it.product_id)
              if (!id) continue
              const name = nameForLocaleOrder(it, locale)
              const price = Number(it.unit_price || 0) // USD
              const img = it.image_url || null
              const prev = map.get(id)
              if (prev) { prev.count += 1; prev.last = Math.max(prev.last, last) }
              else { map.set(id, { p: { id, name, price, imageSrc: img }, count: 1, last }) }
            }
          }
          const ordered = Array.from(map.values())
            .sort((a, b) => (b.last - a.last) || (b.count - a.count))
            .map(a => a.p)
          if (!cancelled) setBuyAgain(ordered.slice(0, 12))
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [isAuthed, customer, locale])

  // ----- Continúa donde te quedaste (cart) -----
  // Detecta si hay items válidos en carrito
  const hasCartItems = useMemo(() => {
    const src = Array.isArray(cartItems) ? (cartItems as unknown[]).filter(isCartLine) as CartLine[] : []
    return src.length > 0
  }, [cartItems])

  useEffect(() => {
    if (!isAuthed) { setContinueItems([]); return }
    const src = Array.isArray(cartItems) ? (cartItems as unknown[]).filter(isCartLine) as CartLine[] : []
    const uniq = new Map<number, MiniProduct>()
    for (const it of src) {
      const id = Number(it.product_id)
      if (!id || uniq.has(id)) continue

      const fallback = isEn ? `Product #${id}` : `Producto #${id}`
      const titleBase = (it.title || '').trim()
      const titleEn = titleEnFromCartMeta(it.metadata)
      const name = isEn ? (titleEn || titleBase || fallback) : (titleBase || fallback)

      uniq.set(id, {
        id,
        name,
        price: Number(it.unit_price || 0) / 100, // carrito en CENTAVOS → USD
        imageSrc: it.thumbnail || null,
      })
    }
    const cartPick = Array.from(uniq.values()).slice(0, 12)
    if (cartPick.length) { setContinueItems(cartPick); return }
    // si no hay del carrito, puedes sugerir algunos de "comprar de nuevo" como fallback limitado
    setContinueItems(buyAgain.slice(0, 4))
  }, [isAuthed, cartItems, buyAgain, isEn])

  // ----- Populares ahora (condicional) -----
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        if (!isAuthed) { setPopularItems([]); return }
        try {
          const list = await getProducts(loc, isEn ? 'en' : 'es')
          if (!cancelled) {
            const mapped = (list ?? []).slice(0, 12).map(toMini)
            setPopularItems(mapped)
          }
        } catch {
          if (!cancelled) setPopularItems([])
        }
      })()
    return () => { cancelled = true }
  }, [isAuthed, loc, isEn])

  // acciones
  const openCartDrawer = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    setIsCartOpen(true)
  }

  // layout: 3ra sección solo si hay espacio y sirve para llenar hueco
  const isLg = useIsLg()
  const { containerRef, canFitThree } = useCanFitThree(380, 24)

  // Reglas de visibilidad de secciones:
  const showContinue = isAuthed && hasCartItems && continueItems.length > 0
  const showBuyAgain = isAuthed && buyAgain.length > 0

  // La tercera solo aparece si existe al menos una de las anteriores,
  // y si alguna tiene pocos elementos (<=2), y si hay espacio real para 3 columnas.
  const fewLeft = showContinue ? continueItems.length <= 2 : false
  const fewRight = showBuyAgain ? buyAgain.length <= 2 : false
  const showPopular =
    isAuthed &&
    (showContinue || showBuyAgain) &&
    (fewLeft || fewRight) &&
    isLg &&
    canFitThree &&
    popularItems.length > 0

  // Si no hay sesión, no mostramos nada
  if (!isAuthed) return null

  // Si ninguna sección aplica, no renderizamos el bloque completo
  if (!showContinue && !showBuyAgain) return null

  const gridCols = showPopular ? 'lg:grid-cols-3' : 'lg:grid-cols-2'

  return (
    <section className="px-4 md:px-12 lg:px-20 py-6">
      <div
        ref={containerRef}
        className={`grid grid-cols-1 ${gridCols} gap-6 items-start`}
      >
        {/* Continúa */}
        {showContinue && (
          <Panel title={t.continueTitle} bg="bg-blue-100">
            <TilesRow items={continueItems} locale={locale} fmt={fmt} loading={loading} emptyText={t.empty} t={t} />
            {continueItems.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={openCartDrawer}
                  className="inline-flex items-center justify-center rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-700 hover:text-white"
                >
                  {t.viewCart}
                </button>
                <Link
                  href={`/${locale}/checkout`}
                  className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {t.checkout}
                </Link>
              </div>
            )}
          </Panel>
        )}

        {/* Comprar de nuevo */}
        {showBuyAgain && (
          <Panel title={t.buyAgainTitle} bg="bg-green-100">
            <TilesRow items={buyAgain} locale={locale} fmt={fmt} loading={loading} emptyText={t.empty} t={t} />
            <div className="mt-4">
              <Link
                href={`/${locale}#populars`}
                aria-label={isEn ? 'View all popular products' : 'Ver todos los populares'}
                className="inline-flex items-center justify-center rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-700 hover:text-white"
              >
                {t.viewAll}
              </Link>
            </div>
          </Panel>
        )}

        {/* Populares ahora (solo para rellenar hueco) */}
        {showPopular && (
          <Panel title={t.popularTitle} bg="bg-amber-50">
            <TilesRow items={popularItems} locale={locale} fmt={fmt} loading={false} emptyText={t.empty} t={t} />
            <div className="mt-4">
              <Link
                href={`/${locale}#populars`}
                aria-label={isEn ? 'View all popular products' : 'Ver todos los populares'}
                className="inline-flex items-center justify-center rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-700 hover:text-white"
              >
                {t.viewAll}
              </Link>
            </div>
          </Panel>
        )}
      </div>
    </section>
  )
}

// ---------- UI blocks ----------

function Panel({ title, bg, children }: { title: string; bg: string; children: React.ReactNode }) {
  return (
    <div className={`col-span-1 min-w-0 block rounded-xl border border-gray-200 ${bg} p-4`}>
      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function TilesRow({
  items, locale, fmt, loading, emptyText, t,
}: {
  items: MiniProduct[]
  locale: string
  fmt: Intl.NumberFormat
  loading: boolean
  emptyText: string
  t: { prev: string; next: string }
}) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  // Actualiza si hay más para desplazar
  useEffect(() => {
    const el = railRef.current
    if (!el) return
    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth
      setCanPrev(el.scrollLeft > 0)
      setCanNext(el.scrollLeft < maxScroll - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [items.length])

  const scrollStep = () => {
    const el = railRef.current
    if (!el) return 0
    // Desplaza ~ el ancho visible menos un gap para que “salte” una pantalla
    return Math.max(0, el.clientWidth - 24)
  }

  const onPrev = () => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: -scrollStep(), behavior: 'smooth' })
  }
  const onNext = () => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: scrollStep(), behavior: 'smooth' })
  }

  const Rail: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="relative">
      {/* Botón IZQ */}
      <button
        type="button"
        aria-label={t.prev}
        onClick={onPrev}
        disabled={!canPrev}
        className={`
          absolute left-0 top-1/2 -translate-y-1/2 z-10
          rounded-full border bg-white/90 shadow
          w-8 h-8 flex items-center justify-center
          disabled:opacity-40 disabled:cursor-not-allowed
          ${items.length <= 1 ? 'hidden' : ''}
        `}
      />

      {/* Carril */}
      <div
        ref={railRef}
        className="
          flex gap-3 pr-px
          overflow-x-auto overflow-y-hidden
          scroll-smooth snap-x snap-mandatory
          [touch-action:pan-x_pan-y] overscroll-x-contain
          [-ms-overflow-style:none] [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0
          [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent
        "
      >
        {children}
      </div>

      {/* Botón DER */}
      <button
        type="button"
        aria-label={t.next}
        onClick={onNext}
        disabled={!canNext}
        className={`
          absolute right-0 top-1/2 -translate-y-1/2 z-10
          rounded-full border bg-white/90 shadow
          w-8 h-8 flex items-center justify-center
          disabled:opacity-40 disabled:cursor-not-allowed
          ${items.length <= 1 ? 'hidden' : ''}
          `}
      />

    </div>
  )

  if (loading) {
    return (
      <Rail>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="
              snap-start flex-shrink-0
              basis-[calc((100%-0.75rem)/2-1px)]
              min-w-[calc((100%-0.75rem)/2-1px)]
              max-w-[calc((100%-0.75rem)/2-1px)]
            "
          >
            <div className="rounded-xl border overflow-hidden bg-white">
              <div className="bg-gray-100 animate-pulse aspect-[4/3]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </Rail>
    )
  }

  if (!items.length) return <p className="text-sm text-gray-500">{emptyText}</p>

  return (
    <Rail>
      {items.map((p, idx) => {
        const twoUp =
          items.length >= 2
            ? 'basis-[calc((100%-0.75rem)/2-1px)] min-w-[calc((100%-0.75rem)/2-1px)] max-w-[calc((100%-0.75rem)/2-1px)]'
            : 'basis-[calc(100%-1px)] min-w-[calc(100%-1px)] max-w-[calc(100%-1px)]'

        return (
          <div
            key={p.id ?? idx}
            className={`snap-start flex-shrink-0 ${twoUp}`}
          >
            <MiniTile p={p} locale={locale} fmt={fmt} />
          </div>
        )
      })}
    </Rail>
  )
}

/** Tarjeta uniforme (alto consistente) */
function MiniTile({ p, locale, fmt }: { p: MiniProduct; locale: string; fmt: Intl.NumberFormat }) {
  return (

    <Link
      href={`/${locale}/product/${p.id}`}
      prefetch={false}
      className="block group rounded-xl border overflow-hidden bg-white max-h-[320px] md:max-h-[340px]"
      aria-label={p.name}
    >
      {/* Imagen con aspect ratio fijo para altura pareja */}
      <div className="relative bg-white h-[150px] sm:h-[160px] md:h-[180px] lg:h-[200px]">
        {p.imageSrc ? (
          <Image
            src={p.imageSrc}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, 420px"
            className="object-contain p-2"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
      </div>

      {/* Texto con bloque fijo para el título */}
      <div className="p-3 flex flex-col">
        <div className="text-[12px] md:text-[13px] font-semibold text-gray-900 line-clamp-2 h-[40px] group-hover:underline">
          {p.name}
        </div>
        {Number.isFinite(p.price) && (
          <div className="mt-auto text-[12px] md:text-sm font-semibold text-emerald-700">
            {fmt.format(p.price || 0)}
          </div>
        )}
      </div>
    </Link>
  )
}
