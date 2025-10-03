'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useLocation } from '@/context/LocationContext'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'
import { searchProducts, type DeliveryLocation, type SimplifiedProduct } from '@/lib/products'
import { toast } from 'sonner'
import type { Dict } from '@/types/Dict'

export default function GlobalSearch(props: { dict: Dict }) {
  const pathname = usePathname()
  const isSearchPage = pathname?.split('/')[2] === 'search'
  if (isSearchPage) return null
  return <GlobalSearchInner {...props} />
}

function GlobalSearchInner({ dict }: { dict: Dict }) {
  const pathname = usePathname()
  const { locale } = useParams() as { locale: string }
  const { location } = useLocation()
  const { addItem } = useCart()
  const router = useRouter()

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SimplifiedProduct[]>([])
  const [open, setOpen] = useState(false)

  const basePlaceholder =
    dict?.cart?.search || (locale === 'en' ? 'Search product...' : 'Buscar producto...')

  const [typedPh, setTypedPh] = useState<string>('')         // placeholder “escribiéndose”
  const phTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)


  useEffect(() => {
    setOpen(false)
    setQ('')
    setResults([])
  }, [pathname])

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!open) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const term = q.trim()
      if (!term) { setResults([]); return }
      setLoading(true)
      try {
        const rows = await searchProducts(
          term,
          location as DeliveryLocation | undefined,
          { limit: 12 },
          locale === 'en' ? 'en' : 'es'
        )
        setResults(rows)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [q, open, location, locale])
    // Placeholder con efecto de tipeo
    useEffect(() => {
      // si el usuario está escribiendo, no animar
      if (q.trim()) {
        if (phTimerRef.current) clearInterval(phTimerRef.current)
        setTypedPh('')
        return
      }
  
      // respetar "prefers-reduced-motion"
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
      if (reduce) {
        setTypedPh(basePlaceholder)
        return
      }
  
      // reset e inicia desde 0
      if (phTimerRef.current) clearInterval(phTimerRef.current)
      setTypedPh('')
  
      let i = 0
      const speedMs = 45 // velocidad de tipeo (ms por letra)
      phTimerRef.current = setInterval(() => {
        i += 1
        setTypedPh(basePlaceholder.slice(0, i))
        if (i >= basePlaceholder.length && phTimerRef.current) {
          clearInterval(phTimerRef.current)
          phTimerRef.current = null
        }
      }, speedMs)
  
      return () => {
        if (phTimerRef.current) clearInterval(phTimerRef.current)
      }
    }, [basePlaceholder, q])
  

  const handleAdd = async (p: SimplifiedProduct) => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(
        dict?.cart?.login_required ||
        (locale === 'en'
          ? 'You must be logged in to add products to your cart.'
          : 'Debes iniciar sesión para agregar productos.'),
        { position: 'bottom-center' }
      )
      router.push(`/${locale}/login`)
    } else {
      try {
        await addItem(Number(p.id), 1)
        toast.success(
          `${dict?.cart?.added || (locale === 'en' ? 'Product added to the cart' : 'Producto agregado al carrito')}`,
          { position: 'bottom-center' }
        )
      } catch {
        toast.error(
          locale === 'en' ? 'Error adding to cart' : 'Error agregando al carrito',
          { position: 'bottom-center' }
        )
      }
    }
  }

  const onSeeAll = () => {
    const params = new URLSearchParams()
    const term = q.trim()
    if (term) params.set('q', term)
    router.push(`/${locale}/search?${params.toString()}`)
  }

  return (
    <section className="bg-white px-4 md:px-12 lg:px-20 pt-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative">
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true) }}
              placeholder={typedPh || basePlaceholder}
              className="w-full outline-none text-base md:text-sm"
            />
            {q && (
              <button
                onClick={() => { setQ(''); setResults([]) }}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onSeeAll}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
              title={locale === 'en' ? 'See all results' : 'Ver todos los resultados'}
            >
              {locale === 'en' ? 'See all' : 'Ver todos'}
            </button>
          </div>

          {open && (q || loading) && (
            <div className="absolute z-40 mt-2 w-full bg-white border rounded-xl shadow-lg p-2">
              {loading ? (
                <div className="p-3 text-sm text-gray-500">
                  {dict?.common?.loading || (locale === 'en' ? 'Loading...' : 'Cargando...')}
                </div>
              ) : results.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  {locale === 'en' ? 'No results.' : 'Sin resultados.'}
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[60vh] overflow-auto">
                  {results.map((p) => (
                    <li key={p.id} className="border rounded-lg overflow-hidden bg-white flex">
                      {/* Imagen clickeable → detalle */}
                      <Link
                        href={`/${locale}/product/${p.id}`}
                        prefetch={false}
                        className="w-20 h-20 bg-gray-50 flex-shrink-0 relative"
                        title={p.name}
                        aria-label={p.name}
                      >
                        <Image
                          src={p.imageSrc}
                          alt={p.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      <div className="p-2 flex flex-col grow min-w-0">
                        {/* Título clickeable → detalle */}
                        <Link href={`/${locale}/product/${p.id}`} prefetch={false} className="block">
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:underline" title={p.name}>
                            {p.name}
                          </h4>
                        </Link>

                        {p.description ? (
                          <p className="text-[11px] text-gray-600 line-clamp-1">{p.description}</p>
                        ) : <span className="h-[14px]" />}

                        <div className="mt-auto flex items-center gap-2">
                          <span className="text-green-700 font-semibold text-sm">{fmt.format(p.price)}</span>
                          <button
                            onClick={() => handleAdd(p)}
                            className="ml-auto bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700"
                          >
                            {dict?.cart?.addToCart || (locale === 'en' ? 'Add to Cart' : 'Agregar')}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}