'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useCustomer } from '@/context/CustomerContext'
import type { Dict } from '@/types/Dict'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

// % fee de tarjeta configurable (default 3)
const CARD_FEE_PCT = Number(process.env.NEXT_PUBLIC_CARD_FEE_PCT ?? '3')
const FEE_RATE = Number.isFinite(CARD_FEE_PCT) ? CARD_FEE_PCT / 100 : 0
const round2 = (n: number) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100

type Item = {
  product_id: number
  product_name?: string
  quantity: number
  unit_price: number
  image_url?: string
}

type Shipping = {
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

type PaymentMeta = {
  provider?: string
  link?: string
  link_original?: string
  link_id?: string
  invoice?: string
  status?: number
  subtotal?: number
  tax?: number
  // añadidos para pago directo
  mode?: 'direct' | 'link' | string
  verbiage?: string
  AuthorizationNumber?: string
  ServiceReferenceNumber?: string
  UserTransactionNumber?: string
  CardType?: string
  LastFour?: string
}

type BmsTx = {
  Id?: string
  Link?: string
  Type?: number
  Active?: boolean
  Amount?: string
  PaidOn?: string
  Status?: number
  CreatedOn?: string
  DisabledOn?: string | null
  MerchantId?: number
  Description?: string
  InvoiceNumber?: string
  ForcedPaymentMethod?: string | null
  ServiceReferenceNumber?: string
}

type DeliveryMeta = {
  delivered?: boolean
  delivered_at?: string
  photo_url?: string
  notes?: string
}

type Order = {
  id: number | string
  created_at?: string
  status?: 'pending' | 'paid' | 'failed' | 'delivered' | string
  payment_method?: string
  total?: number
  metadata?: {
    shipping?: Shipping
    pricing?: { subtotal?: number; tax?: number; total?: number; shipping?: number }
    payment?: PaymentMeta
    bmspay_transaction?: BmsTx
    checkout_session_id?: number | string
    session_id?: number | string
    delivery?: DeliveryMeta
    [k: string]: unknown
  }
  items?: Item[]
}

type CustomerOrderListRow = {
  order_id?: number | string
  id?: number | string
  items?: Item[]
}

export default function OrderDetailClient({
  locale,
  id,
  dict,
}: {
  locale: string
  id: string
  dict: Dict
}) {
  const router = useRouter()
  const { customer } = useCustomer()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const hasItemsArray = (x: unknown): x is { items: Item[] } =>
    typeof x === 'object' && x !== null && Array.isArray((x as { items?: unknown }).items)

  const extractItems = (payload: unknown): Item[] => {
    if (!payload) return []
    if (Array.isArray(payload)) return payload as Item[]
    if (hasItemsArray(payload)) return payload.items
    return []
  }

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Traer la orden base
        const res = await fetch(`${API_URL}/orders/${id}`, {
          headers: authHeaders(),
          cache: 'no-store',
        })
        const base: Order | null = await res.json().catch(() => null)
        if (!res.ok || !base) {
          setErr(dict.order_detail.errors.load_failed)
          return
        }

        let ord: Order = base

        // 2) (ELIMINADO) No llamar /admin/orders/:id/detail ni /orders/:id/detail

        // 3) Si aún no hay items, reconstruir desde el listado del cliente
        if ((!ord.items || ord.items.length === 0) && customer?.id) {
          try {
            const r3 = await fetch(`${API_URL}/customers/${customer.id}/orders`, {
              headers: authHeaders(),
              cache: 'no-store',
            })
            if (r3.ok) {
              const list = (await r3.json().catch(() => null)) as unknown
              if (Array.isArray(list)) {
                const typedList = list as CustomerOrderListRow[]
                const targetIdNum = Number(ord.id)
                const match = typedList.find(
                  (o) => Number(o.order_id ?? o.id) === targetIdNum
                )
                const itemsFromList = extractItems(match)
                if (itemsFromList.length) ord = { ...ord, items: itemsFromList }
              }
            }
          } catch {
            /* noop */
          }
        }

        setOrder(ord)
      } catch {
        setErr(dict.order_detail.errors.network)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id, customer?.id, dict])

  const fmtUsd = (v: number | string | undefined | null) => {
    const n = typeof v === 'string' ? Number(v) : Number(v ?? 0)
    return new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }).format(n || 0)
  }

  const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString(locale || 'es') : '')

  // Preferencias para totales:
  //   1) metadata.pricing (snapshot)
  //   2) bmspay_transaction.Amount (gateway, sin fee)
  //   3) orders.total
  //   4) suma(items)+tax
  const sumItems = (order?.items || []).reduce(
    (s, it) => s + Number(it.unit_price) * Number(it.quantity),
    0
  )
  const pricing = order?.metadata?.pricing
  const payment = order?.metadata?.payment
  const bms = order?.metadata?.bmspay_transaction

  const displaySubtotal = pricing?.subtotal ?? sumItems
  const tax = pricing?.tax ?? undefined
  const shippingUsd = Number(pricing?.shipping ?? 0) // envío explícito

  const totalPref =
    pricing?.total ??
    (bms?.Amount ? Number(bms.Amount) : undefined) ??
    order?.total ??
    sumItems + (tax || 0)

  const baseTotal = Number(totalPref || 0) // total sin fee
  const cardFee = round2(baseTotal * FEE_RATE) // fee (aplica para link y directo)
  const totalWithCardFee = round2(baseTotal + cardFee)

  const paidOn = bms?.PaidOn
  const provider = payment?.provider || (bms ? 'bmspay' : order?.payment_method || '—')
  const invoice = payment?.invoice || bms?.InvoiceNumber
  const trxId = payment?.link_id || bms?.Id
  const serviceRef = payment?.ServiceReferenceNumber || bms?.ServiceReferenceNumber
  const payLink = payment?.link || bms?.Link

  // checkout session (directo o link)
  const checkoutSessionDisplay =
    order?.metadata?.checkout_session_id ?? order?.metadata?.session_id ?? null

  const maskCard = (brand?: string, last4?: string) => {
    if (!brand && !last4) return null
    const b = brand || dict.order_detail.labels.card_generic
    const l4 = last4 || '••••'
    return `${b} •••• ${l4}`
  }

  const delivery = order?.metadata?.delivery
  const deliveredAt =
    delivery?.delivered_at
      ? new Date(delivery.delivered_at).toLocaleString(locale || 'es')
      : null

  const statusLabel = (s?: string) => {
    if (!s) return '—'
    return dict.order_detail.statuses?.[s] ?? s
  }

  if (loading) return <div className="p-6 text-center">{dict.common.loading}</div>

  if (err || !order) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600">{dict.order_detail.error_title}</h1>
        <p className="mt-2">{err || dict.order_detail.not_found}</p>
        <a
          href={`/${locale}/orders`}
          className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {dict.order_detail.back_to_orders}
        </a>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition"
        >
          <ArrowLeft size={18} />
          <span className="underline underline-offset-2">{dict.common.back}</span>
        </button>

        <div className="text-right">
          <div className="text-sm text-gray-600">{order.created_at ? dt(order.created_at) : ''}</div>
          <div className="mt-1">
            <span
              className={
                'text-xs px-2 py-1 rounded ' +
                (order.status === 'paid'
                  ? 'bg-green-100 text-green-700'
                  : order.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : order.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700')
              }
            >
              {statusLabel(order.status)}
            </span>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold">
        {dict.order_detail.order_label} #{order.id}
      </h1>

      {/* Pago */}
      <div className="bg-white border rounded">
        <div className="p-4 border-b font-semibold">{dict.order_detail.payment_title}</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div>
              <span className="text-gray-600">{dict.order_detail.labels.provider}:</span>{' '}
              <span className="font-medium">{provider}</span>
            </div>

            {payment?.mode && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.mode}:</span>{' '}
                <span className="font-medium">{payment.mode}</span>
              </div>
            )}
            {payment?.verbiage && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.state}:</span>{' '}
                <span className="font-medium">{payment.verbiage}</span>
              </div>
            )}
            {payment?.AuthorizationNumber && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.authorization}:</span>{' '}
                <span className="font-medium">{payment.AuthorizationNumber}</span>
              </div>
            )}
            {serviceRef && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.reference}:</span>{' '}
                <span className="font-medium">{serviceRef}</span>
              </div>
            )}
            {payment?.UserTransactionNumber && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.utn}:</span>{' '}
                <span className="font-medium">{payment.UserTransactionNumber}</span>
              </div>
            )}
            {(payment?.CardType || payment?.LastFour) && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.card}:</span>{' '}
                <span className="font-medium">{maskCard(payment.CardType, payment.LastFour)}</span>
              </div>
            )}

            <div>
              <span className="text-gray-600">{dict.order_detail.labels.invoice}:</span>{' '}
              <span className="font-medium">{invoice || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">{dict.order_detail.labels.transaction}:</span>{' '}
              <span className="font-medium">{trxId || '—'}</span>
            </div>
            {checkoutSessionDisplay && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.checkout_session}:</span>{' '}
                <span className="font-medium">{String(checkoutSessionDisplay)}</span>
              </div>
            )}
            {paidOn && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.paid_on}:</span>{' '}
                <span className="font-medium">{dt(paidOn)}</span>
              </div>
            )}
          </div>

          {payLink && (
            <div className="md:col-span-1">
              <a
                href={payLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 underline underline-offset-2 mt-1"
                title={dict.order_detail.labels.view_payment_link}
              >
                {dict.order_detail.labels.view_payment_link} <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Envío */}
      {order.metadata?.shipping && (
        <div className="bg-white border rounded">
          <div className="p-4 border-b font-semibold">{dict.order_detail.shipping_title}</div>
          <div className="p-4 text-sm space-y-1">
            <div>
              <span className="text-gray-600">{dict.order_detail.labels.recipient}:</span>{' '}
              <span className="font-medium">
                {order.metadata.shipping?.first_name} {order.metadata.shipping?.last_name}
              </span>
            </div>
            {order.metadata.shipping?.email && (
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.email}:</span>{' '}
                <span className="font-medium">{order.metadata.shipping.email}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">{dict.order_detail.labels.phone}:</span>{' '}
              <span className="font-medium">{order.metadata.shipping?.phone}</span>
            </div>

            {order.metadata.shipping?.country === 'US' ? (
              <>
                <div>
                  <span className="text-gray-600">{dict.order_detail.labels.address}:</span>{' '}
                  <span className="font-medium">
                    {order.metadata.shipping?.address_line1}
                    {order.metadata.shipping?.address_line2
                      ? `, ${order.metadata.shipping.address_line2}`
                      : ''}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{dict.order_detail.labels.city_state_zip}:</span>{' '}
                  <span className="font-medium">
                    {order.metadata.shipping?.city}, {order.metadata.shipping?.state}{' '}
                    {order.metadata.shipping?.zip}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-gray-600">{dict.order_detail.labels.address}:</span>{' '}
                  <span className="font-medium">{order.metadata.shipping?.address}</span>
                </div>
                <div>
                  <span className="text-gray-600">
                    {dict.order_detail.labels.municipality_province}:
                  </span>{' '}
                  <span className="font-medium">
                    {order.metadata.shipping?.municipality}, {order.metadata.shipping?.province}
                  </span>
                </div>
                {order.metadata.shipping?.ci && (
                  <div>
                    <span className="text-gray-600">{dict.order_detail.labels.ci}:</span>{' '}
                    <span className="font-medium">{order.metadata.shipping.ci}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Entrega */}
      {delivery?.delivered && (
        <div className="bg-white border rounded">
          <div className="p-4 border-b font-semibold">{dict.order_detail.delivery_title}</div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="md:col-span-2 space-y-1">
              <div>
                <span className="text-gray-600">{dict.order_detail.labels.delivery_state}:</span>{' '}
                <span className="font-medium text-emerald-700">
                  {dict.order_detail.labels.delivered}
                </span>
              </div>
              {deliveredAt && (
                <div>
                  <span className="text-gray-600">
                    {dict.order_detail.labels.delivery_date}:
                  </span>{' '}
                  <span className="font-medium">{deliveredAt}</span>
                </div>
              )}
              {delivery?.notes && (
                <div>
                  <span className="text-gray-600">{dict.order_detail.labels.notes}:</span>{' '}
                  <span className="font-medium">{delivery.notes}</span>
                </div>
              )}
            </div>

            {delivery?.photo_url ? (
              <div className="md:col-span-1">
                <a
                  href={delivery.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  title={dict.order_detail.labels.view_delivery_photo}
                  className="block"
                >
                  <img
                    src={delivery.photo_url}
                    alt={`${dict.order_detail.order_label} #${order.id}`}
                    className="w-full h-40 object-cover rounded border"
                  />
                  <div className="mt-1 text-xs text-gray-600 underline underline-offset-2">
                    {dict.order_detail.labels.view_full_size}
                  </div>
                </a>
              </div>
            ) : (
              <div className="md:col-span-1 text-xs text-gray-500">
                {dict.order_detail.labels.no_photo}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Productos */}
      {order.items && order.items.length > 0 && (
        <div className="bg-white border rounded">
          <div className="p-4 border-b font-semibold">{dict.order_detail.products_title}</div>
          <ul className="divide-y">
            {order.items.map((it, idx) => (
              <li key={`${it.product_id}-${idx}`} className="p-4 flex items-center gap-3">
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt={
                      it.product_name || `${dict.order_detail.product_fallback} ${it.product_id}`
                    }
                    className="w-12 h-12 object-cover rounded border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded border bg-gray-100" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {it.product_name || `${dict.order_detail.product_fallback} #${it.product_id}`}
                  </div>
                  <div className="text-xs text-gray-600">x{it.quantity}</div>
                </div>
                <div className="text-sm font-semibold">
                  {fmtUsd(Number(it.unit_price) * Number(it.quantity))}
                </div>
              </li>
            ))}
          </ul>

          {/* Resumen final de importes */}
          <div className="p-4 text-right text-sm space-y-1">
            <div>
              <span className="font-medium">{dict.order_detail.totals.subtotal} </span>
              <span>{fmtUsd(displaySubtotal)}</span>
            </div>
            {tax != null && (
              <div>
                <span className="font-medium">{dict.order_detail.totals.taxes} </span>
                <span>{fmtUsd(tax)}</span>
              </div>
            )}
            <div>
              <span className="font-medium">{dict.order_detail.totals.shipping} </span>
              <span>{fmtUsd(shippingUsd)}</span>
            </div>
            <div>
              <span className="font-medium">{dict.order_detail.totals.total_wo_fee} </span>
              <span>{fmtUsd(baseTotal)}</span>
            </div>
            <div>
              <span className="font-medium">
                {dict.order_detail.totals.card_fee_label} ({CARD_FEE_PCT}%):{' '}
              </span>
              <span>{fmtUsd(cardFee)}</span>
            </div>
            <div className="text-base">
              <span className="font-semibold">{dict.order_detail.totals.total_with_card} </span>
              <span className="font-semibold">{fmtUsd(totalWithCardFee)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        <a href={`/${locale}/orders`} className="px-4 py-2 border rounded hover:bg-gray-50">
          {dict.order_detail.back_to_history}
        </a>
        <a href={`/${locale}`} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          {dict.order_detail.continue_shopping}
        </a>
      </div>
    </div>
  )
}
