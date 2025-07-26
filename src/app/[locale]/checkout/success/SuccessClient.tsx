'use client'

import { useEffect } from 'react'
import type { Dict } from '../../page' 

export default function SuccessClient({
  dict,
  locale,
}: {
  dict: Dict
  locale: string
}) {
  useEffect(() => {
    // Borra el carrito solo después de que se muestre esta página exitosa
    localStorage.removeItem('cart')
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
