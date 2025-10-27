'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useCustomer } from '@/context/CustomerContext'
import type { Dict } from '@/types/Dict'
import Thumb from '@/components/Thumb'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

// % fee de tarjeta configurable (default 3)
const CARD_FEE_PCT = Number(process.env.NEXT_PUBLIC_CARD_FEE_PCT ?? '3')
const FEE_RATE = Number.isFinite(CARD_FEE_PCT) ? CARD_FEE_PCT / 100 : 0
const round2 = (n: number) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100

type Item = {
  product_id: number | null
  variant_id?: number | null
  product_name?: string
  product_name_en?: string

  quantity: number
  unit_price: number

  image_url?: string | null
  thumbnail?: string | null

  option1?: string | null
  option2?: string | null
  option3?: string | null
  variant_label?: string

  source_url?: string | null

  // 👇 NUEVO: lo que ya estás leyendo en el código
  metadata?: {
    // puede venir como string "Color: Negro / Talla: M"
    // o como objeto { option1, option2, option3 } o { Color: 'Negro', Talla: 'M' }
    variant_options?:
    | string
    | {
      option1?: string | null
      option2?: string | null
      option3?: string | null
      [k: string]: unknown
    }
    | Record<string, string>
    // si algún día guardas la imagen directa de la variante en el line item
    variant_image_url?: string
    [k: string]: unknown
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

type OwnerContact = {
  id?: number | string
  name?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
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
  owner_id?: number | string
  owner?: OwnerContact | null
}

type CustomerOrderListRow = {
  order_id?: number | string
  id?: number | string
  items?: Item[]
}

type StatusTimes = {
  shipped_at?: string
  delivered_at?: string
  [k: string]: unknown
}

// Normaliza variant_options si vino en metadata como string u objeto
function parseVariantOptions(
  raw: unknown
): { option1?: string | null; option2?: string | null; option3?: string | null } {
  if (!raw) return {}

  // Si es string tipo "Color: Rojo / Talla: M"
  if (typeof raw === 'string') {
    const parts = raw.split(/[\/|·|-]/).map(s => s.trim()).filter(Boolean)
    // nos quedamos con solo los valores (parte a la derecha de ":")
    const values = parts.map(p => (p.includes(':') ? p.split(':')[1] : p).trim()).filter(Boolean)
    return {
      option1: values[0] ?? null,
      option2: values[1] ?? null,
      option3: values[2] ?? null,
    }
  }

  // Si es objeto { option1, option2, option3 } o { Color: 'Rojo', Talla: 'M' }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    // prioridad a keys estándar
    const o1 = (obj.option1 ?? obj.Option1 ?? null)
    const o2 = (obj.option2 ?? obj.Option2 ?? null)
    const o3 = (obj.option3 ?? obj.Option3 ?? null)

    if (o1 || o2 || o3) {
      return {
        option1: (o1 as string) ?? null,
        option2: (o2 as string) ?? null,
        option3: (o3 as string) ?? null,
      }
    }

    // si no existen, tomar los PRIMEROS 3 valores del objeto (Color, Talla, etc.)
    const vals = Object.values(obj).map(String).filter(Boolean)
    return {
      option1: vals[0] ?? null,
      option2: vals[1] ?? null,
      option3: vals[2] ?? null,
    }
  }

  return {}
}

// Devuelve un NUEVO item con option1/2/3 pobladas desde la mejor fuente
function normalizeItemVariant(it: Item): Item {
  const { option1, option2, option3 } = it

  // 1) si ya vienen en campos sueltos, estamos bien
  if (option1 || option2 || option3) return it

  // 2) intentar en metadata.variant_options
  const parsed = parseVariantOptions(it.metadata?.variant_options)
  if (parsed.option1 || parsed.option2 || parsed.option3) {
    return { ...it, ...parsed }
  }

  return it
}

// --- Detalle de producto (mínimo necesario para resolver imágenes de variantes) ---
type VariantLite = {
  id: number
  option1?: string | null
  option2?: string | null
  option3?: string | null
  image_url?: string | null
  archived?: boolean
  stock_qty?: number | null
}

type ProductOptionLite = { id: number; position: 1 | 2 | 3; name: string; values: string[] }

type ProductDetailLite = {
  id: number
  imageSrc?: string | null
  image_url?: string | null
  variants?: VariantLite[] | null
  options?: ProductOptionLite[] | null
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function toStringOrNull(x: unknown): string | null {
  return typeof x === 'string' ? x : null
}

function toNumberOrNull(x: unknown): number | null {
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

function parseVariantList(raw: unknown): VariantLite[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((v): VariantLite | null => {
      if (!isRecord(v)) return null
      const id = toNumberOrNull(v.id)
      if (id == null) return null
      return {
        id,
        option1: toStringOrNull(v.option1 ?? (v as Record<string, unknown>).Option1 ?? null),
        option2: toStringOrNull(v.option2 ?? (v as Record<string, unknown>).Option2 ?? null),
        option3: toStringOrNull(v.option3 ?? (v as Record<string, unknown>).Option3 ?? null),
        image_url: toStringOrNull(v.image_url ?? (v as Record<string, unknown>).imageUrl ?? null),
        archived: Boolean(v.archived),
        stock_qty: toNumberOrNull(v.stock_qty ?? null),
      }
    })
    .filter(Boolean) as VariantLite[]
}

function parseOptions(raw: unknown): ProductOptionLite[] | null {
  if (!Array.isArray(raw)) return null
  const out: ProductOptionLite[] = []
  for (const o of raw) {
    if (!isRecord(o)) continue
    const id = toNumberOrNull(o.id)
    const pos = toNumberOrNull(o.position)
    const name = toStringOrNull(o.name)
    const values = Array.isArray(o.values) ? o.values.map(String) : []
    if (id == null || pos == null || pos < 1 || pos > 3 || !name) continue
    out.push({ id, position: pos as 1 | 2 | 3, name, values })
  }
  return out
}

async function fetchProductDetailLite(productId: number): Promise<ProductDetailLite | null> {
  try {
    const r = await fetch(`${API_URL}/products/${productId}`, { cache: 'no-store' })
    if (!r.ok) return null
    const j: unknown = await r.json().catch(() => null)
    if (!isRecord(j)) return null

    const id = toNumberOrNull(j.id)
    if (id == null) return null

    const baseImg =
      toStringOrNull(j.imageSrc) ??
      toStringOrNull(j.image_url) ??
      toStringOrNull((j as Record<string, unknown>).imageUrl) ??
      null

    return {
      id,
      imageSrc: baseImg,
      image_url: baseImg,
      variants: parseVariantList(j.variants),
      options: parseOptions(j.options),
    }
  } catch {
    return null
  }
}



function matchVariantForItem(
  variants: VariantLite[] | undefined | null,
  it: Item
): VariantLite | null {
  if (!variants || variants.length === 0) return null

  // 1) por variant_id directo
  if (it.variant_id != null) {
    const byId = variants.find(v => Number(v.id) === Number(it.variant_id))
    if (byId) return byId
  }

  // 2) por valores (option1/2/3) normalizados
  const o1 = (it.option1 ?? '').trim()
  const o2 = (it.option2 ?? '').trim()
  const o3 = (it.option3 ?? '').trim()

  if (o1 || o2 || o3) {
    const hit = variants.find(v =>
      (o1 ? (v.option1 ?? '').trim() === o1 : true) &&
      (o2 ? (v.option2 ?? '').trim() === o2 : true) &&
      (o3 ? (v.option3 ?? '').trim() === o3 : true)
    )
    if (hit) return hit
  }

  return null
}

/** Decide la mejor imagen para el ítem:
 * 1) metadata.variant_image_url (si algún día lo envías)
 * 2) variante.image_url (resuelta contra /products/:id)
 * 3) item.image_url (del snapshot del pedido)
 * 4) product.image_url (del detalle)
 */
function resolveItemImageUrl(
  it: Item,
  detail: ProductDetailLite | null,
  variant: VariantLite | null
): string | undefined {
  // 1) metadata.variant_image_url (si algún día lo envías)
  const metaImg = it.metadata?.variant_image_url
if (metaImg && metaImg.trim()) return metaImg.trim()


  // 2) imagen propia de la variante resuelta
  const varImg = variant?.image_url
  if (varImg && String(varImg).trim()) return String(varImg).trim()

  // 3) snapshot del ítem en la orden
  const itemImg = it.image_url
  if (itemImg && String(itemImg).trim()) return String(itemImg).trim()

  // 4) “hero” del producto: soporta imageSrc o image_url
  const prodImg = (detail?.imageSrc || detail?.image_url) as string | undefined
  if (prodImg && String(prodImg).trim()) return String(prodImg).trim()

  return undefined
}



// Texto final para UI: "Rojo · M" o "Color: Rojo · Talla: M" si viniera con etiquetas
function variantTextFor(it: Item): string {
  // si metadata.variant_options es string con etiquetas, úsalo tal cual
  if (typeof it.metadata?.variant_options === 'string' && it.metadata.variant_options.trim()) {
    // formatear separadores a " · "
    return it.metadata.variant_options.replace(/[\/|]/g, ' · ').replace(/\s{2,}/g, ' ').trim()
  }

  // si metadata.variant_options es objeto con etiquetas legibles, construir "Etiqueta: Valor"
  if (it.metadata?.variant_options && typeof it.metadata.variant_options === 'object') {
    const obj = it.metadata.variant_options as Record<string, string>
    const kv = Object.entries(obj)
   .filter(([, v]) => !!v)
   .map(([k, v]) => `${k}: ${v}`)
    if (kv.length) return kv.join(' · ')
  }

  // caso simple: mostrar solo los valores
  const vals = [it.option1, it.option2, it.option3].filter(Boolean) as string[]
  return vals.join(' · ')
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

  const cleanDigits = (s?: string | null) => String(s || '').replace(/[^\d+]/g, '')

  const getOwner = (o?: Order | null): OwnerContact | null => o?.owner ?? null

  const [resolvedImgs, setResolvedImgs] = useState<string[]>([])


  useEffect(() => {
    const run = async () => {
      try {
        // 1) Intentar el endpoint que trae items con fallback desde metadata (encargos)
        const rDetail = await fetch(`${API_URL}/orders/${id}/detail`, {
          headers: authHeaders(),
          cache: 'no-store',
        })

        if (rDetail.ok) {
          const d = await rDetail.json().catch(() => null) as { order?: Order; items?: Item[] } | null
          if (d?.order) {
            // normalizamos variantes en items
            const list = Array.isArray(d.items) ? d.items : []
            const normalized = list.map(normalizeItemVariant)
            const ord = { ...d.order, items: normalized }

            setOrder(ord)

            /* ============ 👇🏻 AQUI VA EL PASO 3 (resolución de imágenes) ============ */
            try {
              const items = normalized
              // Traemos /products/:id UNA sola vez por product_id
              const uniqueIds = Array.from(
                new Set(items.map(it => Number(it.product_id)).filter(n => Number.isFinite(n)))
              ) as number[]

              const detailsMap = new Map<number, ProductDetailLite | null>()
              await Promise.all(
                uniqueIds.map(async (pid) => {
                  const det = await fetchProductDetailLite(pid)
                  detailsMap.set(pid, det)
                })
              )

              const resolved = items.map((it) => {
                const pid = Number(it.product_id)
                const det = Number.isFinite(pid) ? (detailsMap.get(pid) ?? null) : null
                const variant = matchVariantForItem(det?.variants ?? [], it)
                const url = resolveItemImageUrl(it, det, variant)
                return url ?? '' // string vacío si nada
              })

              setResolvedImgs(resolved)

            } catch {
              setResolvedImgs(normalized.map(it => it.image_url || ''))
            }
            /* ============ ☝🏻 FIN PASO 3 ============ */

            return
          }
        }

        // 2) Fallback: /orders/:id (puede no traer items en encargos)
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

        // 3) Segundo fallback: intentar reconstruir items desde listado del cliente
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
                const match = typedList.find((o) => Number(o.order_id ?? o.id) === targetIdNum)
                const itemsFromList = extractItems(match)
                if (itemsFromList.length) {
                  ord = { ...ord, items: itemsFromList.map(normalizeItemVariant) }
                }
              }
            }
          } catch { /* noop */ }
        }

        // siempre normalizamos si hay items
        const finalOrder = ord.items ? { ...ord, items: ord.items.map(normalizeItemVariant) } : ord
        setOrder(finalOrder)

        /* ============ 👇🏻 PASO 3 TAMBIÉN APLICA EN ESTE CAMINO ============ */
        try {
          const items = (finalOrder.items ?? [])
          const uniqueIds = Array.from(
            new Set(items.map(it => Number(it.product_id)).filter(n => Number.isFinite(n)))
          ) as number[]

          const detailsMap = new Map<number, ProductDetailLite | null>()
          await Promise.all(
            uniqueIds.map(async (pid) => {
              const det = await fetchProductDetailLite(pid)
              detailsMap.set(pid, det)
            })
          )

          const resolved = items.map((it) => {
            const pid = Number(it.product_id)
            const det = Number.isFinite(pid) ? (detailsMap.get(pid) ?? null) : null
            const variant = matchVariantForItem(det?.variants ?? [], it)
            const url = resolveItemImageUrl(it, det, variant)
            return url ?? ''
          })

          setResolvedImgs(resolved)
        } catch {
          setResolvedImgs((finalOrder.items ?? []).map(it => it.image_url || ''))
        }
        /* ============ ☝🏻 FIN PASO 3 ============ */

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

  const payment = order?.metadata?.payment
  const bms = order?.metadata?.bmspay_transaction

  const pricing = order?.metadata?.pricing as
    | { subtotal?: number; tax?: number; total?: number; shipping?: number; card_fee?: number }
    | undefined;

  const pc = order?.metadata?.pricing_cents as
    | {
      subtotal_cents?: number;
      tax_cents?: number;
      shipping_total_cents?: number;
      card_fee_cents?: number;
      total_with_card_cents?: number;
      charged_usd?: number;
    }
    | undefined;

  let displaySubtotal = 0;
  let tax = 0;
  let shippingUsd = 0;
  let baseTotal = 0;          // total SIN fee
  let cardFee = 0;
  let totalWithCardFee = 0;

  // 1) Preferir pricing_cents si está
  if (pc) {
    const sub = (pc.subtotal_cents ?? 0) / 100;
    const tx = (pc.tax_cents ?? 0) / 100;
    const shp = (pc.shipping_total_cents ?? 0) / 100;
    const fee = (pc.card_fee_cents ?? 0) / 100;
    const totalCardCents = pc.total_with_card_cents ?? Math.round((sub + tx + shp + fee) * 100);

    displaySubtotal = sub;
    tax = tx;
    shippingUsd = shp;
    baseTotal = Math.round((sub + tx + shp) * 100) / 100;
    cardFee = fee;
    totalWithCardFee = totalCardCents / 100;

    // 2) Si no hay _cents_ pero sí pricing.total y pricing.card_fee → total ya incluye fee
  } else if (pricing?.total != null && pricing?.card_fee != null) {
    displaySubtotal = Number(pricing.subtotal ?? 0);
    tax = Number(pricing.tax ?? 0);
    shippingUsd = Number(pricing.shipping ?? 0);
    totalWithCardFee = Number(pricing.total);
    cardFee = Number(pricing.card_fee);
    baseTotal = Math.round((totalWithCardFee - cardFee) * 100) / 100;

    // 3) Fallback: calcula desde items + tax y aplica fee
  } else {
    const sumItems = (order?.items || []).reduce(
      (s, it) => s + Number(it.unit_price) * Number(it.quantity),
      0
    );
    displaySubtotal = Number(pricing?.subtotal ?? sumItems);
    tax = Number(pricing?.tax ?? 0);
    shippingUsd = Number(pricing?.shipping ?? 0);
    baseTotal = Math.round((displaySubtotal + tax + shippingUsd) * 100) / 100;
    cardFee = round2(baseTotal * FEE_RATE);
    totalWithCardFee = round2(baseTotal + cardFee);
  }

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
  const statusTimes = (order?.metadata?.status_times as StatusTimes | undefined) ?? {}

  // ¿Está entregada?
  const deliveredFlag =
    (delivery?.delivered === true) || (order?.status === 'delivered')

  // Fecha ISO (preferimos la de delivery, si no, la de status_times)
  const deliveredAtIso: string | undefined =
    delivery?.delivered_at || statusTimes.delivered_at

  const deliveredAt = deliveredAtIso
    ? new Date(deliveredAtIso).toLocaleString(locale || 'es')
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

  const itemTitle = (it: Item) => {
    const en = (it.product_name_en || '').trim()
    const base = (it.product_name || '').trim()
    const fallback = `${dict.order_detail.product_fallback} #${it.product_id ?? ''}`
    return (locale || 'es').toLowerCase().startsWith('en')
      ? (en || base || fallback)
      : (base || en || fallback)
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
                  ? 'bg-yellow-100 text-yellow-700'
                  : order.status === 'pending'
                    ? 'bg-yellow-900 text-yellow-900'
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
            {/* ---- Datos del Owner (Proveedor) ---- */}
            {(() => {
              const owner = getOwner(order)
              if (!owner) return null
              const tel = cleanDigits(owner.phone || undefined)
              const wa = cleanDigits(owner.whatsapp || undefined)

              return (
                <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-sm font-semibold text-emerald-900">
                    {dict.order_detail.labels?.owner || 'Proveedor'}
                  </div>

                  {owner.name && (
                    <div className="text-sm text-emerald-900">
                      <span className="text-emerald-800/80">
                        {dict.order_detail.labels?.owner_name || 'Nombre'}:
                      </span>{' '}
                      <span className="font-medium">{owner.name}</span>
                    </div>
                  )}

                  {(owner.phone || owner.whatsapp || owner.email) && (
                    <div className="mt-1 space-y-0.5 text-sm text-emerald-900">
                      {owner.phone && (
                        <div>
                          <span className="text-emerald-800/80">
                            {dict.order_detail.labels?.phone || 'Teléfono'}:
                          </span>{' '}
                          {tel ? (
                            <a
                              href={`tel:${tel}`}
                              className="underline underline-offset-2 text-emerald-800 hover:text-emerald-900"
                            >
                              {owner.phone}
                            </a>
                          ) : (
                            <span className="font-medium">{owner.phone}</span>
                          )}
                        </div>
                      )}

                      {owner.whatsapp && (
                        <div>
                          <span className="text-emerald-800/80">WhatsApp:</span>{' '}
                          {wa ? (
                            <a
                              href={`https://wa.me/${wa.replace(/^\+/, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-2 text-emerald-800 hover:text-emerald-900"
                            >
                              {owner.whatsapp}
                            </a>
                          ) : (
                            <span className="font-medium">{owner.whatsapp}</span>
                          )}
                        </div>
                      )}

                      {owner.email && (
                        <div>
                          <span className="text-emerald-800/80">Email:</span>{' '}
                          <a
                            href={`mailto:${owner.email}`}
                            className="underline underline-offset-2 text-emerald-800 hover:text-emerald-900"
                          >
                            {owner.email}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

          </div>
        </div>
      )}

      {/* Entrega */}
      {deliveredFlag && (
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
                  <span className="text-gray-600">{dict.order_detail.labels.delivery_date}:</span>{' '}
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
              <li
              key={`${it.product_id}-${it.variant_id ?? 'no-var'}-${idx}`}
              className="p-4 flex items-center gap-3"
            >
              {(resolvedImgs[idx] || it.image_url) ? (
                <Thumb
                  src={(resolvedImgs[idx] || it.image_url)!}
                  alt={itemTitle(it)}
                  size={48}
                />
              ) : (
                <div className="w-12 h-12 rounded border bg-gray-100" />
              )}
            
              <div className="flex-1 min-w-0">
                {/* Título (una sola vez) */}
                <div className="text-sm font-medium line-clamp-2" title={itemTitle(it)}>
                  {itemTitle(it) || `${dict.order_detail.product_fallback} #${it.product_id}`}
                </div>
            
                {/* Variante: muestra solo una fuente */}
                {(() => {
                  const variantLine = (it.variant_label && it.variant_label.trim())
                    ? it.variant_label.trim()
                    : (variantTextFor(it) || '');
                  return variantLine ? (
                    <div className="text-xs text-gray-500 mt-0.5">{variantLine}</div>
                  ) : null;
                })()}
            
                <div className="text-xs text-gray-600">x{Number(it.quantity)}</div>
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
