'use client'

import { useCart } from '@/context/CartContext'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { checkCustomerAuth } from '@/lib/auth'
import { getProductsByCategory, type DeliveryLocation } from '@/lib/products'
import { useLocation } from '@/context/LocationContext'

type Product = {
  id: number
  name: string
  price: number        // USD (ej: 100.00)
  imageSrc: string
  quantity?: number
  description?: string
}

type Dict = {
  cart?: {
    addToCart: string
    added: string
    search: string
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
  const { location } = useLocation() // <-- quitamos clearLocation (no usado)

  // Items que se muestran en la UI (inicialmente los que vienen del server)
  const [items, setItems] = useState<Product[]>(products)
  const [loading, setLoading] = useState(false)

  // Cuando cambia la ubicación, recargamos desde el backend con ?country=(...).
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const list = await getProductsByCategory(
          params.category,
          location as DeliveryLocation | undefined
        )
        if (!cancelled) setItems(list as Product[]) // <-- sin `any`
      } catch {
        if (!cancelled) setItems(products)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [params.category, location?.country, location?.province, location?.municipality, location?.area_type, products])

  const handleAddToCart = async (product: Product) => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(dict.cart?.login_required || 'You must be logged in to add products to your cart.', { position: 'bottom-center' })
      router.push(`/${params.locale}/login`)
      return
    }
    try {
      await addItem(Number(product.id), 1)
      toast.success(`${product.name} ${dict.cart?.added || 'added to cart'}`, { position: 'bottom-center' })
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
        type="text"
        placeholder={dict.cart?.search || 'Search prod...'}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 w-full md:w-1/2 px-3 py-2 border rounded"
      />

      {loading ? (
        <p className="text-gray-500">Cargando productos…</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-gray-500">{dict.categories.noProducts || 'No products found.'}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="border p-2 rounded shadow-sm flex flex-col">
              <img
                src={product.imageSrc}
                alt={product.name}
                className="w-full h-40 object-cover mb-2 md:object-contain"
              />
              <h2 className="text-base text-center font-semibold text-gray-800 line-clamp-2 mb-1">
                {product.name}
              </h2>

              {/* Descripción breve */}
              {product.description ? (
                <p className="text-xs text-gray-600 line-clamp-2 mb-2 text-center px-1">
                  {product.description}
                </p>
              ) : (
                <div className="h-1" />
              )}

              <p className="text-green-700 text-center font-semibold text-sm mb-2">
                {fmt.format(product.price)}
              </p>
              <button
                onClick={() => handleAddToCart(product)}
                className="mt-auto bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
              >
                {dict.cart?.addToCart || 'Add to cart'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
