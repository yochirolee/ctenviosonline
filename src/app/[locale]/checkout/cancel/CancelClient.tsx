'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Dict } from '@/types/Dict'

export default function CancelClient({
  dict,
  locale,
}: {
  dict: Dict
  locale: string
}) {
  const router = useRouter()

  useEffect(() => {
    // Limpieza de datos temporales
    localStorage.removeItem('cart')
    localStorage.removeItem('formData')
    localStorage.removeItem('shippingInfo')
    localStorage.removeItem('cart_completed')
  }, [])

  const handleRetry = () => {
    router.push(`/${locale}/checkout`)
  }

  const handleHome = () => {
    router.push(`/${locale}`)
  }

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold text-red-600">{dict.error.title}</h1>
      <p className="mt-4">{dict.error.message}</p>

      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          {dict.error.retry}
        </button>

        <button
          onClick={handleHome}
          className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition"
        >
          {dict.error.home}
        </button>
      </div>
    </div>
  )
}
