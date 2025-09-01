'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCategories } from '@/lib/products'
import { useLocation } from '@/context/LocationContext'
import type { Dict } from '@/types/Dict'

type Category = { slug: string; image?: string }
type Props = { dict: Dict }

// Tipo esperado desde el backend
type RawCategory = { slug: string; image_url?: string | null }

export default function HeroCategories({ dict }: Props) {
  const { locale } = useParams() as { locale: string }
  const [cats, setCats] = useState<Category[]>([])
  const { location } = useLocation()

  // 👇 Al montar, abrir el selector si venimos de login/registro
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem('openLocationOnNextPage')
      if (flag === '1') {
        sessionStorage.removeItem('openLocationOnNextPage')
        window.dispatchEvent(new CustomEvent('location:open'))
      }
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const rows = (await getCategories()) as RawCategory[]
        const normalized: Category[] = rows
          .filter((c): c is RawCategory => !!c && typeof c.slug === 'string' && c.slug in dict.categories.list)
          .map((c) => ({
            slug: c.slug,
            image: c.image_url ?? undefined, // SOLO la URL que viene del backend
          }))
        if (mounted) setCats(normalized)
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [dict])

  if (cats.length === 0) return null
  const ABOVE_THE_FOLD_N = 6

  return (
    <section id="hero" className="py-8 px-4 md:px-12 lg:px-20 bg-white">
      {/* Faja de ubicación visible siempre */}
      <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          {location ? (
            <>
              <span className="font-medium">{dict.location_banner.location_selected}:</span>{' '}
              <span>
                {location.country === 'US'
                  ? 'Estados Unidos'
                  : `Cuba — ${location.province || 'provincia'}${
                      location.municipality ? ` / ${location.municipality}` : ''
                    } `}
              </span>
            </>
          ) : (
            <span className="font-medium">{dict.location_banner.location_select_required1}</span>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('location:open'))
              } catch {}
            }}
            className="underline text-emerald-800 hover:text-emerald-900"
          >
            {location ? dict.location_banner.location_selected_change : dict.location_banner.location_select}
          </button>
        </div>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{dict.categories.title}</h1>
        <p className="text-gray-600 text-sm mt-1">{dict.categories.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {cats.map((cat, idx) => (
          <Link
            key={cat.slug}
            href={`/${locale}/categories/${cat.slug}`}
            className="group block border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
          >
            <div className="relative h-28 sm:h-32 md:h-36 lg:h-40 bg-gray-100">
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={dict.categories.list[cat.slug as keyof typeof dict.categories.list]}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-cover"
                  priority={idx < ABOVE_THE_FOLD_N}
                  loading={idx < ABOVE_THE_FOLD_N ? 'eager' : undefined}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  Sin imagen
                </div>
              )}
            </div>
            <div className="p-2 text-center bg-white">
              <h2 className="text-sm font-semibold text-gray-800 group-hover:text-green-600">
                {dict.categories.list[cat.slug as keyof typeof dict.categories.list]}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
