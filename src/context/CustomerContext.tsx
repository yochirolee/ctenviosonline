'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

type CustomerMetadata = {
  role?: 'admin' | 'owner' | 'delivery' | ''
  owner_id?: number | null
  // otros campos opcionales que puedas guardar
  [key: string]: string | number | boolean | null | undefined
}

type Customer = {
  id: number
  email: string
  first_name?: string
  last_name?: string
  metadata?: CustomerMetadata | null
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

export const CustomerProvider = ({ children }: { children: React.ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'

  const refreshCustomer = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        setCustomer(null)
        return
      }

      const res = await fetch(`${API_URL}/customers/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        setCustomer(null)
        return
      }

      const data = await res.json()
      setCustomer(data)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <CustomerContext.Provider value={{ customer, loading, refreshCustomer, logout }}>
      {children}
    </CustomerContext.Provider>
  )
}
