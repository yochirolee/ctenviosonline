'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Dict } from '@/types/Dict'

export default function CancelClient({
  dict,
  locale,
}: {
  dict: Dict
  locale: string
}) {
  const router = useRouter()
  const search = useSearchParams()

  // opcionalmente muestra info si la pasas en la URL:
  // /fail?orderId=123&msg=Tarjeta%20rechazada
  const orderId = search.get('orderId') || ''
  const msg = search.get('msg') || ''

  useEffect(() => {
    // No borres carrito ni shipping para que el usuario pueda reintentar.
    // Solo limpia flags temporales si tu flujo los usa.
    localStorage.removeItem('cart_completed')
  }, [])

  const handleRetry = () => router.push(`/${locale}/checkout`)
  const handleHome = () => router.push(`/${locale}`)

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold text-red-600">{dict.error.title}</h1>

      <p className="mt-4">{dict.error.message}</p>

      {/* Mensaje detallado opcional */}
      {orderId && (
        <p className="mt-2 text-sm text-gray-600">
          #{orderId}
        </p>
      )}
      {msg && (
        <p className="mt-2 text-sm text-gray-600">
          {msg}
        </p>
      )}

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

      <p className="mt-4 text-sm text-gray-500">
        {/* Hint para UX: mantenemos carrito y envío */}
        {locale === 'es'
          ? 'Hemos conservado los artículos de tu carrito y tu información de envío para que puedas reintentar rápidamente.'
          : 'We kept your cart items and shipping info so you can retry quickly.'}
      </p>
    </div>
  )
}
