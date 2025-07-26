"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react"

interface Product {
  id: string
  name: string
  price: number
  quantity: number
  imageSrc?: string
}

interface CartContextType {
  cartItems: Product[]
  addToCart: (product: Product) => void
  removeFromCart: (id: string) => void
  increaseQuantity: (id: string) => void
  decreaseQuantity: (id: string) => void
  isCartOpen: boolean
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>
  clearCart: () => void
}

// Creamos un valor inicial vacío pero válido
const defaultContext: CartContextType = {
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  increaseQuantity: () => {},
  decreaseQuantity: () => {},
  isCartOpen: false,
  setIsCartOpen: () => {},
  clearCart: () => {},
}

const CartContext = createContext<CartContextType>(defaultContext)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Product[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const isMounted = useRef(false)

  // Hidratar carrito desde localStorage solo una vez
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setCart(parsed)
        } else {
          localStorage.removeItem("cart")
        }
      }
    } catch (err) {
      console.error("Error loading cart:", err)
      localStorage.removeItem("cart")
    }
  }, [])

  // Guardar carrito en localStorage después de la carga inicial
  useEffect(() => {
    if (isMounted.current) {
      localStorage.setItem("cart", JSON.stringify(cart))
    } else {
      isMounted.current = true
    }
  }, [cart])

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id)
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        )
      }
      return [...prevCart, product]
    })
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const increaseQuantity = (id: string) => {
    setCart((items) =>
      items.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    )
  }

  const decreaseQuantity = (id: string) => {
    setCart((items) =>
      items
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem("cart")
  }

  return (
    <CartContext.Provider
      value={{
        cartItems: cart,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        isCartOpen,
        setIsCartOpen,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  return useContext(CartContext)
}
