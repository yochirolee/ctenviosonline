'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useLocation } from '@/context/LocationContext'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'
import { toast } from 'sonner'
import type { DeliveryLocation, SimplifiedProduct } from '@/lib/products'
import { getProductsByOwnerPaged as getProductsByOwner } from '@/lib/products'
import { ArrowLeft } from 'lucide-react'

export default function OwnerAllPage() {
    const { locale, ownerId } = useParams() as { locale: 'es' | 'en'; ownerId: string }
    const router = useRouter()
    const { location } = useLocation()
    const { addItem } = useCart()

    const [ownerName, setOwnerName] = useState<string>('')
    const [items, setItems] = useState<SimplifiedProduct[]>([])
    const [page, setPage] = useState<number>(1)
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)

    const fmt = useMemo(
        () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
        [locale]
    )

    // Textos mínimos para mantener el patrón visual coherente
    const t = {
        back: locale === 'en' ? 'Back' : 'Atrás',
        heading: locale === 'en' ? 'Products by' : 'Productos de',
        selected: locale === 'en' ? 'Location selected' : 'Ubicación seleccionada',
        change: locale === 'en' ? 'Change' : 'Cambiar',
        country_us: 'USA',
        country_cu: 'Cuba',
        province_placeholder: locale === 'en' ? 'Province' : 'Provincia',
        municipality_placeholder: locale === 'en' ? 'Municipality' : 'Municipio',
        location_municipality: locale === 'en' ? 'Municipality' : 'Municipio',
        location_city: locale === 'en' ? 'City' : 'Ciudad',
        loadMore: locale === 'en' ? 'Load more' : 'Cargar más',
        empty: locale === 'en' ? 'No items available.' : 'No hay productos disponibles.',
        login_required:
            locale === 'en'
                ? 'You must be logged in to add products to your cart.'
                : 'Debes iniciar sesión para agregar productos a tu carrito.',
        added: locale === 'en' ? 'added to the cart' : 'agregado al carrito',
        addToCart: locale === 'en' ? 'Add to Cart' : 'Agregar al carrito',
    }

    const buildLoc = (): DeliveryLocation | undefined => {
        if (!location) return undefined
        return {
            country: location.country as 'US' | 'CU',
            province: location.province,
            area_type: location.area_type as 'city' | 'municipio',
            municipality: location.municipality,
        }
    }

    async function load(p: number) {
        setLoading(true)
        try {
            const res = await getProductsByOwner(Number(ownerId), buildLoc(), { page: p, limit: 24 }, locale)
            if (p === 1) {
                setItems(res.items)
            } else {
                setItems(prev => [...prev, ...res.items])
            }
            setOwnerName(res.ownerName ?? '')
            setHasMore(res.has_more)
            setPage(res.page)
        } catch {
            if (p === 1) setItems([])
            setHasMore(false)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void load(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownerId, location?.country, location?.province, location?.area_type, location?.municipality, locale])

    async function handleAdd(id: number, nameForToast: string) {
        const isLoggedIn = await checkCustomerAuth()
        if (!isLoggedIn) {
            toast.error(t.login_required, { position: 'bottom-center' })
            router.push(`/${locale}/login`)
            return
        }
        try {
            await addItem(Number(id), 1)
            toast.success(`${nameForToast} ${t.added}`, { position: 'bottom-center' })
        } catch {
            toast.error(
                locale === 'en'
                    ? 'At the moment, you can’t add products to the cart.'
                    : 'En este momento no se pueden agregar productos al carrito.',
                { position: 'bottom-center' }
            )
        }
    }

    // ---------- UI ----------
    return (
        <section className="bg-white">
            {/* Header: flecha atrás + banner de ubicación + título */}
            <div className="px-4 md:px-12 lg:px-20 pt-6 pb-4">
                {/* Flecha atrás */}
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition mb-3"
                    aria-label={t.back}
                    title={t.back}
                >
                    <ArrowLeft size={18} />
                    <span className="underline underline-offset-2">{t.back}</span>
                </button>

                {/* Banner de ubicación (igual patrón que el ejemplo) */}
                {location && (
                    <div className="mb-2 text-xs text-gray-700">
                        {t.selected}:{' '}
                        <span className="font-medium">
                            {location.country === 'US'
                                ? t.country_us
                                : `${t.country_cu} · ${location.province || t.province_placeholder}${location.municipality ? ` / ${location.municipality}` : ''
                                } · ${location.area_type === 'municipio' ? t.location_municipality : t.location_city
                                }`}
                        </span>
                        {' · '}
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    // Usamos Event simple para evitar problemas de tipos en algunos navegadores
                                    window.dispatchEvent(new Event('location:open'))
                                } catch {
                                    /* noop */
                                }
                            }}
                            className="underline text-emerald-700 hover:text-emerald-800"
                            title={t.change}
                        >
                            {t.change}
                        </button>
                    </div>
                )}

                {/* Título */}
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    {t.heading}{' '}
                    {ownerName ? ownerName.toUpperCase() : `#${ownerId}`}
                </h1>
            </div>

            <div className="px-4 md:px-12 lg:px-20 pb-10">
                {loading && items.length === 0 ? (
                    <GridSkeleton />
                ) : items.length === 0 ? (
                    <div className="py-16 text-center text-gray-500">{t.empty}</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                            {items.map((p) => {
                                const name = p.name
                                const price = p.price
                                return (
                                    <article
                                        key={p.id}
                                        className="group rounded-lg border bg-white overflow-hidden hover:shadow-sm transition-shadow flex flex-col"
                                    >
                                        <Link
                                            href={`/${locale}/product/${p.id}`}
                                            prefetch={false}
                                            className="relative aspect-[4/3] bg-white block"
                                            aria-label={name}
                                        >
                                            <Image
                                                src={p.imageSrc || '/product.webp'}
                                                alt={name}
                                                fill
                                                sizes="(max-width: 640px) 45vw, (max-width:1024px) 25vw, 20vw"
                                                className="object-contain p-2"
                                                loading="lazy"
                                                decoding="async"
                                                draggable={false}
                                            />
                                        </Link>
                                        <div className="p-2 flex-1 flex flex-col">
                                            <Link href={`/${locale}/product/${p.id}`} prefetch={false}>
                                                <h4 className="text-[12px] md:text-[13px] font-semibold text-gray-900 line-clamp-2 hover:underline">
                                                    {name}
                                                </h4>
                                            </Link>
                                            <div className="mt-1 text-[12px] md:text-sm font-semibold text-emerald-700">
                                                {fmt.format(price)}
                                            </div>
                                            <button
                                                onClick={() => handleAdd(p.id, name)}
                                                className="mt-2 w-full bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition"
                                            >
                                                {t.addToCart}
                                            </button>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>

                        {hasMore && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => void load(page + 1)}
                                    className="px-5 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                                >
                                    {t.loadMore}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    )
}

function GridSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-white overflow-hidden">
                    <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
                    <div className="p-2 space-y-1.5">
                        <div className="h-3 bg-gray-100 rounded" />
                        <div className="h-3 w-1/2 bg-gray-100 rounded" />
                        <div className="h-7 bg-gray-100 rounded mt-1.5" />
                    </div>
                </div>
            ))}
        </div>
    )
}
