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
    added: locale === 'en' ? 'Product added to the cart' : 'Producto agregado al carrito',
    login_required:
      locale === 'en'
        ? 'You must be logged in to add products to your cart.'
        : 'Debes iniciar sesión para agregar productos a tu carrito.',
  }

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  useEffect(() => {
    let canceled = false
      ; (async () => {
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

          const owners = await getByOwners(loc, {
            owners_limit: 12, // margen para 3x4 si hay data
            per_owner: 6,     // hasta 6 productos por owner
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

  const handleAdd = useCallback(async (id: number) => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(t.login_required, { position: 'bottom-center' })
      router.push(`/${locale}/login`)
      return
    }
    try {
      await addItem(Number(id), 1)
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
          /* Contenedor centrado: móvil 1 col, tablet 2 col, desktop 3 col si hay espacio */
          <div className="mx-auto max-w-screen-2xl">
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
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
  const items = Array.isArray(g.products) ? g.products.slice(0, 4) : []

  return (
    /* Anchos fijos responsivos → determinan columnas y permiten centrar última fila */
    <div className="
      w-full
      md:w-[360px]
      lg:w-[380px]
      xl:w-[400px]
      rounded-2xl border border-emerald-100 bg-emerald-50 p-4
      shadow-[0_1px_0_rgba(16,185,129,0.1)]
    ">
      {/* Header centrado y en mayúsculas */}
      <div className="mb-3">
        <h3 className="text-center text-sm md:text-base font-extrabold tracking-wide text-emerald-900 uppercase">
          {g.owner_name ? g.owner_name : (locale === 'en' ? 'Seller' : 'Dueño')}
        </h3>
        <div className="mt-1 text-center">
          <Link
            href={`/${locale}/owners/${g.owner_id}`}
            prefetch={false}
            className="inline-block text-emerald-700 text-xs md:text-sm hover:underline"
          >
            {viewAllLabel}
          </Link>
        </div>
      </div>

      {/* Grid interno: 2 cols móvil, 3 cols lg; solo 4 visibles en móvil, 6 en lg */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-2 items-stretch [&>*:nth-child(n+5)]:hidden lg:[&>*:nth-child(n+5)]:block">

        {items.map((p) => {
          const name =
            locale === 'en'
              ? (p.title_en?.trim() || p.title?.trim() || '')
              : (p.title?.trim() || p.title_en?.trim() || '')
          const price = Number(p.display_total_usd || 0)

          return (
            <article
              key={p.id}
              className="group h-full rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col"
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
                  sizes="(max-width: 640px) 45vw, (max-width:1024px) 25vw, 18vw"
                  className="object-contain p-2"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </Link>

              <div className="p-2 flex-1 flex flex-col">
                <Link href={`/${locale}/product/${p.id}`} prefetch={false}>
                  <h4
                    className="
                    text-sm leading-5 font-semibold text-gray-900 hover:underline
                    line-clamp-2 h-[2.5rem] overflow-hidden break-words
                        "
                  >
                    {name}
                  </h4>
                </Link>

                {/* Footer SIEMPRE abajo */}
                <div className="mt-auto pt-1">
                  <div className="text-[12px] md:text-sm font-semibold text-emerald-700 text-center">
                    {fmt.format(price)}
                  </div>
                  <button
                    onClick={() => onAdd(p.id, name)}
                    className="mt-2 w-full bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition"
                  >
                    {locale === 'en' ? 'Add to Cart' : 'Agregar al carrito'}
                  </button>
                </div>
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
    <div className="mx-auto max-w-screen-2xl">
      <div className="flex flex-wrap justify-center gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-full md:w-[360px] lg:w-[380px] xl:w-[400px] rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
          >
            <div className="h-5 w-40 bg-emerald-100/60 animate-pulse rounded mb-3 mx-auto" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((__, j) => (
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
    </div>
  )
}
