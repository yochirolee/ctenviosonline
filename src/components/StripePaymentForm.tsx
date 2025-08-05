'use client'

import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function StripePaymentForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  const locale = pathname.split('/')[1] || 'en'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    })

    setLoading(false)

    if (result.paymentIntent?.status === 'succeeded') {
      window.location.href = `/${locale}/checkout/success`
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement className="border p-2 rounded bg-white" />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700"
      >
        {loading ? 'Procesando...' : 'Confirmar Pago'}
      </button>
    </form>
  )
}
