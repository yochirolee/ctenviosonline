'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocation } from '@/context/LocationContext'
import { getBestSellers, type DeliveryLocation, type SimplifiedProduct } from '@/lib/products'

import Link from 'next/link'
import Image from 'next/image'

type BestItem = SimplifiedProduct

export default function RecomendadosTiles( ) {
  const { locale } = useParams() as { locale: string }
  const { location } = useLocation()

  const [items, setItems] = useState<BestItem[]>([])
  const [loading, setLoading] = useState(true)

  const t = {
    title:  (locale === 'en' ? 'Recommended for you' : 'Recomendados'),
    empty: locale === 'en' ? 'No recommendations yet.' : 'Aún no hay recomendados.',
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
    ;(async () => {
      try {
        setLoading(true)
        const list = await getBestSellers(loc, { limit: 8, days: 60 }, locale === 'en' ? 'en' : 'es')
        if (!cancelled) setItems((list ?? []).slice(0, 4))
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [loc, locale])

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  const BG = ['bg-amber-100', 'bg-yellow-100', 'bg-emerald-50', 'bg-orange-50', 'bg-sky-50', 'bg-amber-50']

  return (
    <section className="h-svh overflow-hidden bg-white">
      <div className="px-4 md:px-12 lg:px-20 pt-3 pb-2">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">{t.title}</h2>
      </div>

      <div className="px-4 md:px-12 lg:px-20 h-[calc(100svh-56px-44px)] md:h-[calc(100svh-64px-52px)]">
        {loading ? (
          <div className="grid h-full grid-cols-2 md:grid-cols-12 grid-rows-4 md:grid-rows-6 gap-2 md:gap-4">
            <div className="col-span-2 md:col-span-7 md:row-span-3 rounded-xl animate-pulse bg-amber-100" />
            <div className="col-span-1 md:col-span-5 md:row-span-3 rounded-xl animate-pulse bg-yellow-100" />
            <div className="col-span-1 md:col-span-5 md:row-span-3 rounded-xl animate-pulse bg-emerald-50" />
            <div className="col-span-1 md:col-span-7 md:row-span-3 rounded-xl animate-pulse bg-orange-50" />
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">{t.empty}</div>
        ) : (
          <>
            {/* MÓVIL: 2 cols x 4 filas (todas visibles, fotos siempre aparecen) */}
            <div className="grid md:hidden h-full grid-cols-2 grid-rows-4 gap-2">
              {/* #0 ancho arriba (2x2) */}
              <Tile p={items[0]} locale={locale} fmt={fmt} className={`${BG[0 % BG.length]}`} style={{ gridColumn: '1 / span 2', gridRow: '1 / span 2' }} />
              {/* #1 alto izq (1x2) */}
              <Tile p={items[1]} locale={locale} fmt={fmt} className={`${BG[1 % BG.length]}`} style={{ gridColumn: '1 / span 1', gridRow: '3 / span 2' }} />
              {/* #2 derecha arriba (1x1) compacto */}
              <Tile p={items[2]} locale={locale} fmt={fmt} className={`${BG[2 % BG.length]}`} style={{ gridColumn: '2 / span 1', gridRow: '3 / span 1' }} compact />
              {/* #3 derecha abajo (1x1) compacto */}
              <Tile p={items[3]} locale={locale} fmt={fmt} className={`${BG[3 % BG.length]}`} style={{ gridColumn: '2 / span 1', gridRow: '4 / span 1' }} compact />
            </div>

            {/* DESKTOP: ninguna card ocupa todo el viewport */}
            <div className="hidden md:grid h-full grid-cols-12 grid-rows-6 gap-4">
              {/* #0  (7x3) */}
              <Tile p={items[0]} locale={locale} fmt={fmt} className={`${BG[0 % BG.length]}`} style={{ gridColumn: '1 / span 7', gridRow: '1 / span 3' }} />
              {/* #1  (5x3) */}
              <Tile p={items[1]} locale={locale} fmt={fmt} className={`${BG[1 % BG.length]}`} style={{ gridColumn: '8 / span 5', gridRow: '1 / span 3' }} />
              {/* #2  (5x3) */}
              <Tile p={items[2]} locale={locale} fmt={fmt} className={`${BG[2 % BG.length]}`} style={{ gridColumn: '1 / span 5', gridRow: '4 / span 3' }} />
              {/* #3  (7x3) — NO ocupa 12 cols ni 6 filas */}
              <Tile p={items[3]} locale={locale} fmt={fmt} className={`${BG[3 % BG.length]}`} style={{ gridColumn: '6 / span 7', gridRow: '4 / span 3' }} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}


/* ---- Card: imagen arriba (con aspecto fijo en móvil) + texto debajo ---- */
function Tile({
  p,
  locale,
  fmt,
  className,
  style,
  compact = false,
}: {
  p: BestItem
  locale: string
  fmt: Intl.NumberFormat
  className?: string
  style?: React.CSSProperties
  compact?: boolean
}) {
  return (
    <Link
      href={`/${locale}/product/${p.id}`}
      prefetch={false}
      // IMPORTANTE: pasamos a flex-col (no grid)
      className={`group rounded-xl overflow-hidden ring-1 ring-black/5 ${className} flex flex-col`}
      style={style}
      aria-label={p.name}
    >
      {/* Imagen:
          - En móvil: altura definida por relación de aspecto (no se come el texto).
          - En desktop: crece para ocupar el espacio disponible del tile. */}
      <div
        className={[
          'relative overflow-hidden',
          compact ? 'aspect-[5/4]' : 'aspect-[16/10]', // móvil: asegura espacio de imagen
          'md:aspect-auto md:flex-1 md:min-h-[120px]', // desktop: rellena alto del tile
        ].join(' ')}
      >
        <Image
          src={p.imageSrc}
          alt={p.name}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 35vw, 25vw"
          className={`object-contain ${compact ? 'p-2' : 'p-2'} md:p-4 transition-transform duration-300 ${
            compact ? '' : 'md:group-hover:scale-[1.02]'
          }`}
          loading="lazy"
          fetchPriority="low"
          decoding="async"
          draggable={false}
        />
      </div>

      {/* Texto: SIEMPRE debajo de la imagen */}
      <div className="px-2.5 md:px-3 pt-2 md:pt-3 pb-2.5 md:pb-3">
        <h3
          className={`font-semibold text-gray-900 ${
            compact ? 'text-[12px] leading-tight line-clamp-1' : 'text-[13px] md:text-base line-clamp-2'
          } group-hover:underline underline-offset-4`}
        >
          {p.name}
        </h3>

        {!compact && p.description && (
          <p className="mt-0.5 text-[12px] md:text-sm text-gray-700 line-clamp-2">{p.description}</p>
        )}

        <div className={`mt-1 font-semibold text-emerald-700 ${compact ? 'text-[12px]' : 'text-[13px] md:text-sm'}`}>
          {fmt.format(p.price)}
        </div>
      </div>
    </Link>
  )
}




