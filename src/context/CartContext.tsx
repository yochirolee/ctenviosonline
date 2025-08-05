'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { getOrCreateCart } from '@/lib/medusa/cart'
import { useCustomer } from './CustomerContext'

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

type LineItem = {
  id: string
  title: string
  quantity: number
  unit_price: number
  thumbnail?: string
}

interface CartContextType {
  cartId: string | null
  items: LineItem[]
  isCartOpen: boolean
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>
  addItem: (variantId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  loading: boolean
}

const CartContext = createContext<CartContextType>({
  cartId: null,
  items: [],
  isCartOpen: false,
  setIsCartOpen: () => {},
  addItem: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  loading: true,
})

export const useCart = () => useContext(CartContext)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { customer, loading: customerLoading } = useCustomer()

  const fetchCart = async () => {
    try {
      setLoading(true)

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const { id } = await getOrCreateCart(customer?.id || undefined)
      setCartId(id)

      const headers: Record<string, string> = {
        'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY || '',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${API_URL}/store/carts/${id}`, { headers })

      if (!res.ok) {
        throw new Error('No se pudo cargar el carrito')
      }

      const data = await res.json()
      setItems(data.cart.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (variantId: string, quantity = 1) => {
    if (!cartId) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY || '',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_URL}/store/carts/${cartId}/line-items`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ variant_id: variantId, quantity }),
    })

    if (!res.ok) {
      throw new Error('No se pudo agregar al carrito')
    }

    const data = await res.json()
    setItems(data.cart.items)
  }

  const removeItem = async (itemId: string) => {
    if (!cartId) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers: Record<string, string> = {
      'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY || '',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    await fetch(`${API_URL}/store/carts/${cartId}/line-items/${itemId}`, {
      method: 'DELETE',
      headers,
    })

    await fetchCart()
  }

  const clearCart = async () => {
    if (!cartId) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers: Record<string, string> = {
      'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY || '',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_URL}/store/carts/${cartId}`, { headers })
    const data = await res.json()
    const lineItems = data.cart.items

    await Promise.all(
      lineItems.map((item: LineItem) =>
        fetch(`${API_URL}/store/carts/${cartId}/line-items/${item.id}`, {
          method: 'DELETE',
          headers,
        })
      )
    )

    await fetchCart()
  }

  useEffect(() => {
    if (!customerLoading && typeof window !== 'undefined') {
      fetchCart()
    }
  }, [customerLoading, customer])

  return (
    <CartContext.Provider
      value={{
        cartId,
        items,
        isCartOpen,
        setIsCartOpen,
        addItem,
        removeItem,
        clearCart,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
