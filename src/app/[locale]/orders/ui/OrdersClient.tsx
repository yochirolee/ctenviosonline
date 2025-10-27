'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/context/CustomerContext'
import { ArrowLeft } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

type Item = {
  product_id: number
  product_name?: string
  product_name_en?: string | null
  quantity: number
  unit_price: number
  image_url?: string | null          // puede venir ya priorizada
  thumbnail?: string | null          // snapshot del carrito (opcional)
  variant_id?: number | null         // si lo expone el API
  variant_label?: string | null      // “Negra · M”, etc. (opcional)
  option1?: string | null            // opcional
  option2?: string | null            // opcional
  option3?: string | null            // opcional
  metadata?: {                       // snapshot del carrito
    title_en?: string | null
    effective_image_url?: string | null
  } | null
}

type ApiItemsPreview = {
  product_id: number
  variant_id?: number | null
  image_url?: string | null
  product_name?: string | null
  qty?: number
  unit_price?: number // USD
}

type ApiOrderListItem = {
  id: number
  order_id?: number
  status?: string
  created_at?: string
  payment_method?: string
  metadata?: OrderMetadata
  items?: Item[]
  items_preview?: ApiItemsPreview[]

  // campos agregados por el SQL (opcionales)
  items_qty?: number
  items_total_cents?: number
  base_total_cents?: number
  card_fee_cents?: number
  total_with_card_cents?: number

  // por si el backend envía snapshots sueltos
  pricing?: PricingMeta
  pricing_cents?: PricingCentsLite
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
  total_with_card?: number
}

type OrderMetadata = {
  pricing?: PricingMeta
  pricing_cents?: PricingCentsLite
  [k: string]: unknown
}

