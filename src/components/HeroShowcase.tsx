'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocation } from '@/context/LocationContext'
import type { Dict } from '@/types/Dict'


type Slide = {
  id: string
  image: string
  alt: string
  // textos por idioma
  title_en: string
  title_es: string
  subtitle_en?: string
  subtitle_es?: string
  ctaLabel_en?: string
  ctaLabel_es?: string
  // destino relativo (sin /en o /es)
  baseHref: string
  align?: 'left' | 'center' | 'right'
}

type Props = { className?: string; autoPlayMs?: number, dict:Dict }

const SLIDES: Slide[] = [
    {
      id: 's1',
      image: '/products5.png',
      alt: 'Curated picks delivered fast',
      title_en: 'What you need, when you need it',
      subtitle_en: 'Picks for you with quick delivery options',
      title_es: 'Lo que necesitas, justo a tiempo',
      subtitle_es: 'Selecciones para ti con opciones de entrega rápida',
      ctaLabel_en: 'Shop Now',
      ctaLabel_es: 'Comprar ahora',
      baseHref: 'categories/h24',
      align: 'left',
    },
    {
      id: 's2',
      image: '/product4.png',
      alt: 'Home upgrades',
      title_en: 'Refresh your space',
      subtitle_en: 'Small upgrades, big comfort',
      title_es: 'Renueva tu hogar',
      subtitle_es: 'Pequeños cambios, gran confort',
      ctaLabel_en: 'Discover',
      ctaLabel_es: 'Descubrir',
      baseHref: 'categories/appliances',
      align: 'center',
    },
    {
      id: 's3',
      image: '/cafe2.png',
      alt: 'Coffee & groceries',
      title_en: 'Amazing moments',
      subtitle_en: 'Find what you love',
      title_es: 'Comida, café y más',
      subtitle_es: 'Encuentra aquello que amas',
      ctaLabel_en: 'Explore',
      ctaLabel_es: 'Explorar',
      baseHref: 'categories/food',
      align: 'right',
    },
  ]
  
  

export default function HeroShowcase({ className, autoPlayMs = 7000, dict  }: Props) {
  const { locale } = useParams() as { locale: 'en' | 'es' }
  const { location } = useLocation()

  useEffect(() => {
    try {
      const flag = sessionStorage.getItem('openLocationOnNextPage')
      if (flag === '1') {
        sessionStorage.removeItem('openLocationOnNextPage')
        window.dispatchEvent(new CustomEvent('location:open'))
      }
    } catch {}
  }, [])

  const t = (s: Slide) => ({
    title: locale === 'en' ? s.title_en : s.title_es,
    subtitle: locale === 'en' ? s.subtitle_en : s.subtitle_es,
    cta: locale === 'en' ? (s.ctaLabel_en ?? 'Shop Now') : (s.ctaLabel_es ?? 'Comprar'),
    href: `/${locale}/${s.baseHref}`,
  })

  const [i, setI] = useState(0)
  const timer = useRef<number | null>(null)
  const go = (n: number) =>
    setI(((n % SLIDES.length) + SLIDES.length) % SLIDES.length)
  const next = () => go(i + 1)
  const prev = () => go(i - 1)

  useEffect(() => {
    if (!autoPlayMs || SLIDES.length < 2) return
    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(next, autoPlayMs)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [i, autoPlayMs])

  // swipe móvil
  const startX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return
    const d = e.changedTouches[0].clientX - startX.current
    if (Math.abs(d) > 40) (d < 0 ? next() : prev())
    startX.current = null
  }

  return (
    <section className={`relative w-full overflow-hidden bg-white ${className ?? ''}`} aria-roledescription="carousel">
       <div id="heroloc" className="py-8 px-4 md:px-12 lg:px-20 bg-white scroll-mt-24">
 {/* Faja de ubicación con altura reservada (evita CLS) */}
 <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900
                      flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-h-[48px]">
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
            onClick={() => { try { window.dispatchEvent(new CustomEvent('location:open')) } catch {} }}
            className="underline text-emerald-800 hover:text-emerald-900"
          >
            {location ? dict.location_banner.location_selected_change : dict.location_banner.location_select}
          </button>
        </div>
      </div>
       </div>
      

      <div
        className="relative mx-auto max-w-[1400px]
                   h-[42vh] sm:h-[56vh] lg:h-[68vh] xl:h-[72vh]
                   min-h-[280px] lg:max-h-[720px]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute inset-0 flex transition-transform duration-700 ease-out"
             style={{ transform: `translateX(-${i * 100}%)` }}>
          {SLIDES.map((s) => {
            const tt = t(s)
            return (
              <div key={s.id} className="relative min-w-full h-full">
                <Image src={s.image} alt={s.alt} fill priority className="object-cover" sizes="100vw" />
                {(tt.title || tt.subtitle) && (
                  <div className={`absolute inset-0 flex items-center p-4 sm:p-8 lg:p-12 ${
                      s.align === 'center' ? 'justify-center text-center'
                    : s.align === 'right'  ? 'justify-end text-right'
                    : 'justify-start text-left'
                  }`}>
                    <div className="max-w-xl text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                      {tt.title && <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">{tt.title}</h2>}
                      {tt.subtitle && <p className="mt-2 text-sm sm:text-base lg:text-lg">{tt.subtitle}</p>}
                      <Link href={tt.href} className="mt-5 inline-block rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
                        {tt.cta}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {SLIDES.length > 1 && (
          <>
            <button aria-label="Previous slide" onClick={prev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 hover:bg-white shadow">
              <ChevronLeft className="h-5 w-5 text-gray-800" />
            </button>
            <button aria-label="Next slide" onClick={next}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 hover:bg-white shadow">
              <ChevronRight className="h-5 w-5 text-gray-800" />
            </button>
          </>
        )}

        {SLIDES.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {SLIDES.map((_, idx) => (
              <button key={idx} onClick={() => go(idx)} aria-label={`Go to slide ${idx + 1}`}
                className={`h-2.5 w-2.5 rounded-full border ${idx === i ? 'bg-green-600 border-green-600' : 'bg-white/70 border-white'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
