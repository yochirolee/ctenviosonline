'use client'

import { useCart } from '@/context/CartContext'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { checkCustomerAuth } from '@/lib/auth'

type Product = {
  id: number         
  name: string
  price: number        
  imageSrc: string
  quantity?: number
}

type Dict = {
  cart?: {
    addToCart: string
    added: string
    search: string
    login_required?: string
  }
  common?: {
    back: string
  }
  categories: {
    list: Record<string, string>
    noProducts: string
  }
}

type Props = {
  params: { locale: string; category: string }
  dict: Dict
  products: Product[]
}

export default function CategoryPageClient({ params, dict, products }: Props) {
  const { addItem } = useCart()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const handleAddToCart = async (product: Product) => {
    const isLoggedIn = await checkCustomerAuth()
  
    if (!isLoggedIn) {
      toast.error(dict.cart?.login_required || 'You must be logged in to add products to your cart.')
      router.push(`/${params.locale}/login`)
      return
    }
  
    try {
      await addItem(Number(product.id), 1, product.price) // 👈 clave
      toast.success(`${product.name} ${dict.cart?.added || 'added to cart'}`)
    } catch {
      toast.error('Error adding product to cart')
    }
  }
  

  const filteredProducts = products.filter(
    (product) =>
      typeof product.name === 'string' &&
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

      {filteredProducts.length === 0 ? (
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
              <p className="text-green-700 text-center font-semibold text-sm mb-2">
                ${(product.price / 100).toFixed(2)}
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
