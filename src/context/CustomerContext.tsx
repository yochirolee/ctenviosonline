'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getLatestCustomerCart } from '@/lib/medusa/customer-cart'
import { usePathname, useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_API_KEY!

type Customer = {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

type CustomerContextType = {
  customer: Customer | null
  loading: boolean
  refreshCustomer: () => void
  logout: () => Promise<void>
}

const CustomerContext = createContext<CustomerContextType>({
  customer: null,
  loading: true,
  refreshCustomer: () => {},
  logout: async () => {},
})

export const useCustomer = () => useContext(CustomerContext)

const associateCartToCustomer = async (cartId: string, token: string) => {
  await fetch(`${API_URL}/store/carts/${cartId}/customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': API_KEY,
    },
    body: JSON.stringify({}),
  })
}

export const CustomerProvider = ({ children }: { children: React.ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'

  const refreshCustomer = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setCustomer(null)
        return
      }

      const res = await fetch(`${API_URL}/store/customers/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-publishable-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        setCustomer(null)
        return
      }

      const data = await res.json()
      setCustomer(data.customer)

      const localCartId = localStorage.getItem(`medusa_cart_id_${data.customer.id}`)
      if (!localCartId) {
        const latestCart = await getLatestCustomerCart(token)
        if (latestCart?.id) {
          localStorage.setItem('medusa_cart_id', latestCart.id)
        }
      }

      const finalCartId = localStorage.getItem(`medusa_cart_id_${data.customer.id}`)
      if (finalCartId) {
        await associateCartToCustomer(finalCartId, token)
      }
    } catch {
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    localStorage.removeItem('token')
    setCustomer(null)
    router.push(`/${locale}`)
  }

  useEffect(() => {
    refreshCustomer()
  }, [])

  return (
    <CustomerContext.Provider value={{ customer, loading, refreshCustomer, logout }}>
      {children}
    </CustomerContext.Provider>
  )
}
