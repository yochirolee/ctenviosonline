'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Flame } from 'lucide-react'
import { useLocation } from '@/context/LocationContext'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'
import { getBestSellers, type DeliveryLocation, type SimplifiedProduct } from '@/lib/products'
import type { Dict } from '@/types/Dict'

type BestItem = SimplifiedProduct & { sold_qty?: number }

export default function BestSellers({ dict }: { dict: Dict }) {
  const { locale } = useParams() as { locale: string }
  const { location } = useLocation()
  const { addItem } = useCart()
  const router = useRouter()

  const [items, setItems] = useState<BestItem[]>([])
  const [loading, setLoading] = useState(true)

  const t = {
    title: dict?.bestsellers?.title ?? (locale === 'en' ? 'Best Sellers' : 'Más vendidos'),
    subtitle:
      dict?.bestsellers?.subtitle ??
      (locale === 'en' ? 'What people loved recently' : 'Lo que más compran últimamente'),
    addToCart: dict?.cart?.addToCart ?? (locale === 'en' ? 'Add to Cart' : 'Agregar al carrito'),
    added: dict?.cart?.added ?? (locale === 'en' ? 'added to the cart' : 'agregado al carrito'),
    login_required:
      dict?.cart?.login_required ??
      (locale === 'en'
        ? 'You must be logged in to add products to your cart.'
        : 'Debes iniciar sesión para agregar productos a tu carrito.'),
    empty: locale === 'en' ? 'No best sellers yet.' : 'Aún no hay más vendidos.',
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const list = await getBestSellers(location as DeliveryLocation | undefined, { limit: 12, days: 60 })
        if (!cancelled) setItems(list)
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [location?.country, location?.province, location?.municipality, location?.area_type])

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  const handleAdd = async (p: BestItem) => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(t.login_required)
      router.push(`/${locale}/login`)
      return
    }
    try {
      await addItem(Number(p.id), 1)
      toast.success(`${p.name} ${t.added}`)
    } catch {
      toast.error(locale === 'en' ? 'Error adding to cart' : 'Error agregando al carrito')
    }
  }

  return (
    <section className="py-8 px-4 md:px-12 lg:px-20 bg-white">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <Flame className="text-orange-500" /> {t.title}
        </h2>
        <p className="text-gray-600 text-sm mt-1">{t.subtitle}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-xl overflow-hidden shadow-sm">
              <div className="h-36 bg-gray-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                <div className="h-9 bg-gray-100 rounded mt-2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-gray-500">{t.empty}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {items.map((p) => (
            <article key={p.id} className="border rounded-xl overflow-hidden shadow-sm bg-white flex flex-col">
              <div className="relative h-36 bg-gray-50">
                <img src={p.imageSrc} alt={p.name} className="w-full h-full object-cover" loading="lazy" />

                {(() => {
                  const sold = Number((p as any).sold_qty ?? 0); // 👈 fuerza a número
                  return sold > 0 ? (
                    <span className="absolute top-2 left-2 text-[11px] bg-orange-500 text-white px-2 py-0.5 rounded-full">
                      {locale === 'en' ? `Sold ${sold}+` : `Vendidos ${sold}+`}
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="p-3 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{p.name}</h3>
                {p.description ? (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{p.description}</p>
                ) : <span className="mt-1" />}
                <div className="mt-2 text-green-700 font-semibold text-sm">{fmt.format(p.price)}</div>
                <button
                  onClick={() => handleAdd(p)}
                  className="mt-3 bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition"
                >
                  {t.addToCart}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
