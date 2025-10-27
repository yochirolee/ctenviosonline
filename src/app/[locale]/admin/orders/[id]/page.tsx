'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminGuard from '@/components/admin/AdminGuard'
import { getAdminOrderDetail, type AdminOrderDetail, type AdminOrderItem } from '@/lib/adminApi'
import { ArrowLeft, ExternalLink } from 'lucide-react'

type DeliveryMeta = {
  delivered?: boolean
  delivered_at?: string
  photo_url?: string
  notes?: string
  delivered_by?: string
}

type ShippingUS = {
  country: 'US'
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  address_line1?: string
  address_line2?: string | null
  city?: string
  state?: string
  zip?: string
  instructions?: string | null
}

type ShippingIntl = {
  country?: string // cualquier país ≠ 'US'
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  address?: string | null
  municipality?: string | null
  province?: string | null
  ci?: string | null
  instructions?: string | null
}

type Shipping = ShippingUS | ShippingIntl
const isUS = (s: Shipping | null | undefined): s is ShippingUS => s?.country === 'US'

type BmsPayTx = {
  InvoiceNumber?: string
  Id?: string
  ServiceReferenceNumber?: string
  PaidOn?: string
  Status?: number
  StatusText?: string
  Link?: string
}

type DirectPay = {
  provider?: string
  mode?: 'direct' | 'link' | string
  AuthorizationNumber?: string
  ServiceReferenceNumber?: string
  UserTransactionNumber?: string
  CardType?: string
  LastFour?: string
  verbiage?: string
  invoice?: string
  link?: string
}

type PricingCents = {
  subtotal_cents?: number
  tax_cents?: number
  shipping_total_cents?: number
  card_fee_cents?: number
  total_with_card_cents?: number
  charged_usd?: number
}

type SnapshotPricing = {
  subtotal?: number
  tax?: number
  shipping?: number
  total?: number            // total sin fee
  card_fee?: number         // fee absoluto
  total_with_card?: number  // total con fee
  card_fee_pct?: number     // % aplicado
}

type OrderMetadata = {
  shipping?: Shipping | null
  bmspay_transaction?: BmsPayTx | null
  payment?: DirectPay | null
  checkout_session_id?: string
  session_id?: string
  pricing?: Partial<SnapshotPricing>
  pricing_cents?: PricingCents
  shipping_by_owner?: Record<string, number>
  snapshot?: { shipping_by_owner?: Record<string, number> }
  delivery?: DeliveryMeta | null
}

