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

type LineItemMetadata = {
  tax_cents?: number
  /** opcional: algunos backends mandan owner aquí */
  owner?: string
  /** opcional: peso en lb */
  weight_lb?: number
  [k: string]: unknown
}

type LineItem = {
  id: number
  product_id: number
  quantity: number
  /** unit_price en CENTAVOS para el front */
  unit_price: number
  /** metadata del cart_item (incluye tax_cents por ítem si el backend lo guarda) */
  metadata?: LineItemMetadata
  title?: string
  thumbnail?: string
  weight?: number
  /** proveedor */
  owner_id?: number | null
  owner_name?: string | null
  /** disponibilidad reportada por el backend para esta línea */
  available?: number | null
}

interface CartContextType {
  cartId: number | null
  items: LineItem[]
  isCartOpen: boolean
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>
  /** unitPrice se ignora (el backend calcula). Se deja por compatibilidad. */
  addItem: (productId: number, quantity?: number, unitPrice?: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  clearCart: () => Promise<void>
  loading: boolean
  refreshCartNow: () => void
}

const CartContext = createContext<CartContextType>({
  cartId: null,
  items: [],
  isCartOpen: false,
  setIsCartOpen: () => { },
  addItem: async () => { },
  removeItem: async () => { },
  clearCart: async () => { },
  loading: true,
  refreshCartNow: () => { },
})

export const useCart = () => useContext(CartContext)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartId, setCartId] = useState<number | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshCartNow = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cart:updated', { detail: { reason: 'sync' } })
      )
    }
  }

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
      const res = await fetch(`${API_URL}/cart`, { headers: authHeaders(), cache: 'no-store' })
      if (!res.ok) {
        setCartId(null)
        setItems([])
        return
      }
      const data = await res.json() as {
        cart: { id: number } | null
        items: Array<{
          id: number
          product_id: number
          quantity: number
          unit_price: number | string // viene NUMERIC(10,2) desde DB
          title?: string
          thumbnail?: string
          weight?: number
          metadata?: LineItemMetadata
          owner_id?: number | null
          owner_name?: string | null
          available_stock?: number | null
        }>
      }

      setCartId(data.cart ? data.cart.id : null)

      // Normaliza: unit_price USD → CENTAVOS (entero)
      const normalized: LineItem[] = (data.items || [])
        .slice()
        .sort((a, b) => a.id - b.id)
        .map((it) => {
          const priceUsd = Number(it.unit_price ?? 0)
          const unitPriceCents = Math.round(priceUsd * 100)
          return {
            id: it.id,
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: unitPriceCents,
            title: it.title,
            thumbnail: it.thumbnail,
            metadata: it.metadata || {},
            weight: typeof it.weight === 'number'
              ? it.weight
              : Number(it?.metadata?.weight_lb ?? 0),
            owner_id: typeof it.owner_id === 'number' ? it.owner_id : null,
            owner_name: it.owner_name ?? null,
            // si el backend manda string, lo convertimos igual
            available: it.available_stock == null ? null : Number(it.available_stock),
          }
        })

      setItems(normalized)
    } catch {
      setCartId(null)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (productId: number, quantity = 1, _unitPrice?: number) => {
    // _unitPrice se IGNORA: el backend calcula precio/tax en /cart/add
    void _unitPrice;
    const res = await fetch(`${API_URL}/cart/add`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ product_id: productId, quantity }),
    })
    if (res.status === 409) {
      const payload = await res.json().catch(() => null)
      const err = new Error('OUT_OF_STOCK') as Error & {
        code: 'OUT_OF_STOCK'
        available?: number
        title?: string
      }
      err.code = 'OUT_OF_STOCK'
      err.available = Number(payload?.available ?? 0)
      err.title = payload?.title
      throw err
    }
    
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

  useEffect(() => {
    const onCartUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ cleared?: boolean }>).detail
      const cleared = !!detail?.cleared
      if (cleared) {
        setItems([])
        setCartId(null)
      } else {
        fetchCart()
      }
    }
  
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'cart' || ev.key === 'cart_last_update') {
        if (ev.newValue === null) {
          setItems([])
          setCartId(null)
        } else {
          fetchCart()
        }
      }
    }
  
    if (typeof window !== 'undefined') {
      window.addEventListener('cart:updated', onCartUpdated as EventListener)
      window.addEventListener('storage', onStorage)
      window.addEventListener('focus', fetchCart as unknown as EventListener)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cart:updated', onCartUpdated as EventListener)
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('focus', fetchCart as unknown as EventListener)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  

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
        refreshCartNow,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
