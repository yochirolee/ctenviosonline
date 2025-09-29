'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'

import { useLocation } from '@/context/LocationContext'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'

import type { Dict as AppDict } from '@/types/Dict'
import type { OwnerGroup } from '@/lib/products'
import { getByOwners } from '@/lib/products'

export default function OwnersShowcase({ dict: _dict }: { dict: AppDict }) {
  void _dict
  const { locale } = useParams() as { locale: 'es' | 'en' }
  const router = useRouter()
  const { location } = useLocation()
  const { addItem } = useCart()

  const [groups, setGroups] = useState<OwnerGroup[]>([])
  const [loading, setLoading] = useState(true)

  const t = {
    title: locale === 'en' ? 'From our sellers' : 'De nuestros dueños',
    empty: locale === 'en' ? 'No items available.' : 'No hay productos disponibles.',
    viewAll: locale === 'en' ? 'View all' : 'Ver todos',
    addToCart: locale === 'en' ? 'Add to Cart' : 'Agregar al carrito',
    added: locale === 'en' ? 'added to the cart' : 'agregado al carrito',
    login_required:
      locale === 'en'
        ? 'You must be logged in to add products to your cart.'
        : 'Debes iniciar sesión para agregar productos a tu carrito.',
  }

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  // Cargar owners (varios por fila) y asegurar hasta 4 productos por owner
  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        setLoading(true)
        const loc = location
          ? {
              country: location.country,
              province: location.province,
              area_type: location.area_type,
              municipality: location.municipality,
            }
          : undefined

        // Traemos suficientes owners para llenar la sección con varias tarjetas
        const owners = await getByOwners(loc, {
          owners_limit: 9, // 2–3 filas en desktop
          per_owner: 4,    // **hasta 4 por owner**
        })
        if (!canceled) setGroups(owners)
      } catch {
        if (!canceled) setGroups([])
      } finally {
        if (!canceled) setLoading(false)
      }
    })()
    return () => { canceled = true }
  }, [location?.country, location?.province, location?.area_type, location?.municipality, locale])

  const handleAdd = useCallback(async (id: number, nameForToast: string) => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(t.login_required, { position: 'bottom-center' })
      router.push(`/${locale}/login`)
      return
    }
    try {
      await addItem(Number(id), 1)
      toast.success(`${nameForToast} ${t.added}`, { position: 'bottom-center' })
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
  }, [addItem, locale, router, t.added, t.login_required])

  return (
    <section className="bg-white">
      <div className="px-4 md:px-12 lg:px-20 pt-4 pb-2">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">{t.title}</h2>
      </div>

      <div className="px-4 md:px-12 lg:px-20 pb-6">
        {loading ? (
          <SkeletonGrid />
        ) : groups.length === 0 ? (
          <div className="py-16 text-center text-gray-500">{t.empty}</div>
        ) : (
          // === GRID DE OWNERS (2 cols en sm, 3 en lg) ===
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {groups.map((g) => (
              <OwnerPanel
                key={g.owner_id}
                g={g}
                locale={locale}
                fmt={fmt}
                onAdd={handleAdd}
                viewAllLabel={t.viewAll}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function OwnerPanel({
  g,
  locale,
  fmt,
  onAdd,
  viewAllLabel,
}: {
  g: OwnerGroup
  locale: 'es' | 'en'
  fmt: Intl.NumberFormat
  onAdd: (id: number, nameForToast: string) => void
  viewAllLabel: string
}) {
  // Hasta 4 productos por owner (si hay menos, mostramos los que existan sin “estirar”)
  const items = Array.isArray(g.products) ? g.products.slice(0, 4) : []

  return (
    <div className="rounded-xl border border-gray-200 bg-amber-50 p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-1">
          {g.owner_name || (locale === 'en' ? 'Seller' : 'Dueño')}
        </h3>

        {/* Ajusta esta ruta si tienes otra página/listado por owner */}
        <Link
          href={`/${locale}/owners/${g.owner_id}`}
          prefetch={false}
          className="text-emerald-700 text-sm hover:underline whitespace-nowrap"
        >
          {viewAllLabel}
        </Link>
      </div>

      {/* Grid interno de productos: 2x2 en móviles, fluido en pantallas mayores */}
      <div
        className="
          grid gap-3
          grid-cols-2
          sm:[grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]
        "
      >
        {items.map((p) => {
          const name =
            locale === 'en'
              ? (p.title_en?.trim() || p.title?.trim() || '')
              : (p.title?.trim() || p.title_en?.trim() || '')
          const price = Number(p.display_total_usd || 0)

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
                  src={p.image_url || '/product.webp'}
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
                  onClick={() => onAdd(p.id, name)}
                  className="mt-2 w-full bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition"
                >
                  {locale === 'en' ? 'Add to Cart' : 'Agregar al carrito'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-amber-50 p-3">
          <div className="h-5 w-40 bg-amber-100 animate-pulse rounded mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="rounded-lg border bg-white overflow-hidden">
                <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
                <div className="p-2 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded" />
                  <div className="h-7 bg-gray-100 rounded mt-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