export default function AdminOrderDetailPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<AdminOrderDetail | null>(null)

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  useEffect(() => {
    (async () => {
      try {
        const d = await getAdminOrderDetail(Number(id))
        setData(d)
      } catch (e) {
        console.error(e)
        setErr('No se pudo cargar la orden')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return (
      <AdminGuard>
        <div className="max-w-5xl mx-auto p-6">Cargando…</div>
      </AdminGuard>
    )
  }
  if (err || !data) {
    return (
      <AdminGuard>
        <div className="max-w-5xl mx-auto p-6">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800">
            <ArrowLeft size={18} /><span className="underline underline-offset-2">Atrás</span>
          </button>
          <div className="mt-4 text-red-600">{err || 'No encontrado'}</div>
        </div>
      </AdminGuard>
    )
  }

  const { order, items } = data as AdminOrderDetail
  const itemsList: AdminOrderItem[] = items ?? []
  

  const md: OrderMetadata = (order.metadata ?? {}) as OrderMetadata
  const shipping = md.shipping ?? null
  const bms = md.bmspay_transaction ?? null
  const pay = md.payment ?? null

  // Datos de pago: mantener comportamiento existente
  const payInvoice =
    pay?.invoice || bms?.InvoiceNumber || String(md.session_id || '')
  const payLink = pay?.link || bms?.Link || null

  const delivery = (md.delivery ?? null) as DeliveryMeta | null
  const deliveredAt = delivery?.delivered_at
    ? new Date(delivery.delivered_at).toLocaleString()
    : null

  // Desglose de envío por owner (opcional)
  const shippingByOwner: Record<string, number> | null =
    md.shipping_by_owner ?? md.snapshot?.shipping_by_owner ?? null

  // Derivados de pago (link/directo)
  const provider = pay?.provider || (bms ? 'bmspay' : order.payment_method || '—')
  const mode =
    pay?.mode || (pay?.AuthorizationNumber || pay?.LastFour ? 'direct' : (payLink ? 'link' : undefined))
  const authNum = pay?.AuthorizationNumber || null
  const serviceRef = pay?.ServiceReferenceNumber || bms?.ServiceReferenceNumber || null
  const utn = pay?.UserTransactionNumber || null
  const cardMasked =
    (pay?.CardType || pay?.LastFour) ? `${pay.CardType || 'Card'} •••• ${pay.LastFour || '••••'}` : null
  const checkoutSessionDisplay = md.checkout_session_id ?? md.session_id ?? null

  // Estado de aprobación (mostrar si disponible)
  const statusTextRaw =
    (typeof pay?.verbiage === 'string' ? pay.verbiage : undefined) ||
    (typeof bms?.StatusText === 'string' ? bms.StatusText : undefined) ||
    (typeof bms?.Status === 'number' ? (bms.Status === 1 ? 'APPROVED' : undefined) : undefined)

  const approvedDisplay = statusTextRaw && /approved/i.test(statusTextRaw) ? 'APPROVED' : (statusTextRaw || null)

  // -------------------------
  // CÁLCULO DE TOTALES ROBUSTO (SIN any)
  // -------------------------
  const pc: PricingCents | undefined = md.pricing_cents

  const pr: SnapshotPricing = {
    subtotal: md.pricing?.subtotal,
    tax: md.pricing?.tax,
    shipping: md.pricing?.shipping,
    total: md.pricing?.total,
    card_fee: md.pricing?.card_fee,
    total_with_card: md.pricing?.total_with_card,
    card_fee_pct: md.pricing?.card_fee_pct,
  }

  // Permite usar un posible % guardado a nivel de orden si existe tipándolo sin any
  const orderWithPct = order as { card_fee_pct?: number }
  const pct =
    typeof pr.card_fee_pct === 'number'
      ? pr.card_fee_pct
      : (typeof orderWithPct.card_fee_pct === 'number' ? orderWithPct.card_fee_pct : 3)

  let calcSubtotal = 0
  let calcTax = 0
  let calcShipping = 0
  let baseTotal = 0         // total sin fee
  let cardFee = 0
  let totalWithCard = 0

  if (pc) {
    const sub = (pc.subtotal_cents ?? 0) / 100
    const tx = (pc.tax_cents ?? 0) / 100
    const shp = (pc.shipping_total_cents ?? 0) / 100
    const fee = (pc.card_fee_cents ?? 0) / 100
    const twc = pc.total_with_card_cents != null
      ? pc.total_with_card_cents / 100
      : Number((sub + tx + shp + fee).toFixed(2))

    calcSubtotal = sub
    calcTax = tx
    calcShipping = shp
    cardFee = fee
    baseTotal = Number((sub + tx + shp).toFixed(2))
    totalWithCard = twc
  } else if (pr.total_with_card != null || (pr.total != null && pr.card_fee != null)) {
    // si viene total con fee o total+fee por separado
    const base = Number(pr.total ?? ((pr.subtotal ?? 0) + (pr.tax ?? 0) + (pr.shipping ?? 0)))
    const fee  = Number(pr.card_fee ?? (Number(pr.total_with_card!) - base))
    const twc  = Number(pr.total_with_card ?? (base + fee))

    calcSubtotal = Number(pr.subtotal ?? 0)
    calcTax = Number(pr.tax ?? 0)
    calcShipping = Number(pr.shipping ?? 0)
    baseTotal = Number(base.toFixed(2))
    cardFee = Number(fee.toFixed(2))
    totalWithCard = Number(twc.toFixed(2))
  } else {
    // Fallback: base a partir de subtotal+tax+shipping y fee por % configurado
    calcSubtotal = Number(pr.subtotal ?? 0)
    calcTax = Number(pr.tax ?? 0)
    calcShipping = Number(pr.shipping ?? 0)
    baseTotal = Number(((calcSubtotal + calcTax + calcShipping)).toFixed(2))
    cardFee = Number((baseTotal * (pct / 100)).toFixed(2))
    totalWithCard = Number((baseTotal + cardFee).toFixed(2))
  }

  return (
    <AdminGuard>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800">
            <ArrowLeft size={18} /><span className="underline underline-offset-2">Atrás</span>
          </button>
          <div className="text-right">
            <div className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</div>
            <div className="mt-1 text-xs px-2 py-1 rounded bg-gray-100 inline-block">{order.status}</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Orden #{order.id}</h1>

        {/* Cliente */}
        <div className="bg-white border rounded">
          <div className="p-4 border-b font-semibold">Cliente</div>
          <div className="p-4 text-sm grid md:grid-cols-2 gap-4">
            <div>
              <div><span className="text-gray-600">Nombre:</span> <span className="font-medium">{order.customer?.name || '—'}</span></div>
              <div><span className="text-gray-600">Email:</span> <span className="font-medium">{order.customer?.email || '—'}</span></div>
              <div><span className="text-gray-600">Teléfono:</span> <span className="font-medium">{order.customer?.phone ?? '—'}</span></div>
              <div><span className="text-gray-600">Dirección:</span> <span className="font-medium">{order.customer?.address ?? '—'}</span></div>
            </div>
            <div>
              <div><span className="text-gray-600">Método (orden):</span> <span className="font-medium">{order.payment_method || '—'}</span></div>
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="bg-white border rounded">
          <div className="p-4 border-b font-semibold">Pago</div>
          <div className="p-4 grid md:grid-cols-2 gap-4 text-sm">
            {/* Metadatos transaccionales */}
            <div>
              <div><span className="text-gray-600">Proveedor:</span> <span className="font-medium">{provider}</span></div>
              {mode && (<div><span className="text-gray-600">Modo:</span> <span className="font-medium">{mode}</span></div>)}
              <div><span className="text-gray-600">Invoice:</span> <span className="font-medium">{payInvoice || '—'}</span></div>
              {checkoutSessionDisplay && (
                <div><span className="text-gray-600">Checkout session:</span> <span className="font-medium">{String(checkoutSessionDisplay)}</span></div>
              )}
              {payLink && (
                <div className="mt-1">
                  <a href={payLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-green-700 underline">
                    Ver enlace de pago <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {/* Campos de pago link (BMS) */}
              {bms?.InvoiceNumber && (<div className="mt-2"><span className="text-gray-600">Invoice (BMS):</span> <span className="font-medium">{bms.InvoiceNumber}</span></div>)}
              {bms?.Id && (<div><span className="text-gray-600">Tx:</span> <span className="font-medium">{bms.Id}</span></div>)}
              {bms?.ServiceReferenceNumber && (<div><span className="text-gray-600">Ref. servicio:</span> <span className="font-medium">{bms.ServiceReferenceNumber}</span></div>)}
              {bms?.PaidOn && (<div><span className="text-gray-600">Pagado el:</span> <span className="font-medium">{new Date(bms.PaidOn).toLocaleString()}</span></div>)}

              {/* Campos de pago directo */}
              {authNum && (<div className="mt-2"><span className="text-gray-600">Autorización:</span> <span className="font-medium">{authNum}</span></div>)}
              {serviceRef && !bms?.ServiceReferenceNumber && (
                <div><span className="text-gray-600">Ref. servicio:</span> <span className="font-medium">{serviceRef}</span></div>
              )}
              {utn && (<div><span className="text-gray-600">UTN:</span> <span className="font-medium">{utn}</span></div>)}
              {cardMasked && (<div><span className="text-gray-600">Tarjeta:</span> <span className="font-medium">{cardMasked}</span></div>)}

              {/* Estado de la transacción, si está disponible */}
              {approvedDisplay && (
                <div className="mt-2">
                  <span className="text-gray-600">Estado:</span>{' '}
                  <span className="font-semibold">{approvedDisplay}</span>
                </div>
              )}
            </div>

            {/* Totales calculados de forma segura */}
            <div>
              <div><span className="text-gray-600">Subtotal:</span> <span className="font-medium">{fmt.format(calcSubtotal)}</span></div>
              <div><span className="text-gray-600">Impuestos:</span> <span className="font-medium">{fmt.format(calcTax)}</span></div>
              <div><span className="text-gray-600">Envío:</span> <span className="font-medium">{fmt.format(calcShipping)}</span></div>
              <div><span className="text-gray-600">Total (sin fee):</span> <span className="font-medium">{fmt.format(baseTotal)}</span></div>
              <div><span className="text-gray-600">Cargo tarjeta ({pct}%):</span> <span className="font-medium">{fmt.format(cardFee)}</span></div>
              <div className="text-base"><span className="text-gray-600">Total con tarjeta:</span> <span className="font-semibold">{fmt.format(totalWithCard)}</span></div>
              <div className="text-xs text-gray-500 mt-1">* El monto reportado por la pasarela normalmente no incluye el cargo por tarjeta.</div>
            </div>
          </div>

          {/* (opcional) Desglose de envío por owner si existe */}
          {shippingByOwner && Object.keys(shippingByOwner).length > 0 && (
            <div className="px-4 pb-4 text-xs text-gray-700">
              <div className="font-medium mb-1">Envío por proveedor:</div>
              <ul className="list-disc ml-5 space-y-0.5">
                {Object.entries(shippingByOwner).map(([ownerId, usd]) => (
                  <li key={ownerId}>
                    Owner #{ownerId}: {fmt.format(Number(usd || 0))}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Envío (si existe) */}
        {shipping && (
          <div className="bg-white border rounded">
            <div className="p-4 border-b font-semibold">Envío</div>
            <div className="p-4 text-sm space-y-1">
              <div>
                <span className="text-gray-600">Destinatario:</span>{' '}
                <span className="font-medium">
                  {(shipping.first_name ?? '')} {(shipping.last_name ?? '')}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Tel/Email:</span>{' '}
                <span className="font-medium">
                  {(shipping.phone ?? '')} · {(shipping.email ?? '')}
                </span>
              </div>

              {isUS(shipping) ? (
                <>
                  <div>
                    <span className="text-gray-600">Dirección:</span>{' '}
                    <span className="font-medium">
                      {(shipping.address_line1 ?? '')}
                      {shipping.address_line2 ? `, ${shipping.address_line2}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ciudad/Estado/ZIP:</span>{' '}
                    <span className="font-medium">
                      {(shipping.city ?? '')}, {(shipping.state ?? '')} {(shipping.zip ?? '')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-gray-600">Dirección:</span>{' '}
                    <span className="font-medium">{shipping.address ?? ''}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Municipio/Provincia:</span>{' '}
                    <span className="font-medium">
                      {(shipping.municipality ?? '')}, {(shipping.province ?? '')}
                    </span>
                  </div>
                  {shipping.ci && (
                    <div>
                      <span className="text-gray-600">CI:</span>{' '}
                      <span className="font-medium">{shipping.ci}</span>
                    </div>
                  )}
                </>
              )}

              {shipping.instructions && (
                <div className="text-gray-600">
                  Notas: <span className="font-medium">{shipping.instructions}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entrega */}
        {delivery?.delivered && (
          <div className="bg-white border rounded">
            <div className="p-4 border-b font-semibold">Entrega</div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="md:col-span-2 space-y-1">
                <div>
                  <span className="text-gray-600">Estado:</span>{' '}
                  <span className="font-medium text-emerald-700">Entregado</span>
                </div>
                {deliveredAt && (
                  <div>
                    <span className="text-gray-600">Fecha de entrega:</span>{' '}
                    <span className="font-medium">{deliveredAt}</span>
                  </div>
                )}
                {delivery?.delivered_by && (
                  <div>
                    <span className="text-gray-600">Entregado por:</span>{' '}
                    <span className="font-medium">{delivery.delivered_by}</span>
                  </div>
                )}
                {delivery?.notes && (
                  <div>
                    <span className="text-gray-600">Notas del mensajero:</span>{' '}
                    <span className="font-medium">{delivery.notes}</span>
                  </div>
                )}
              </div>

              {/* Foto de evidencia */}
              {delivery?.photo_url ? (
                <div className="md:col-span-1">
                  <a
                    href={delivery.photo_url}
                    target="_blank"
                    rel="noreferrer"
                    title="Ver foto de entrega"
                    className="block"
                  >
                    <img
                      src={delivery.photo_url}
                      alt={`Foto de entrega orden #${order.id}`}
                      className="w-full h-40 object-cover rounded border"
                    />
                    <div className="mt-1 text-xs text-gray-600 underline underline-offset-2">
                      Ver en tamaño completo
                    </div>
                  </a>
                </div>
              ) : (
                <div className="md:col-span-1 text-xs text-gray-500">
                  Sin foto adjunta.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Productos */}
        <div className="bg-white border rounded">
          <div className="p-4 border-b font-semibold">Productos</div>
          {itemsList?.length ? (
            <>
              <ul className="divide-y">
                {itemsList.map((it, idx) => (
                  <li
                  key={`${it.product_id ?? 'encargo'}-${it.variant_id ?? 'no-var'}-${idx}`}
                  className="p-4 flex items-center gap-3"
                >
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt={it.product_name || `Prod ${it.product_id ?? ''}`}
                      className="w-12 h-12 object-contain bg-white rounded border p-0.5"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded border bg-gray-100" />
                  )}
                
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {it.product_name || `Producto #${it.product_id ?? ''}`}
                      {it.source_url && (
                        <a
                          href={it.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-xs text-green-700 underline"
                          title="Ver en origen"
                        >
                          Ver en origen
                        </a>
                      )}
                    </div>
                
                    {/* Variante si existe */}
                    {it.variant_label?.trim() ? (
                      <div className="text-xs text-gray-500"> {it.variant_label}</div>
                    ) : null}
                
                    {/* Cantidad y unitario */}
                    <div className="text-xs text-gray-600">
                      x{it.quantity} · {fmt.format(Number(it.unit_price))}
                    </div>
                  </div>
                
                  {/* Subtotal por ítem */}
                  <div className="text-sm font-semibold">
                    {fmt.format(Number(it.unit_price) * Number(it.quantity))}
                  </div>
                </li>
                
                ))}
              </ul>

              {/* Totales abajo */}
              <div className="p-4 text-right text-sm space-y-1">
                <div><span className="font-medium">Subtotal: </span><span>{fmt.format(calcSubtotal)}</span></div>
                <div><span className="font-medium">Impuestos: </span><span>{fmt.format(calcTax)}</span></div>
                <div><span className="font-medium">Envío: </span><span>{fmt.format(calcShipping)}</span></div>
                <div><span className="font-medium">Total (sin fee): </span><span>{fmt.format(baseTotal)}</span></div>
                <div><span className="font-medium">Cargo tarjeta ({pct}%): </span><span>{fmt.format(cardFee)}</span></div>
                <div className="text-base">
                  <span className="font-semibold">Total con tarjeta: </span>
                  <span className="font-semibold">{fmt.format(totalWithCard)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 text-sm text-gray-600">Esta orden no tiene ítems asociados.</div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
