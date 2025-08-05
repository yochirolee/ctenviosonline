'use client'

import { useEffect } from 'react'
import type { Dict } from '@/types/Dict'

export default function SuccessClient({
  dict,
  locale,
}: {
  dict: Dict
  locale: string
}) {
  useEffect(() => {
    const formData = JSON.parse(localStorage.getItem('shippingInfo') || '{}')
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')

    const token = localStorage.getItem('token')
    let customerId: string | null = null

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        customerId = payload?.app_metadata?.customer_id || payload?.app_metadata?.customerId
      } catch {}
    }

    const cartId = customerId
      ? localStorage.getItem(`medusa_cart_id_${customerId}`)
      : localStorage.getItem('medusa_cart_id_guest')

    const alreadyCompleted = localStorage.getItem('cart_completed')

    if (!alreadyCompleted && cartId) {
      localStorage.setItem('cart_completed', 'true')

      fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/carts/${cartId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY || '',
        },
      }).then(async (res) => {
        await res.json()
      }).catch(() => {})
    }

    if (formData && cart.length > 0 && cartId) {
      fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/send-order-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY || '',
        },
        body: JSON.stringify({ formData, cartItems: cart, cartId }),
      }).catch(() => {})
    }

    localStorage.removeItem('cart')
    localStorage.removeItem('formData')
    localStorage.removeItem('shippingInfo')

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('medusa_cart_id_')) {
        localStorage.removeItem(key)
      }
    })
  }, [])

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold">{dict.success.title}</h1>
      <p className="mt-4">{dict.success.message}</p>
      <a
        href={`/${locale}`}
        className="mt-6 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        {dict.success.continue}
      </a>
    </div>
  )
}
