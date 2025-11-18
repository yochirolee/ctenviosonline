'use client'

import { useCart } from '@/context/CartContext'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react' // + useRef
import { checkCustomerAuth } from '@/lib/auth'
import { getProductsByCategory, type DeliveryLocation } from '@/lib/products'
import { useLocation } from '@/context/LocationContext'
import Link from 'next/link'

type Product = {
  id: number
  name: string
  price: number        // USD (ej: 100.00)
  imageSrc: string
  quantity?: number
  description?: string
  link?: string | null
}

type Dict = {
  cart?: {
    addToCart: string
    added: string
    search: string
    search_in_category: string
    login_required?: string
  }
  common?: { back: string }
  categories: { list: Record<string, string>; noProducts: string }
  location_banner: {
    location_selected: string
    location_selected_change: string
    country_us: string
    country_cu: string
    province_placeholder: string
    municipality_placeholder: string
    change: string
    location_municipality: string
    location_city: string
  }
}

type Props = {
  params: { locale: string; category: string }
  dict: Dict
  products: Product[]                 // productos iniciales del server (sin filtrar por ubicación)
}

export default function CategoryPageClient({ params, dict, products }: Props) {
  const { addItem } = useCart()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const { location } = useLocation()

  // Placeholder animado (typewriter)
  const basePlaceholder =
    dict.cart?.search_in_category || (params.locale === 'en'
      ? 'Search product in this category...'
      : 'Buscar producto en esta categoría...')
  const [typedPh, setTypedPh] = useState<string>('')
  const phTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Items que se muestran en la UI (inicialmente los que vienen del server)
  const [items, setItems] = useState<Product[]>(products)
  const [loading, setLoading] = useState(false)

  // Carga según ubicación
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const list = await getProductsByCategory(
          params.category,
          location as DeliveryLocation | undefined,
          params.locale === 'en' ? 'en' : 'es'
        )
        if (!cancelled) setItems(list as Product[])
      } catch {
        if (!cancelled) setItems(products)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [params.category, params.locale, location?.country, location?.province, location?.municipality, location?.area_type, products])

  // Typewriter del placeholder (se pausa si el usuario escribe)
  useEffect(() => {
    if (searchTerm.trim()) {
      if (phTimerRef.current) clearInterval(phTimerRef.current)
      setTypedPh('')
      return
    }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setTypedPh(basePlaceholder)
      return
    }

    if (phTimerRef.current) clearInterval(phTimerRef.current)
    setTypedPh('')

    let i = 0
    const speedMs = 45
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
  }, [basePlaceholder, searchTerm])

  const handleAddToCart = async (product: Product) => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(dict.cart?.login_required || 'You must be logged in to add products to your cart.', { position: 'bottom-center' })
      router.push(`/${params.locale}/login`)
      return
    }
    try {
      await addItem(Number(product.id), 1)
      toast.success(`${dict.cart?.added || 'Product added to cart'}`, { position: 'bottom-center' })
    } catch {
      toast.error(params.locale === 'en' ? 'At the moment, you can’t add products to the cart.' : 'En este momento no se pueden agregar productos al carrito.', { position: 'bottom-center' })
    }
  }

  const filteredProducts = useMemo(() => {
    const s = searchTerm.trim().toLowerCase()
    const base = items || []
    if (!s) return base
    return base.filter((p) => typeof p.name === 'string' && p.name.toLowerCase().includes(s))
  }, [items, searchTerm])

  const fmt = new Intl.NumberFormat(params.locale || 'es', { style: 'currency', currency: 'USD' })

  return (
    <div className="p-4">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition mb-4"
      >
        <ArrowLeft size={18} />
        <span className="underline underline-offset-2">
          {dict.common?.back || 'Back'}
        </span>
      </button>

      {/* Faja informativa de ubicación actual (si existe) */}
      {location && (
        <div className="mb-3 text-xs text-gray-700">
          {dict.location_banner.location_selected}:{' '}
          <span className="font-medium">
            {location.country === 'US'
              ? dict.location_banner.country_us
              : `${dict.location_banner.country_cu} · ${location.province || dict.location_banner.province_placeholder}${location.municipality ? ` / ${location.municipality}` : ''
              } · ${location.area_type === 'municipio'
                ? dict.location_banner.location_municipality
                : dict.location_banner.location_city
              }`}
          </span>
          {' · '}
          <button
            type="button"
            onClick={() => {
              try { window.dispatchEvent(new CustomEvent('location:open')) } catch { }
            }}
            className="underline text-emerald-700 hover:text-emerald-800"
            title={dict.location_banner.location_selected_change}
          >
            {dict.location_banner.change}
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-2">
        {dict.categories.list[params.category as keyof typeof dict.categories.list] || params.category}
      </h1>

      <input
        type="search"
        placeholder={typedPh || basePlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 w-full md:w-1/2 px-3 py-2 border rounded text-base"
      />

      {loading ? (
        <p className="text-gray-500">Cargando productos…</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-gray-500">{dict.categories.noProducts || 'No products found.'}</p>
      ) : (
        // En pantallas grandes mostrar 6 productos
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredProducts.map((product) => {
            const hasExternalLink = !!product.link && product.link.trim() !== ''
            const href = hasExternalLink
              ? product.link!.trim()
              : `/${params.locale}/product/${product.id}`

            return (
              <article
                key={product.id}
                className="rounded shadow-sm border bg-white flex flex-col overflow-hidden"
              >
                {/* Imagen: si tiene link externo, usamos <a>; si no, <Link> interno */}
                {hasExternalLink ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-[4/3] bg-gray-50 block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.imageSrc}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-contain p-2"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <Link
                    href={href}
                    className="relative aspect-[4/3] bg-gray-50 block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.imageSrc}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-contain p-2"
                      loading="lazy"
                    />
                  </Link>
                )}

                {/* Contenido */}
                <div className="p-2 flex-1 flex flex-col">
                  {/* Título: mismo criterio, externo vs interno */}
                  {hasExternalLink ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <h2 className="text-sm text-center font-semibold text-gray-800 line-clamp-2 hover:underline">
                        {product.name}
                      </h2>
                    </a>
                  ) : (
                    <Link href={href}>
                      <h2 className="text-sm text-center font-semibold text-gray-800 line-clamp-2 hover:underline">
                        {product.name}
                      </h2>
                    </Link>
                  )}

                  {/* Descripción breve */}
                  {product.description ? (
                    <p className="text-xs text-gray-600 line-clamp-3 mt-1 text-center px-1">
                      {product.description}
                    </p>
                  ) : (
                    <span className="mt-1" />
                  )}

                  {hasExternalLink ? (<p className="mt-1 text-[11px] text-gray-500 leading-tight text-center">
                    {params.locale === 'en'
                      ? 'As an Amazon Associate, we earn from qualifying purchases.'
                      : 'Como afiliados de Amazon, ganamos comisiones por compras calificadas.'}
                  </p>) : null}

                  {/* Footer pegado abajo: precio + botón */}
                  <div className="mt-auto pt-2">
                    <p className="text-green-700 text-center font-semibold text-sm">
                      {fmt.format(product.price)}
                    </p>

                    {hasExternalLink ? (
                      // Si tiene link externo, en lugar de "Agregar al carrito" mandamos a Amazon
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex w-full items-center justify-center bg-amber-600 text-white py-2 rounded hover:bg-amber-700 transition text-sm"
                      >
                        {params.locale === 'en' ? 'View on Amazon' : 'Ver en Amazon'}
                      </a>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="mt-2 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                      >
                        {dict.cart?.addToCart || 'Add to cart'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}


        </div>
      )}
    </div>
  )
}
