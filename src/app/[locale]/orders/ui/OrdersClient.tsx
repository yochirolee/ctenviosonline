'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/context/CustomerContext'
import { ArrowLeft } from 'lucide-react'
import Thumb from '@/components/Thumb'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

type Item = {
  product_id: number
  product_name?: string
  quantity: number
  unit_price: number // USD
  image_url?: string
}

type PricingCentsLite = {
  total_with_card_cents?: number
  charged_usd?: number
}

type PricingMeta = {
  card_diff_pct?: number
  estimated_gateway_total?: number
  total?: number
  tax?: number
  card_fee?: number    
  subtotal?: number
  shipping?: number          
}

type OrderMetadata = {
  pricing?: PricingMeta
  pricing_cents?: PricingCentsLite  
  [k: string]: unknown
}

type OrderRow = {
  order_id: number
  created_at?: string
  status?: 'pending' | 'paid' | 'failed' | string
  payment_method?: string
  metadata?: OrderMetadata
  items: Item[]
}


type Dict = {
  common: { back: string; login: string; loading: string }
  orders: {
    title: string
    empty: string
    login_needed: string
    see_detail: string
    continue_shopping: string
    order_label: string
    method_label: string
    estimated: string
    errors: { load_failed: string; network: string }
    statuses?: Partial<Record<'pending' | 'paid' | 'failed' | 'delivered' | 'requires_action' | 'canceled' | string, string>>
    product_fallback: string
  }
}

export default function OrdersClient({ locale, dict }: { locale: string; dict: Dict }) {
  const router = useRouter()
  const { customer, loading: customerLoading } = useCustomer()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const CARD_FEE_PCT = Number(process.env.NEXT_PUBLIC_CARD_FEE_PCT ?? '3')
  const headers = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      if (customerLoading) return
      if (!customer) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`${API_URL}/customers/${customer.id}/orders`, {
          headers,
          cache: 'no-store',
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(data)) {
          setErr(dict.orders.errors.load_failed)
        } else {
          setOrders(data)
        }
      } catch {
        setErr(dict.orders.errors.network)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [customer, customerLoading, headers, dict])

  const fmtUsd = (v: number | string) =>
    new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }).format(Number(v || 0))

  const bestTotalForOrder = (o: OrderRow) => {
    const pricing = o?.metadata?.pricing ?? {}
    const pc = o?.metadata?.pricing_cents
  
    // 1) Si backend ya guardó el cobro final en centavos o en USD, úsalo
    if (pc?.total_with_card_cents != null) return pc.total_with_card_cents / 100
    if (pc?.charged_usd != null) return Number(pc.charged_usd)
  
    // 2) Si hay total estimado de gateway, úsalo
    if (pricing.estimated_gateway_total != null) return Number(pricing.estimated_gateway_total)
  
    // 3) Si hay total (subtotal+tax+shipping) y card_fee, suma ambos
    if (pricing.total != null && pricing.card_fee != null) {
      return Number(pricing.total) + Number(pricing.card_fee)
    }
  
    // 4) Construir base correctamente (incluye shipping!)
    const itemsTotal = o.items.reduce((s, it) => s + Number(it.unit_price) * Number(it.quantity), 0)
    const subtotal = pricing.subtotal != null ? Number(pricing.subtotal) : itemsTotal
    const tax = Number(pricing.tax || 0)
    const shipping = Number(pricing.shipping || 0)
  
    // Si el backend ya te dio total (mejor que rehacerlo)
    const base = pricing.total != null ? Number(pricing.total) : subtotal + tax + shipping
  
    // 5) Aplicar % de fee si no vino card_fee explícito
    const pct = Number(pricing.card_diff_pct ?? CARD_FEE_PCT) // p.ej. 3
    const withFee = base * (1 + pct / 100)
  
    return Number(withFee.toFixed(2))
  }

  // Ordenar de más reciente a más antiguo
  const ordersSorted = [...orders].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    if (tb !== ta) return tb - ta
    return Number(b.order_id) - Number(a.order_id)
  })

  // Etiqueta de estado (si no existe la key en el diccionario, mostramos la cruda del backend)
  const statusLabel = (s?: string) => (s ? (dict.orders.statuses?.[s] ?? s) : '—')

  if (customerLoading || loading) {
    return <div className="p-6 text-center">{dict.common.loading}</div>
  }

  if (!customer) {
    return (
      <div className="p-6 text-center space-y-4">
        <p>{dict.orders.login_needed}</p>
        <a
          className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          href={`/${locale}/login`}
        >
          {dict.common.login}
        </a>
      </div>
    )
  }

  if (err) {
    return (
      <div className="p-6 text-center">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition mb-4"
        >
          <ArrowLeft size={18} />
          <span className="underline underline-offset-2">
            {dict.common.back}
          </span>
        </button>
        <p className="text-red-600">{err}</p>
      </div>
    )
  }

  if (!ordersSorted.length) {
    return (
      <div className="p-6 text-center space-y-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition mb-4"
        >
          <ArrowLeft size={18} />
          <span className="underline underline-offset-2">
            {dict.common.back}
          </span>
        </button>
        <h1 className="text-2xl font-bold">{dict.orders.title}</h1>
        <p>{dict.orders.empty}</p>
        <a
          href={`/${locale}`}
          className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {dict.orders.continue_shopping}
        </a>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition"
      >
        <ArrowLeft size={18} />
        <span className="underline underline-offset-2">
          {dict.common.back}
        </span>
      </button>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{dict.orders.title}</h1>
        </div>
      </div>

      <ul className="space-y-4">
        {ordersSorted.map((o) => {
          const total = bestTotalForOrder(o)
          return (
            <li key={o.order_id} className="border rounded-lg bg-white">
              <div className="flex items-start justify-between p-4">
                <div className="space-y-1">
                  <div className="font-semibold">
                    {dict.orders.order_label} #{o.order_id}
                  </div>
                  <div className="text-sm text-gray-600">
                    {o.created_at ? new Date(o.created_at).toLocaleString() : ''}
                  </div>
                  <div className="text-sm text-gray-600">
                    {dict.orders.method_label}: {o.payment_method || '—'}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={
                      'text-xs px-2 py-1 rounded ' +
                      (o.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : o.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : o.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700')
                    }
                  >
                    {statusLabel(o.status)}
                  </span>
                  <div className="mt-2 font-semibold">
                    {fmtUsd(total)}{' '}
                    <span className="text-xs text-gray-500">
                      ({dict.orders.estimated})
                    </span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="border-t p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {o.items.map((it, idx) => (
                  <div key={`${o.order_id}-${it.product_id}-${idx}`} className="flex gap-3">
                    {it.image_url ? (
                      <Thumb
                        src={it.image_url}
                        alt={it.product_name || `${dict.orders.product_fallback} ${it.product_id}`}
                        size={56}            // 56px = w-14 h-14
                      // unoptimized        // descomenta si aún no agregaste los dominios en next.config.js
                      />
                    ) : (
                      <div className="w-14 h-14 rounded border bg-gray-100" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {it.product_name || `${dict.orders.product_fallback} #${it.product_id}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        x{it.quantity} · {fmtUsd(Number(it.unit_price))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Acciones */}
              <div className="border-t p-4 flex items-center justify-end gap-2">
                <a
                  className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                  href={`/${locale}/orders/${o.order_id}`}
                  title={dict.orders.see_detail}
                >
                  {dict.orders.see_detail}
                </a>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