type OrderRow = {
  order_id: number
  created_at?: string
  status?: string
  payment_method?: string
  metadata?: OrderMetadata
  items?: Item[]                         // si tu endpoint a veces trae items completos
  items_preview?: {
    product_id: number
    variant_id?: number | null
    image_url?: string | null
    product_name?: string | null   // 👈 NUEVO
    qty?: number                   // 👈 NUEVO
    unit_price?: number | string   // 👈 NUEVO (USD por unidad)
  }[]
}
function hasItemsArray(d: unknown): d is { items: unknown } {
  return typeof d === 'object' && d !== null && 'items' in d &&
         Array.isArray((d as { items: unknown }).items)
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
        const raw: unknown = await res.json().catch(() => null)
        
        // Normalizador: acepta array o paginado { items, ... }
        let fromApi: ApiOrderListItem[] | null = null
        if (Array.isArray(raw)) {
          fromApi = raw as ApiOrderListItem[]
        } else if (hasItemsArray(raw)) {
          fromApi = (raw as { items: ApiOrderListItem[] }).items
        }
        
        if (!fromApi) {
          setErr(dict.orders.errors.load_failed)
        } else {
          const rows: OrderRow[] = fromApi.map((r: ApiOrderListItem) => ({
            order_id: Number(r.order_id ?? r.id),
            created_at: r.created_at,
            status: r.status,
            metadata: r.metadata ?? {
              pricing: {
                total_with_card:
                  r.total_with_card_cents != null ? r.total_with_card_cents / 100 : undefined,
                subtotal:
                  r.items_total_cents != null ? r.items_total_cents / 100 : undefined,
              },
              pricing_cents: {
                total_with_card_cents: r.total_with_card_cents,
              },
            },
            items_preview: Array.isArray(r.items_preview) ? r.items_preview : undefined,
            items: Array.isArray(r.items) ? r.items : undefined,
          }))
        
          setOrders(rows)
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
    const pricing = o?.metadata?.pricing ?? {};
    const pc = o?.metadata?.pricing_cents;

    // 1) Cents (final, cobrado)
    if (pc?.total_with_card_cents != null) {
      return { total: pc.total_with_card_cents / 100, final: true };
    }
    // 1b) Si guardaras el cobro en USD
    if (pc?.charged_usd != null) {
      return { total: Number(pc.charged_usd), final: true };
    }

    // 2) Snapshot en USD con total con fee (si existe)
    if (pricing.total_with_card != null) {
      return { total: Number(pricing.total_with_card), final: true };
    }

    // 3) Total estimado del gateway
    if (pricing.estimated_gateway_total != null) {
      return { total: Number(pricing.estimated_gateway_total), final: false };
    }

    // 4) total + card_fee explícitos
    if (pricing.total != null && pricing.card_fee != null) {
      return { total: Number(pricing.total) + Number(pricing.card_fee), final: true };
    }

    // 5) Fallback: reconstruir base (incluye shipping)
    const itemsTotal = Array.isArray(o.items)
      ? o.items.reduce((s, it) => s + Number(it.unit_price) * Number(it.quantity), 0)
      : 0
    const subtotal = pricing.subtotal != null ? Number(pricing.subtotal) : itemsTotal;
    const tax = Number(pricing.tax || 0);
    const shipping = Number(pricing.shipping || 0);
    const base = pricing.total != null ? Number(pricing.total) : (subtotal + tax + shipping);

    // Si el método es tarjeta, aplica fee; si no, muestra base
    const isCard = (o.payment_method || '').toLowerCase().includes('bms');
    if (isCard) {
      const pct = Number(pricing.card_diff_pct ?? CARD_FEE_PCT); // p.ej. 3
      const withFee = base * (1 + pct / 100);
      return { total: Number(withFee.toFixed(2)), final: false };
    }
    return { total: Number(base.toFixed(2)), final: true };
  };


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
          const { total, final } = bestTotalForOrder(o);
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

                </div>
                <div className="text-right">
                  <span
                    className={
                      'text-xs px-2 py-1 rounded ' +
                      (o.status === 'paid'
                        ? 'bg-yellow-100 text-yellow-700'
                        : o.status === 'pending'
                          ? 'bg-yellow-900 text-yellow-900'
                          : o.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700')
                    }
                  >
                    {statusLabel(o.status)}
                  </span>

                  <div className="mt-2 font-semibold">
                    {fmtUsd(total)}{' '}
                    {!final && (
                      <span className="text-xs text-gray-500">
                        ({dict.orders.estimated})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              {Array.isArray(o.items_preview) && o.items_preview.length > 0 && (() => {
                const MAX_MOBILE = 4
                const MAX_DESKTOP = 6
                const visible = o.items_preview.slice(0, MAX_DESKTOP)
                const extra = o.items_preview.length - visible.length

                return (
                  <div className="border-t p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                      {visible.map((pi, idx) => {
                        const hiddenOnMobile = idx >= MAX_MOBILE ? 'hidden md:block' : ''
                        const qty = Number(pi.qty ?? 1)
                        return (
                          <div
                            key={`${o.order_id}-${pi.product_id}-${pi.variant_id ?? 'no-var'}-${idx}`}
                            className={`flex items-center gap-2 ${hiddenOnMobile}`}
                          >
                            <div className="relative aspect-square w-16 h-16 md:w-18 md:h-18 rounded-lg overflow-hidden border bg-gray-50 shadow-sm shrink-0">
                              {pi.image_url ? (
                                <img
                                  src={pi.image_url}
                                  alt={pi.product_name ? pi.product_name : `#${pi.product_id}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100" />
                              )}
                              
                            </div>

                            {/* Leyenda a la derecha de la miniatura */}
                            <div className="min-w-0">
                              
                              <div className="text-[11px] md:text-xs text-gray-600">
                                x{qty} · {fmtUsd(Number(pi.unit_price ?? 0))}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {extra > 0 && (
                        <div className="hidden md:flex items-center justify-center">
                          <div
                            className="aspect-square w-16 h-16 md:w-18 md:h-18 rounded-lg border bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600"
                            title={`+${extra} más`}
                          >
                            +{extra}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

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
