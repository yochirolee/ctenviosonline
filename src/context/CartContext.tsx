'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { useCustomer } from './CustomerContext'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

type LineItem = {
  id: number
  product_id: number
  quantity: number
  unit_price: number
  title?: string
  thumbnail?: string
}

interface CartContextType {
  cartId: number | null
  items: LineItem[]
  isCartOpen: boolean
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>
  addItem: (productId: number, quantity?: number, unitPrice?: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
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
  const [cartId, setCartId] = useState<number | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { customer, loading: customerLoading } = useCustomer()

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchCart = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/cart`, { headers: authHeaders() })
      if (!res.ok) {
        setCartId(null)
        setItems([])
        return
      }
      const data = await res.json() as { cart: { id: number } | null; items: LineItem[] }
      setCartId(data.cart ? data.cart.id : null)
      setItems(data.items || [])
    } catch {
      setCartId(null)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (productId: number, quantity = 1, unitPrice?: number) => {
    // Si no mandas unitPrice, lo buscamos del producto
    let price = unitPrice
    if (price == null) {
      const p = await fetch(`${API_URL}/products/${productId}`).then(r => r.json())
      price = Number(p.price)
    }

    const res = await fetch(`${API_URL}/cart/add`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ product_id: productId, quantity, unit_price: price }),
    })
    if (!res.ok) throw new Error('No se pudo agregar al carrito')
    await fetchCart()
  }

  const removeItem = async (itemId: number) => {
    const res = await fetch(`${API_URL}/cart/remove/${itemId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error('No se pudo eliminar del carrito')
    await fetchCart()
  }

  const clearCart = async () => {
    if (!items.length) return
    await Promise.all(
      items.map((it) =>
        fetch(`${API_URL}/cart/remove/${it.id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        })
      )
    )
    await fetchCart()
  }

  useEffect(() => {
    if (!customerLoading) {
      // Si no hay usuario autenticado, dejamos el carrito vacío (tu backend exige token para /cart)
      if (!customer) {
        setCartId(null)
        setItems([])
        setLoading(false)
        return
      }
      fetchCart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
