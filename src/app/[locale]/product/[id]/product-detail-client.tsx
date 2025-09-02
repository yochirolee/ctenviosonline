'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'

type ProductLike = {
  id: number
  name: string
  price: number
  imageSrc?: string
  description?: string
}

export default function ProductDetailClient({
  product,
  locale,
}: {
  product: ProductLike
  locale: string
}) {
  const { addItem } = useCart()
  const router = useRouter()

  const handleAdd = async () => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(
        locale === 'en'
          ? 'You must be logged in to add products to your cart.'
          : 'Debes iniciar sesión para agregar productos a tu carrito.',
        { position: 'bottom-center' }
      )
      router.push(`/${locale}/login`)
      return
    }
    try {
      await addItem(Number(product.id), 1)
      toast.success(
        locale === 'en'
          ? `${product.name} added to the cart`
          : `${product.name} agregado al carrito`,
        { position: 'bottom-center' }
      )
    } catch (e: unknown) {
      const err = (e ?? {}) as { code?: string; available?: number }
      if (err.code === 'OUT_OF_STOCK') {
        toast.error(
          locale === 'en'
            ? `Out of stock${Number.isFinite(err.available) ? ` (avail: ${err.available})` : ''}`
            : `Sin stock${Number.isFinite(err.available) ? ` (disp: ${err.available})` : ''}`,
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
  }

  return (
    <button
      onClick={handleAdd}
      className="w-full bg-green-600 text-white text-base py-3 rounded-lg hover:bg-green-700 transition"
    >
      {locale === 'en' ? 'Add to Cart' : 'Agregar al carrito'}
    </button>
  )
}
