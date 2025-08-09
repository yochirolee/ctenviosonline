'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Dict } from '@/types/Dict'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

type OrderItem = {
  product_id: number
  product_name?: string
  quantity: number
  unit_price: number
  image_url?: string
}

export default function SuccessClient({
  dict,
  locale,
}: {
  dict: Dict
  locale: string
}) {
  const router = useRouter()
  const search = useSearchParams()
  const orderId = useMemo(() => search.get('orderId'), [search])
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<OrderItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      // Limpieza de datos locales (ya no usamos Medusa)
      localStorage.removeItem('cart')
      localStorage.removeItem('formData')
      localStorage.removeItem('shippingInfo')
      localStorage.removeItem('cart_completed')
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('medusa_')) localStorage.removeItem(key)
      })

      if (!orderId) {
        setErrorMsg('Falta el identificador de la orden.')
        setLoading(false)
        return
      }

      try {
        // 1) Traer la orden
        const res = await fetch(`${API_URL}/orders/${orderId}`)
        const data = await res.json().catch(() => null)
        if (!res.ok || !data) {
          setErrorMsg('No se pudo cargar la orden.')
          setLoading(false)
          return
        }
        setOrder(data)

        // 2) Si tu backend devuelve items embebidos, úsalo.
        //    Si no, y tienes un endpoint como /orders/:id/items, podrías descomentar lo siguiente:
        // const itemsRes = await fetch(`${API_URL}/orders/${orderId}/items`)
        // if (itemsRes.ok) {
        //   const itemsData = await itemsRes.json()
        //   setItems(itemsData.items || itemsData)
        // } else {
        //   setItems(null)
        // }

        // En muchos casos tu /orders/:id (si lo ajustas) podría devolver items así:
        if (Array.isArray(data.items)) {
          setItems(data.items)
        } else {
          setItems(null)
        }
      } catch (e) {
        setErrorMsg('Error de red al cargar la orden.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [orderId])

  const currency = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const orderSubtotal =
    items?.reduce((acc, it) => acc + it.unit_price * it.quantity, 0) ?? 0

  if (loading) {
    return (
      <div className="p-6 text-center">
        {dict.common?.loading || 'Cargando...'}
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold text-red-600">{dict.error?.title || 'Error'}</h1>
        <p className="mt-4">{errorMsg}</p>
        <button
          onClick={() => router.push(`/${locale}`)}
          className="mt-6 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          {dict.success?.continue || 'Volver al inicio'}
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold">{dict.success.title}</h1>
      <p className="mt-4">{dict.success.message}</p>

      {order && (
        <div className="max-w-xl mx-auto text-left bg-gray-50 border rounded p-4 mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">#{order.id}</div>
            {order.created_at && (
              <div className="text-sm text-gray-600">
                {new Date(order.created_at).toLocaleString()}
              </div>
            )}
          </div>

          {/* Dirección / metadata */}
          {order.metadata?.shipping && (
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <strong>Destinatario:</strong>{' '}
                {order.metadata.shipping.first_name} {order.metadata.shipping.last_name}
              </div>
              <div>
                <strong>Dirección:</strong> {order.metadata.shipping.address}
              </div>
              <div>
                <strong>Municipio/Provincia:</strong>{' '}
                {order.metadata.shipping.municipality}, {order.metadata.shipping.province}
              </div>
              <div>
                <strong>Teléfono:</strong> {order.metadata.shipping.phone}
              </div>
              {order.metadata.shipping.ci && (
                <div>
                  <strong>CI:</strong> {order.metadata.shipping.ci}
                </div>
              )}
            </div>
          )}

          {/* Items (si tu backend los envía) */}
          {items && items.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Productos</h2>
              <ul className="divide-y divide-gray-200">
                {items.map((it, idx) => (
                  <li key={`${it.product_id}-${idx}`} className="py-2 flex items-center gap-3">
                    {it.image_url ? (
                      <img
                        src={it.image_url}
                        alt={it.product_name || `Producto ${it.product_id}`}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ) : null}
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {it.product_name || `Producto #${it.product_id}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        x{it.quantity} · {currency(it.unit_price)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      {currency(it.unit_price * it.quantity)}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 text-right text-sm">
                <span className="font-medium">Subtotal: </span>
                <span>{currency(orderSubtotal)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <a
        href={`/${locale}`}
        className="mt-6 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        {dict.success.continue}
      </a>
    </div>
  )
}
