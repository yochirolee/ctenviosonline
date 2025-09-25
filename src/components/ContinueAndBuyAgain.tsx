'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCustomer } from '@/context/CustomerContext'
import { useCart } from '@/context/CartContext'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

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

type CartLine = {
    product_id: number
    title?: string | null
    thumbnail?: string | null
    unit_price: number // CENTAVOS en CartContext
}
type Dict = {
    home?: {
        continueTitle?: string
        buyAgainTitle?: string
        empty?: string
    }
}
type MiniProduct = { id: number; name: string; price: number; imageSrc?: string | null }

function nameForLocale(it: OrderItem, locale: string) {
    if (locale === 'en') {
        return (it.product_name_en && it.product_name_en.trim())
            || (it.metadata?.title_en && it.metadata.title_en.trim())
            || (it.product_name && it.product_name.trim())
            || `Product #${it.product_id}`
    }
    return (it.product_name && it.product_name.trim()) || `Producto #${it.product_id}`
}

export default function ContinueAndBuyAgain({ dict }: { dict: Dict }) {
    const pathname = usePathname()
    const locale = (pathname?.split('/')[1] || 'es') as 'es' | 'en'
    const { customer } = useCustomer()
    const { items: cartItems } = useCart()

    const [buyAgain, setBuyAgain] = useState<MiniProduct[]>([])
    const [continueItems, setContinueItems] = useState<MiniProduct[]>([])
    const [loading, setLoading] = useState(true)

    const t = {
        continueTitle: dict.home?.continueTitle ?? (locale === 'en' ? 'Continue where you left off' : 'Continúa donde te quedaste'),
        buyAgainTitle: dict.home?.buyAgainTitle ?? (locale === 'en' ? 'Buy again' : 'Comprar de nuevo'),
        empty: dict.home?.empty ?? (locale === 'en' ? 'No items yet.' : 'Aún no hay elementos.'),
    }

    const fmt = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }), [locale])

    // ----- Comprar de nuevo (orders) -----
    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    setLoading(true)
                    if (!customer) { setBuyAgain([]); return }
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                    const res = await fetch(`${API_URL}/customers/${customer.id}/orders`, {
                        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                        cache: 'no-store',
                    })
                    const data = (await res.json().catch(() => [])) as OrderRow[] | any
                    if (!Array.isArray(data)) { setBuyAgain([]); return }

                    type Agg = { p: MiniProduct; count: number; last: number }
                    const map = new Map<number, Agg>()
                    for (const o of data) {
                        const last = o?.created_at ? new Date(o.created_at).getTime() : 0
                        for (const it of (o.items || [])) {
                            const id = Number(it.product_id)
                            if (!id) continue
                            const name = nameForLocale(it, locale)
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
                    if (!cancelled) setBuyAgain(ordered.slice(0, 8))
                } finally {
                    if (!cancelled) setLoading(false)
                }
            })()
        return () => { cancelled = true }
    }, [customer, locale])

    // ----- Continúa donde te quedaste (cart) -----
    useEffect(() => {
        const fromCart = (): MiniProduct[] => {
            const src = Array.isArray(cartItems) ? (cartItems as CartLine[]) : []
            const uniq = new Map<number, MiniProduct>()
            for (const it of src) {
                const id = Number(it.product_id)
                if (!id || uniq.has(id)) continue
                uniq.set(id, {
                    id,
                    name: (it.title || '').trim() || `Producto #${id}`,
                    price: Number(it.unit_price || 0) / 100, // carrito en CENTAVOS → USD
                    imageSrc: it.thumbnail || null,
                })
            }
            return Array.from(uniq.values()).slice(0, 8)
        }

        const cartPick = fromCart()
        if (cartPick.length) { setContinueItems(cartPick); return }
        setContinueItems(buyAgain.slice(0, 4))
    }, [cartItems, buyAgain])

    return (
        <section className="px-4 md:px-12 lg:px-20 py-6">
            {/* Antes: grid-cols-1 md:grid-cols-2 … */}
            {/* Ahora: fuerza separación por columna y evita intercalado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="col-span-1 min-w-0 block">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3">{t.continueTitle}</h3>
                    <TilesWrap items={continueItems} locale={locale} fmt={fmt} loading={loading} emptyText={t.empty} />
                </div>

                <div className="col-span-1 min-w-0 block">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3">{t.buyAgainTitle}</h3>
                    <TilesWrap items={buyAgain} locale={locale} fmt={fmt} loading={loading} emptyText={t.empty} />
                </div>
            </div>
        </section>
    )

}

/** ====== Grid que ENVUELVE dentro de cada sección (sin scroll horizontal) ====== */
function TilesWrap({
    items, locale, fmt, loading, emptyText,
}: { items: MiniProduct[]; locale: string; fmt: Intl.NumberFormat; loading: boolean; emptyText: string }) {
    if (loading) {
        return (
            <div
                className="grid gap-3"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
            >
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-full rounded-lg border border-gray-200 bg-white p-2">
                        <div className="h-[160px] sm:h-[180px] bg-gray-100 animate-pulse rounded-md" />
                        <div className="h-3 bg-gray-100 mt-2 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-gray-100 mt-1 rounded w-1/2 animate-pulse" />
                    </div>
                ))}
            </div>
        )
    }
    if (!items.length) return <p className="text-sm text-gray-500">{emptyText}</p>

    return (
        <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
        >
            {items.slice(0, 8).map((p) => (
                <MiniTile key={p.id} p={p} locale={locale} fmt={fmt} />
            ))}
        </div>
    )
}

/** ====== Mini tile (mismo tamaño y BORDE en ambas secciones) ====== */
function MiniTile({ p, locale, fmt }: { p: MiniProduct; locale: string; fmt: Intl.NumberFormat }) {
    return (
        <Link
            href={`/${locale}/product/${p.id}`}
            prefetch={false}
            className="group w-full rounded-lg border border-gray-200 bg-white p-2 hover:shadow-sm transition"
            aria-label={p.name}
        >
            <div className="relative h-[160px] sm:h-[180px] w-full overflow-hidden rounded-md bg-gray-50">
                {p.imageSrc ? (
                    <Image
                        src={p.imageSrc}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 200px, 240px"
                        className="object-contain p-2"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-100" />
                )}
            </div>

            <div className="mt-2">
                <div className="text-[12px] md:text-[13px] font-medium text-gray-900 line-clamp-2 group-hover:underline underline-offset-4">
                    {p.name}
                </div>
                {Number.isFinite(p.price) && (
                    <div className="text-[12px] md:text-sm font-semibold text-emerald-700 mt-0.5">
                        {fmt.format(p.price || 0)}
                    </div>
                )}
            </div>
        </Link>
    )
}
