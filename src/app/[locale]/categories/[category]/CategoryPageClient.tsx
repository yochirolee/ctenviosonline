'use client'

import { useCart } from '@/context/CartContext'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

type Product = {
  id: string
  name: string
  price: number
  imageSrc: string
  quantity?: number
}

type Props = {
  params: { locale: string; category: string }
  dict: any
  products: Product[]
}

export default function CategoryPageClient({ params, dict, products }: Props) {
  const { addToCart, setIsCartOpen } = useCart()
  const router = useRouter()

  const handleAddToCart = (product: Product) => {
    addToCart({ ...product, quantity: 1 })
    toast.success(`${product.name} ${dict.cart.added || 'added to cart'}`)
    //setIsCartOpen(true)
  }

  return (
    <div className="p-4">
      {/* Botón estilizado de volver */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition mb-4"
      >
        <ArrowLeft size={18} />
        <span className="underline underline-offset-2">
          {dict.common?.back || 'Back'}
        </span>
      </button>

      <h1 className="text-2xl font-bold mb-4">
        {dict.categories.list[params.category as keyof typeof dict.categories.list] || params.category}
      </h1>

      {products.length === 0 ? (
        <p className="text-gray-500">{dict.categories.noProducts || 'No products found.'}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product.id} className="border p-2 rounded shadow-sm flex flex-col">
            <img
              src={product.imageSrc}
              alt={product.name}
              className="w-full h-40 object-cover w-full h-30 mb-2 md:object-contain"
            />
            <h2 className="text-base text-center font-semibold text-gray-800 line-clamp-2 mb-1">
              {product.name}
            </h2>
            <p className="text-green-700 text-center font-semibold text-sm mb-2">
              ${product.price.toFixed(2)}
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
