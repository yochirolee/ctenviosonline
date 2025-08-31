'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Dict } from '@/types/Dict'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

// Token para endpoints protegidos
const authHeaders = (): HeadersInit => {
  const h: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token')
    if (t) h.Authorization = `Bearer ${t}`
  }
  return h
}

type OrderItem = {
  product_id: number
  product_name?: string
  quantity: number
  unit_price: number | string
  image_url?: string
}

type ShippingMeta = {
  country?: 'CU' | 'US'
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  address?: string
  municipality?: string
  province?: string
  ci?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zip?: string
}

type Order = {
  id: number | string
  created_at?: string
  status?: 'pending' | 'paid' | 'failed' | string
  metadata?: { shipping?: ShippingMeta; [k: string]: unknown }
  items?: OrderItem[]
  [k: string]: unknown
}

type PaymentInfo = {
  provider?: string
  mode?: 'direct' | string
  link_id?: string | number
  link?: string
  [k: string]: unknown
}

type CheckoutSession = {
  id: number | string
  status: string
  created_order_ids?: number[]
  snapshot?: unknown
  payment?: PaymentInfo
  processed_at?: string
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

  // Flujo nuevo (1 pago → N órdenes)
  const sessionId = useMemo(() => search.get('sessionId') || search.get('session') || null, [search])
  // Legacy (1 orden)
  const orderId = useMemo(() => search.get('orderId'), [search])

  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Nuevo flujo
  const [paid, setPaid] = useState<boolean>(false)
  const [createdOrders, setCreatedOrders] = useState<number[]>([])
  const [ordersDetail, setOrdersDetail] = useState<Array<{ order: Order; items: OrderItem[] }>>([])

  // Legacy
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[] | null>(null)

  // Refs utilitarias
  const cleanedRef = useRef(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const redirectedRef = useRef(false)

  const currency = (amount: number | string) => `US$ ${Number(amount).toFixed(2)}`
  const safeNumber = (v: number | string | undefined | null) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  const cleanLocal = () => {
    if (cleanedRef.current) return
    cleanedRef.current = true
    try {
      // 🧹 Carrito y señales
      localStorage.removeItem('cart')
      localStorage.removeItem('cart_completed')
      localStorage.setItem('cart_last_update', String(Date.now()))
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('medusa_')) localStorage.removeItem(key)
      })

      // 🧹 Checkout (todas las variantes conocidas)
      localStorage.removeItem('checkout_form_v2')
      localStorage.removeItem('checkout_country_v1')

      // Legacy/compat
      localStorage.removeItem('checkout_form_v1')
      localStorage.removeItem('checkout_form')
      localStorage.removeItem('checkout_form_data')
      localStorage.removeItem('checkout_prefill_v1')
      localStorage.removeItem('last_checkout_country')
      localStorage.removeItem('checkout_draft_v1')
      localStorage.removeItem('formData')
      localStorage.removeItem('shippingInfo')

      // ❗️No tocamos delivery_location_v2 (el banner debe persistir)
    } catch {}

    // Notificar a la UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cleared: true, items: 0 } }))
    }
  }

  const fetchOrder = async (id: string | number): Promise<Order | null> => {
    const res = await fetch(`${API_URL}/orders/${id}`, { headers: authHeaders(), cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json().catch(() => null)) as Order | null
  }

  async function fetchOrderDetail(orderId: number | string): Promise<{ order: Order; items: OrderItem[] } | null> {
    const res = await fetch(`${API_URL}/orders/${orderId}/detail`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!data) return null
    return data as { order: Order; items: OrderItem[] }
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  // =========================
  // NUEVO: flujo con sessionId
  // =========================
  useEffect(() => {
    if (!sessionId) return
    let attempts = 0
    const maxAttempts = 30
    const intervalMs = 3000

    const readCheckoutSession = async (sid: string): Promise<CheckoutSession | null> => {
      const r = await fetch(`${API_URL}/checkout-sessions/${sid}`, { cache: 'no-store' })
      if (r.status === 404) return null // permitirá fallback a confirm por link (compat)
      if (!r.ok) throw new Error('No se pudo leer la sesión')
      const j: unknown = await r.json().catch(() => null)
      if (!j || typeof j !== 'object') throw new Error('Sesión inválida')
      const rec = j as { ok?: boolean; message?: string; session?: unknown }
      if (rec.ok !== true) throw new Error(rec.message || 'Sesión inválida')
      return rec.session as CheckoutSession
    }

    const confirmViaLinkFallback = async (sid: string): Promise<{ paid: boolean; orders: number[] }> => {
      // Solo para compat con el flujo por link anterior
      const r = await fetch(`${API_URL}/payments/bmspay/confirm/${sid}`, { cache: 'no-store' })
      if (!r.ok) return { paid: false, orders: [] }
      const c: unknown = await r.json().catch(() => null)
      const ids = Array.isArray((c as { orders?: unknown }).orders)
        ? ((c as { orders: unknown[] }).orders).map((x: unknown) => Number(x)).filter(Number.isFinite)
        : []
      return { paid: !!(c as { paid?: unknown }).paid, orders: ids }
    }

    const afterPaid = async (ids: number[]) => {
      setPaid(true)
      setCreatedOrders(ids)
      // Traer items de cada orden (para miniaturas estilo Amazon)
      const bundles: Array<{ order: Order; items: OrderItem[] }> = []
      for (const id of ids) {
        const d = await fetchOrderDetail(id)
        if (d) bundles.push({ order: d.order, items: d.items ?? [] })
      }
      setOrdersDetail(bundles)
      cleanLocal()
      setLoading(false)
      stopPolling()
    }

    const tick = async () => {
      attempts++
      try {
        setConfirming(true)

        // 1) Intentar leer la checkout session (flujo directo ideal)
        const session = await readCheckoutSession(sessionId)
        if (session) {
          const status = String(session.status || '').toLowerCase()

          if (status === 'paid') {
            const ids = Array.isArray(session.created_order_ids)
              ? session.created_order_ids.map(Number).filter(Number.isFinite)
              : []
            await afterPaid(ids)
            return
          }

          const p = session.payment || {}
          const looksLikeLink =
            p?.provider === 'bmspay' && (p?.mode !== 'direct') && (p?.link_id != null || p?.link != null)
          if (status === 'pending' && looksLikeLink) {
            try {
              const r = await fetch(`${API_URL}/payments/bmspay/confirm/${sessionId}`, { cache: 'no-store' })
              if (r.ok) {
                const c: unknown = await r.json().catch(() => null)
                if ((c as { paid?: unknown })?.paid) {
                  const ids = Array.isArray((c as { orders?: unknown[] }).orders)
                    ? ((c as { orders: unknown[] }).orders).map((x: unknown) => Number(x)).filter(Number.isFinite)
                    : []
                  await afterPaid(ids)
                  return
                }
              }
            } catch {
              // no-op, seguimos con el polling
            }
          }

          // si no está pagada aún, seguimos poll
        } else {
          // 2) Fallback a confirm del link (compat)
          const lf = await confirmViaLinkFallback(sessionId)
          if (lf.paid) {
            await afterPaid(lf.orders)
            return
          }
        }

        if (attempts >= maxAttempts) {
          setLoading(false)
          setErrorMsg('No pudimos confirmar el pago. Si se debitó, contáctanos con tu # de orden.')
          stopPolling()
          return
        }
      } catch {
        if (attempts >= maxAttempts) {
          setLoading(false)
          setErrorMsg('No pudimos confirmar el pago (red). Intenta nuevamente.')
          stopPolling()
          return
        }
      } finally {
        setConfirming(false)
      }
    }

    // primera ejecución inmediata
    tick()
    // polling
    pollingRef.current = setInterval(tick, intervalMs)

    return () => {
      stopPolling()
    }
  }, [sessionId])

  // =========================
  // LEGACY: sólo orderId
  // =========================
  useEffect(() => {
    if (!orderId || sessionId) return
    let mounted = true

    const run = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/${orderId}`, {
          headers: authHeaders(),
          cache: 'no-store',
        })

        // Si no hay token → redirigir a login manteniendo retorno
        if ((res.status === 401 || res.status === 403) && !redirectedRef.current) {
          redirectedRef.current = true
          setLoading(false)
          router.push(
            `/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout/success?orderId=${orderId}`)}`
          )
          return
        }

        const data: Order | null = await res.json().catch(() => null)
        if (!res.ok || !data) {
          setErrorMsg('No se pudo cargar la orden.')
          setLoading(false)
          return
        }

        if (!mounted) return
        setOrder(data)
        setItems(Array.isArray(data.items) ? data.items : null)

        if (data.status === 'paid') {
          cleanLocal()
          setLoading(false)
          return
        }

        // Si la orden aún no está pagada y este fue un pago via link legacy,
        // intentamos una única confirmación pública y luego hacemos pequeño polling.
        const confirmOnce = async () => {
          setConfirming(true)
          try {
            const r = await fetch(`${API_URL}/payments/bmspay/confirm/${orderId}`, { cache: 'no-store' })
            const c: unknown = await r.json().catch(() => null)
            if ((c as { paid?: unknown })?.paid) {
              const ord = await fetchOrder(orderId)
              if (ord) {
                setOrder(ord)
                setItems(Array.isArray(ord.items) ? ord.items : null)
                if (ord.status === 'paid') cleanLocal()
              }
            }
          } catch {
            // no-op
          } finally {
            setConfirming(false)
          }
        }

        await confirmOnce()

        // polling corto (legacy)
        let attempts = 0
        const maxAttempts = 15
        const intervalMs = 4000
        const timer = setInterval(async () => {
          attempts++
          try {
            const r = await fetch(`${API_URL}/payments/bmspay/confirm/${orderId}`, { cache: 'no-store' })
            const c: unknown = await r.json().catch(() => null)

            // Refetch protegido
            const res2 = await fetch(`${API_URL}/orders/${orderId}`, { headers: authHeaders(), cache: 'no-store' })
            if (res2.status !== 401 && res2.status !== 403) {
              const ord2: Order | null = await res2.json().catch(() => null)
              if (ord2) {
                setOrder(ord2)
                setItems(Array.isArray(ord2.items) ? ord2.items : null)
                if (ord2.status === 'paid') {
                  cleanLocal()
                  clearInterval(timer)
                }
              }
            }

            if ((c as { active?: unknown })?.active === false || attempts >= maxAttempts) {
              clearInterval(timer)
              setErrorMsg(
                attempts >= maxAttempts
                  ? 'No pudimos confirmar el pago. Si se debitó, contáctanos con tu # de orden.'
                  : 'El link de pago fue desactivado.'
              )
            }
          } catch {
            if (attempts >= maxAttempts) {
              clearInterval(timer)
              setErrorMsg('No pudimos confirmar el pago (red). Intenta nuevamente.')
            }
          }
        }, intervalMs)

        return () => clearInterval(timer)
      } catch {
        setErrorMsg('Error de red al cargar la orden.')
        setLoading(false)
      }
    }

    run()
    return () => { mounted = false }
  }, [orderId, sessionId, locale, router])

  // =========================
  // UI text
  // =========================
  const titleWhenPaid = dict?.success?.title ?? '¡Pago exitoso!'
  const titleWhenPending = dict?.success?.confirmingTitle ?? 'Estamos confirmando tu pago...'
  const bodyWhenPaid = dict?.success?.message ?? 'Gracias por tu compra.'
  const bodyWhenPending =
    dict?.success?.confirmingBody ??
    'Hemos recibido tu pedido y estamos confirmando el pago con el proveedor. Esto puede tardar 1–2 minutos.'

  // Estado visual
  const isLegacyPaid = order?.status === 'paid'
  const isPaid = sessionId ? paid : isLegacyPaid
  const title = isPaid ? titleWhenPaid : titleWhenPending
  const body = isPaid ? bodyWhenPaid : bodyWhenPending

  if (loading) {
    return <div className="p-6 text-center">{dict?.common?.loading || 'Cargando...'}</div>
  }

  if (errorMsg) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold text-red-600">{dict?.error?.title || 'Error'}</h1>
        <p className="mt-4">{errorMsg}</p>
        <button
          onClick={() => router.push(`/${locale}`)}
          className="mt-6 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          {dict?.success?.continue || 'Volver al inicio'}
        </button>
      </div>
    )
  }

  // Subtotal legacy
  const orderSubtotal =
    items?.reduce((acc, it) => acc + safeNumber(it.unit_price) * (it.quantity || 0), 0) ?? 0

  return (
    <div className="p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-4">{body}</p>
        {confirming && (
          <div className="mt-2 text-sm text-gray-500">
            {dict?.success?.confirmingBody ?? 'Confirmando con el proveedor...'}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {!sessionId && orderId && (
          <a
            href={`/${locale}/orders/${orderId}`}
            className="inline-block px-4 py-2 border rounded hover:bg-gray-50"
          >
            {dict?.success?.view_order ?? 'Ver pedido'}
          </a>
        )}
        <a
          href={`/${locale}/orders`}
          className="inline-block px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition"
        >
          {dict?.success?.view_orders ?? 'Ver mis pedidos'}
        </a>
        <a
          href={`/${locale}`}
          className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          {dict?.success?.continue ?? 'Seguir comprando'}
        </a>
      </div>

      {/* === NUEVO: Cards estilo Amazon para múltiples órdenes (sessionId) === */}
      {sessionId && isPaid && (
        <div className="max-w-3xl mx-auto text-left bg-gray-50 border rounded p-4 mt-6 space-y-4">
          <h2 className="font-semibold text-lg">{dict.success.orders_created}</h2>

          {ordersDetail.length === 0 ? (
            <ul className="list-disc pl-6">
              {createdOrders.map((id) => (
                <li key={id}>
                  <a className="text-green-700 underline" href={`/${locale}/orders/${id}`}>
                    Ver orden #{id}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            ordersDetail.map(({ order, items }) => {
              const thumbs = items
                .map(it => it.image_url)
                .filter(Boolean)
                .slice(0, 4) as string[]

              return (
                <div key={String(order.id)} className="bg-white rounded border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{dict.success.order_number}{order.id}</div>
                    <a
                      href={`/${locale}/orders/${order.id}`}
                      className="text-sm text-green-700 underline"
                    >
                      {dict.success.see_details}
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    {thumbs.length > 0 ? (
                      <>
                        {thumbs.map((src, i) => (
                          <img
                            key={`${order.id}-${i}`}
                            src={src}
                            alt={`Producto ${i + 1}`}
                            className="w-14 h-14 object-cover rounded border"
                          />
                        ))}
                        {items.length > thumbs.length && (
                          <div className="text-sm text-gray-600">
                            +{items.length - thumbs.length} más
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">
                        (Sin imágenes disponibles)
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* LEGACY: bloque de una orden (con ítems) */}
      {!sessionId && order && (
        <div className="max-w-3xl mx-auto mt-8 bg-white border rounded p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">{dict.success.order_number}{order.id}</div>
            <div className="flex items-center gap-2">
              {order.status && (
                <span
                  className={
                    'text-xs px-2 py-1 rounded ' +
                    (order.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700')
                  }
                >
                  {order.status}
                </span>
              )}
              {order.created_at && (
                <div className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {order.metadata?.shipping && (
            <div className="text-sm text-gray-700 mt-2">
              <div>
                Envío a{' '}
                <strong>
                  {order.metadata.shipping?.first_name} {order.metadata.shipping?.last_name}
                </strong>
              </div>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="mt-3">
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
                      {currency(safeNumber(it.unit_price) * (it.quantity || 0))}
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
    </div>
  )
}
