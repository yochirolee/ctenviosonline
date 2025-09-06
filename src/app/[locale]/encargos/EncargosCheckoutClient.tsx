'use client'

import type { Dict } from '@/types/Dict'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { useLocation } from '@/context/LocationContext'
import CardPaymentModal from '@/components/CardPaymentModal'
import { requireCustomerAuth } from '@/lib/requireAuth'
import { computeAreaType } from '@/lib/cubaAreaType'
import type { EncargosChangedDetail } from '@/types/encargos-events'

type Props = { dict: Dict; params?: { locale: string } }

import {
  encargosListMine,
  encargosQuote,
  encargosCheckoutStart,
  encargosStartDirect,
  encargosPayDirect,
  getCustomerProfile,
  type EncargoItem,
  type Shipping,
  type AreaTypeCU,
} from '@/lib/api'

// ====== Constantes ======
const CARD_FEE_PCT = Number(process.env.NEXT_PUBLIC_CARD_FEE_PCT ?? '3')
const FEE_RATE = Number.isFinite(CARD_FEE_PCT) ? CARD_FEE_PCT / 100 : 0

const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : undefined

// --- Estados Unidos ---
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]

// ===== helpers =====
function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const s = String(raw).trim()
  if (!s) return null
  const n1 = Number(s.replace(/[^\d.-]/g, ''))
  if (Number.isFinite(n1)) return n1
  const n2 = Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n2) ? n2 : null
}

function fmtCurrency(n: number, locale: string, currency: string = 'USD') {
  return new Intl.NumberFormat(locale || 'es', { style: 'currency', currency }).format(n)
}

type QuoteBreakdownLine = {
  owner_id: number | null
  owner_name: string
  mode: 'fixed' | 'by_weight' | string
  weight_lb: number
  shipping_cents: number
}

type UnavailableLine = {
  owner_name?: string
  title: string
  requested?: number
  available?: number
}

type EncargosQuoteResp =
  | { ok: true; shipping_total_cents: number; breakdown?: QuoteBreakdownLine[] }
  | { ok: false; message?: string; unavailable?: UnavailableLine[] }

function buildAvailabilityErrorMsg(unavailable: UnavailableLine[], locLabel?: string) {
  if (!Array.isArray(unavailable) || unavailable.length === 0) {
    return 'Hay productos sin disponibilidad. Modifica los encargos para continuar.'
  }
  const byOwner: Record<string, { title: string; requested?: number; available?: number }[]> = {}
  for (const u of unavailable) {
    const key = (u.owner_name || 'Proveedor').trim()
    if (!byOwner[key]) byOwner[key] = []
    byOwner[key].push({ title: u.title, requested: u.requested, available: u.available })
  }
  const parts = Object.entries(byOwner).map(([owner, lines]) => {
    const prods = lines.map(l => {
      const rq = Number.isFinite(l.requested) ? Number(l.requested) : undefined
      const av = Number.isFinite(l.available) ? Number(l.available) : undefined
      const q = (typeof rq === 'number' && typeof av === 'number') ? ` (pediste ${rq}, quedan ${av})` : ''
      return `• ${l.title}${q}`
    }).join('\n')
    const locText = locLabel ? ` en ${locLabel}` : ''
    return `Los productos de ${owner} no pueden entregarse${locText}:\n${prods}`
  })
  return parts.join('\n\n')
}

export default function EncargosCheckoutClient({ dict, params }: Props) {
  const urlParams = useParams() as { locale?: string }
  const locale = params?.locale ?? urlParams?.locale ?? 'es'
  const router = useRouter()
  const { location } = useLocation()

  useEffect(() => {
    // Listener tipado: convierte Event -> CustomEvent<EncargosChangedDetail>
    const onChanged = (ev: Event) => {
      const e = ev as CustomEvent<EncargosChangedDetail>
      if (!e.detail) return
      if (e.detail.type === 'removed') {
        const id = e.detail.id
        if (typeof id === 'number') {
          setItems(prev => prev.filter(x => x.id !== id))
        }
      } else if (e.detail.type === 'cleared') {
        setItems([])
      } else if (e.detail.type === 'updated') {
        // opcional: si en algún flujo se edita, recarga del API
        // void reloadItems()
      }
    }

    window.addEventListener('encargos:changed', onChanged as EventListener)
    return () => window.removeEventListener('encargos:changed', onChanged as EventListener)
  }, [])

  // Forzar login al entrar
  useEffect(() => {
    ; (async () => {
      const ok = await requireCustomerAuth(router, locale)
      if (!ok) return
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isCU = location?.country === 'CU'
  const isUS = location?.country === 'US'

  // ===== Items de encargos =====
  const [items, setItems] = useState<EncargoItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)

  const reloadItems = async () => {
    try {
      setLoadingItems(true)
      const data = await encargosListMine()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => {
    reloadItems()
  }, [])

  // ===== (NUEVO) Datos del comprador (perfil) =====
  const [buyer, setBuyer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',     // solo dígitos US
    address: '',
    zip: '',
  })

  // ===== FORM DATA (envío) =====
  const [formData, setFormData] = useState({
    // comunes
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    instrucciones: '',
    // US
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    // Cuba
    direccion: '',
    ci: '',
  })

  // Precargar desde API del customer (igual que en checkout original)
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const profile = await getCustomerProfile()
          if (!profile || cancelled) return

          setBuyer(prev => ({
            first_name: profile.first_name ?? prev.first_name,
            last_name: profile.last_name ?? prev.last_name,
            email: profile.email ?? prev.email,
            phone: profile.phone ?? prev.phone,       // sin +1
            address: profile.address ?? prev.address,
            zip: profile.zip ?? prev.zip,
          }))
        } catch {
          // noop
        }
      })()
    return () => { cancelled = true }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // ===== Validación =====
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    let firstErrorField: string | null = null

    // Billing email (requerido)
    if (!buyer.email || !EMAIL_RE.test(buyer.email)) {
      newErrors.buyer_email = dict.checkout.errors.email
      if (!firstErrorField) firstErrorField = 'billing_email'
    }

    // Email receptor (opcional)
    if (formData.email && !EMAIL_RE.test(formData.email)) {
      newErrors.email = dict.checkout.errors.email
      if (!firstErrorField) firstErrorField = 'email'
    }

    // Comunes
    if (!formData.nombre) {
      newErrors.nombre = dict.checkout.errors.nombre
      if (!firstErrorField) firstErrorField = 'nombre'
    }
    if (!formData.apellidos) {
      newErrors.apellidos = dict.checkout.errors.apellidos
      if (!firstErrorField) firstErrorField = 'apellidos'
    }

    if (isCU) {
      if (!location?.province || !location?.municipality) {
        newErrors._cuLoc = dict.location_banner.location_select_required
        if (!firstErrorField) firstErrorField = 'location'
      }
      if (!/^[0-9]{8,}$/.test(formData.telefono.replace(/\D/g, ''))) {
        newErrors.telefono = dict.checkout.errors.telefono
        if (!firstErrorField) firstErrorField = 'telefono'
      }
      if (!/^\d{11}$/.test(formData.ci.trim())) {
        newErrors.ci = dict.checkout.errors.ci || 'El CI debe tener 11 dígitos'
        if (!firstErrorField) firstErrorField = 'ci'
      }
      if (!formData.direccion?.trim()) {
        newErrors.direccion = dict.checkout.errors.address
        if (!firstErrorField) firstErrorField = 'direccion'
      }
    } else if (isUS) {
      const usPhone = formData.telefono.replace(/\D/g, '')
      if (!/^\d{10}$/.test(usPhone)) {
        newErrors.telefono = dict.checkout.errors.telefonoeu
        if (!firstErrorField) firstErrorField = 'telefono'
      }
      if (!formData.address1) {
        newErrors.address1 = dict.checkout.errors.address1eu
        if (!firstErrorField) firstErrorField = 'address1'
      }
      if (!formData.city) {
        newErrors.city = dict.checkout.errors.cityeu
        if (!firstErrorField) firstErrorField = 'city'
      }
      if (!formData.state) {
        newErrors.state = dict.checkout.errors.stateeu
        if (!firstErrorField) firstErrorField = 'state'
      }
      if (!/^\d{5}(-\d{4})?$/.test(formData.zip)) {
        newErrors.zip = dict.checkout.errors.zipeu
        if (!firstErrorField) firstErrorField = 'zip'
      }
    } else {
      newErrors._noCountry = dict.location_banner.location_select_required1
      if (!firstErrorField) firstErrorField = 'location'
    }

    setErrors(newErrors)
    return { ok: Object.keys(newErrors).length === 0, firstErrorField }
  }

  // ===== Shipping quote =====
  const readyToQuote =
    isUS
      ? Boolean(formData.state && formData.city && formData.zip)
      : Boolean(isCU && location?.province && location?.municipality)

  const [quoting, setQuoting] = useState(false)
  const [quoteOk, setQuoteOk] = useState<boolean | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [shippingQuoteCents, setShippingQuoteCents] = useState(0)
  const [shippingBreakdown, setShippingBreakdown] = useState<QuoteBreakdownLine[]>([])
  const [unavailableOwners, setUnavailableOwners] = useState<{ owner_name: string }[]>([])

  // helper: construir shipping (CU/US)
  function buildShipping(): Shipping {
    if (location?.country === 'CU') {
      const area = computeAreaType(location!.province!, location!.municipality!) as AreaTypeCU
      return {
        country: 'CU',
        first_name: formData.nombre,
        last_name: formData.apellidos,
        phone: `+53${formData.telefono}`,
        email: formData.email || buyer.email,
        province: location!.province!,
        municipality: location!.municipality!,
        address: formData.direccion || '',
        area_type: area,
        instructions: formData.instrucciones || undefined,
        ci: formData.ci,
      }
    }
    return {
      country: 'US',
      first_name: formData.nombre,
      last_name: formData.apellidos,
      phone: `+1${formData.telefono.replace(/\D/g, '')}`,
      email: formData.email || buyer.email,
      address_line1: formData.address1,
      address_line2: formData.address2 || undefined,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      instructions: formData.instrucciones || undefined,
    }
  }

  useEffect(() => {
    if (!readyToQuote) {
      setQuoting(false)
      setQuoteOk(null)
      setQuoteError(null)
      setShippingQuoteCents(0)
      setShippingBreakdown([])
      setUnavailableOwners([])
      return
    }
    let cancelled = false
    setQuoting(true)
      ; (async () => {
        try {
          const q = (await encargosQuote(buildShipping())) as EncargosQuoteResp
          if (cancelled) return
          if (q.ok === false) {
            const locLabel = isCU
              ? [location?.municipality, location?.province].filter(Boolean).join(', ')
              : [formData.city, formData.state, formData.zip].filter(Boolean).join(', ')
            setQuoteOk(false)
            setQuoteError(
              q.message ||
              buildAvailabilityErrorMsg(q.unavailable ?? [], locLabel) ||
              dict.checkout.quote_not_available
            )
            setUnavailableOwners(
              Array.isArray(q.unavailable)
                ? q.unavailable.flatMap(u => (u.owner_name ? [{ owner_name: u.owner_name }] : []))
                : []
            )
            setShippingQuoteCents(0)
            setShippingBreakdown([])
            return
          }
          setQuoteOk(true)
          setQuoteError(null)
          setUnavailableOwners([])
          setShippingQuoteCents(Number(q.shipping_total_cents || 0))
          setShippingBreakdown(Array.isArray(q.breakdown) ? q.breakdown : [])
        } catch {
          if (cancelled) return
          setQuoteOk(false)
          setQuoteError(dict.checkout.quote_not_available)
          setShippingQuoteCents(0)
          setShippingBreakdown([])
        } finally {
          if (!cancelled) setQuoting(false)
        }
      })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCU, isUS, readyToQuote, location?.province, location?.municipality, formData.state, formData.city, formData.zip])

  // ===== Totales =====
  const { subtotalCents, currency } = useMemo(() => {
    const sum = (items || []).reduce((acc, it) => acc + (parsePrice(it.price_estimate) || 0), 0)
    return { subtotalCents: Math.round(sum * 100), currency: 'USD' as const }
  }, [items])

  const taxCents = 0 // (si aplicas impuestos, cámbialo aquí)
  const grandTotalCents = subtotalCents + taxCents + shippingQuoteCents
  const cardFeeCents = Math.round(grandTotalCents * FEE_RATE)
  const totalWithCardFeeCents = grandTotalCents + cardFeeCents

  // ===== Términos =====
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // ===== Pago (link / directo) =====
  const [isPaying, setIsPaying] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [startingDirect, setStartingDirect] = useState(false)
  const [cardPaying, setCardPaying] = useState(false)
  const [directSession, setDirectSession] = useState<{ id: string; amount: number } | null>(null)

  const payDisabled =
    isPaying ||
    loadingItems ||
    items.length === 0 ||
    quoting ||
    !readyToQuote ||
    (readyToQuote && quoteOk !== true) ||
    !acceptedTerms

  const fmt = new Intl.NumberFormat(locale || 'es', { style: 'currency', currency })

  const handleCheckoutLink = async () => {
    const { ok, firstErrorField } = validate()
    if (!ok) {
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            ; (el as HTMLInputElement).focus()
        }
      }
      return
    }
    if (readyToQuote && quoteOk !== true) {
      toast.error(quoteError || 'No se puede entregar a esa dirección.')
      return
    }
    setIsPaying(true)
    try {
      const start = await encargosCheckoutStart({
        shipping: buildShipping(),
        locale,
        terms: { accepted: true, url: `/${locale}/terms`, accepted_at: new Date().toISOString(), version: 'v1' },
        payer: {
          first_name: buyer.first_name || formData.nombre,
          last_name: buyer.last_name || formData.apellidos,
          email: buyer.email || formData.email,
          phone: buyer.phone ? `+1${buyer.phone.replace(/\D/g, '')}` : undefined,
          address: buyer.address || undefined,
          zip: buyer.zip || undefined,
        },
        billing: {
          first_name: buyer.first_name || formData.nombre,
          last_name: buyer.last_name || formData.apellidos,
          email: buyer.email || formData.email,
          phone: buyer.phone ? `+1${buyer.phone.replace(/\D/g, '')}` : undefined,
          address: buyer.address || undefined,
          zip: buyer.zip || undefined,
        },
      })
      if (start?.payUrl) {
        window.location.assign(start.payUrl)
        return
      }
      if (start?.sessionId) {
        router.push(`/${locale}/checkout/success?sessionId=${start.sessionId}`)
        return
      }
      toast.error('Respuesta inesperada del servidor.')
    } catch (e: unknown) {
      toast.error(errMsg(e) || 'No se pudo iniciar el checkout.')
    } finally {
      setIsPaying(false)
    }
  }

  const handleStartDirect = async () => {
    const { ok, firstErrorField } = validate()
    if (!ok) {
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            ; (el as HTMLInputElement).focus()
        }
      }
      return
    }
    if (quoting || (readyToQuote && quoteOk !== true)) {
      toast.error(quoteError || 'No se puede entregar a esa dirección.')
      return
    }

    setStartingDirect(true)
    try {
      const r = await encargosStartDirect({
        shipping: buildShipping(),
        locale,
        terms: { accepted: true, url: `/${locale}/terms`, accepted_at: new Date().toISOString(), version: 'v1' },
        payer: {
          first_name: buyer.first_name || formData.nombre,
          last_name: buyer.last_name || formData.apellidos,
          email: buyer.email || formData.email,
          phone: buyer.phone ? `+1${buyer.phone.replace(/\D/g, '')}` : undefined,
          address: buyer.address || undefined,
          zip: buyer.zip || undefined,
        },
        billing: {
          first_name: buyer.first_name || formData.nombre,
          last_name: buyer.last_name || formData.apellidos,
          email: buyer.email || formData.email,
          phone: buyer.phone ? `+1${buyer.phone.replace(/\D/g, '')}` : undefined,
          address: buyer.address || undefined,
          zip: buyer.zip || undefined,
        },
      })

      if (!r?.ok || !r.sessionId || !r.amount) {
        toast.error(r?.message || 'No se pudo iniciar el pago directo.')
        return
      }
      setDirectSession({ id: String(r.sessionId), amount: Number(r.amount) })
      setShowCardModal(true)
    } catch (e: unknown) {
      toast.error(errMsg(e) || 'Error iniciando el pago directo.')
    } finally {
      setStartingDirect(false)
    }
  }

  const handleSubmitCard = async (p: {
    cardNumber: string
    expMonth: string
    expYear: string
    cvn: string
    zipCode?: string
    nameOnCard?: string
  }) => {
    if (!directSession) return
    setCardPaying(true)
    try {
      const pay = await encargosPayDirect({
        sessionId: directSession.id,
        amount: directSession.amount,
        cardNumber: p.cardNumber.replace(/\s+/g, ''),
        expMonth: p.expMonth,
        expYear: p.expYear,
        cvn: p.cvn,
        zipCode: p.zipCode,
        nameOnCard: p.nameOnCard,
      })
      if (!pay?.ok || pay.paid !== true) {
        toast.error(pay?.message || 'El pago fue rechazado.')
        return
      }
      toast.success('¡Pago aprobado!')
      setShowCardModal(false)
      const sid = pay.sessionId ?? directSession.id
      router.push(`/${locale}/checkout/success?sessionId=${sid}`)
    } catch (e: unknown) {
      toast.error(errMsg(e) || 'Error procesando el pago.')
    } finally {
      setCardPaying(false)
    }
  }

  // ===== UI =====
  return (
    <div className="py-10 px-4 max-w-4xl mx-auto space-y-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition mb-4"
      >
        <ArrowLeft size={18} />
        <span className="underline underline-offset-2">{dict.checkout.back}</span>
      </button>

      {/* Aviso de banner */}
      <div id="location" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <div className="font-medium">{dict.location_banner.location_selected}</div>
        {isCU && location?.province && location?.municipality && (
          <div>
            Cuba — <strong>{location.province} / {location.municipality}</strong>.{' '}
            <button
              type="button"
              className="underline text-emerald-800 hover:text-emerald-900"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent('location:open')) } catch { }
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              {dict.location_banner.location_selected_change}
            </button>
          </div>
        )}
        {isUS && (
          <div>
            Estados Unidos.{' '}
            <button
              type="button"
              className="underline text-emerald-800 hover:text-emerald-900"
              onClick={() => { try { window.dispatchEvent(new CustomEvent('location:open')) } catch { } window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              {dict.location_banner.location_selected}
            </button>
          </div>
        )}
        {!isCU && !isUS && (
          <div className="text-red-700">
            {dict.location_banner.location_selected_change}
          </div>
        )}
      </div>

      {/* Datos del comprador */}
      <h2 className="text-2xl font-bold">{locale === 'en' ? 'Buyer information' : 'Datos del comprador'}</h2>
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">
            {locale === 'en' ? 'Buyer (will receive the receipt)' : 'Comprador (recibe el comprobante)'}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {locale === 'en'
              ? 'Fill in your details before paying.'
              : 'Completa tus datos antes de pagar.'}
          </p>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.first_name}</label>
              <input className="input" value={buyer.first_name} onChange={(e) => setBuyer(b => ({ ...b, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.last_name}</label>
              <input className="input" value={buyer.last_name} onChange={(e) => setBuyer(b => ({ ...b, last_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.email}</label>
              <input id="billing_email" className="input" value={buyer.email} onChange={(e) => setBuyer(b => ({ ...b, email: e.target.value }))} />
              {errors.buyer_email && <p className="text-red-500 text-xs mt-1">{errors.buyer_email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {locale === 'en' ? 'Buyer phone (US)' : 'Teléfono del comprador (EE. UU.)'}
              </label>
              <input className="input" placeholder={locale === 'en' ? '10 digits' : '10 dígitos'} value={buyer.phone}
                onChange={(e) => setBuyer(b => ({ ...b, phone: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {locale === 'en' ? 'Buyer address' : 'Dirección del comprador'}
              </label>
              <input className="input" value={buyer.address} onChange={(e) => setBuyer(b => ({ ...b, address: e.target.value }))} />
            </div>
            <div className="md:max-w-xs">
              <label className="block text-sm font-medium text-gray-700">
                {locale === 'en' ? 'ZIP code (billing)' : 'Código ZIP (facturación)'}
              </label>
              <input className="input" value={buyer.zip} onChange={(e) => setBuyer(b => ({ ...b, zip: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Envío */}
      <h2 className="text-2xl font-bold">{dict.checkout.shipping}</h2>
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">{dict.checkout.shipping}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{dict.checkout.shipping1}</p>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
          {/* Comunes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.first_name}</label>
              <input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} className="input" />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.last_name}</label>
              <input id="apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange} className="input" />
              {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {isUS ? dict.checkout.phoneeu : dict.checkout.phone}{' '}
                <span className="text-gray-400">{isUS ? '(10 dígitos)' : '(8+ dígitos)'}</span>
              </label>
              <input id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} className="input" />
              {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.email} <span className="text-gray-500">({locale === 'en' ? 'optional' : 'opcional'})</span></label>
              <input id="email" name="email" value={formData.email} onChange={handleChange} className="input" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Cuba */}
          {isCU && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.ci}</label>
                <input id="ci" name="ci" value={formData.ci} onChange={handleChange} className="input w-full" />
                {errors.ci && <p className="text-red-500 text-xs mt-1">{errors.ci}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.addressExact}</label>
                <input id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} className="input w-full" placeholder={dict.checkout.addressExact_placeholder} />
                {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>}
                {errors._cuLoc && <p className="text-red-500 text-xs mt-1">{errors._cuLoc}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.instructions_label}</label>
                <input name="instrucciones" value={formData.instrucciones} onChange={handleChange} className="input w-full" />
              </div>
            </div>
          )}

          {/* US */}
          {isUS && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.address1eu}</label>
                <input id="address1" name="address1" value={formData.address1} onChange={handleChange} className="input" />
                {errors.address1 && <p className="text-red-500 text-xs mt-1">{errors.address1}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.address2eu} <span className="text-gray-500">(opcional)</span></label>
                <input id="address2" name="address2" value={formData.address2} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.cityeu}</label>
                <input id="city" name="city" value={formData.city} onChange={handleChange} className="input" />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.stateeu}</label>
                <select id="state" name="state" value={formData.state} onChange={handleChange} className="input">
                  <option value="">{'Seleccione'}</option>
                  {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
              </div>
              <div className="md:max-w-xs">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.zipeu}</label>
                <input id="zip" name="zip" value={formData.zip} onChange={handleChange} className="input" />
                {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip}</p>}
              </div>
            </div>
          )}

          {/* Estado cotización */}
          <div className="pt-2 text-sm text-gray-600">
            {quoting
              ? dict.checkout.quoting
              : (quoteOk === false
                ? dict.checkout.quote_not_available
                : `${dict.checkout.quote_estimated}${fmt.format(shippingQuoteCents / 100)}`)}
          </div>

          {/* Error quote */}
          {quoteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
              {quoteError}
              {unavailableOwners.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {unavailableOwners.map((u, i) => (
                    <li key={`${u.owner_name}-${i}`}>
                      {dict.checkout.provider_unavailable}{u.owner_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Desglose por owner */}
          {shippingBreakdown.length > 0 && (
            <div className="rounded-lg border bg-white p-3 text-sm">
              <div className="font-medium mb-2">{dict.checkout.shipping_breakdown_title}</div>
              <ul className="space-y-1">
                {shippingBreakdown.map((b, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {b.owner_name}{' '}
                      {b.mode === 'by_weight'
                        ? `${dict.checkout.shipping_breakdown_weight_pre}${b.weight_lb}${dict.checkout.shipping_breakdown_weight_post}`
                        : ''}
                    </span>
                    <span>{fmt.format(b.shipping_cents / 100)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Resumen del pedido */}
      <h1 className="text-2xl font-bold">{dict.checkout.title}</h1>
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px_4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">{dict.checkout.title}</h3>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
          {loadingItems ? (
            <p className="text-gray-500">{dict.common.loading}</p>
          ) : items.length > 0 ? (
            items.map((it) => {
              const amount = parsePrice(it.price_estimate)
              const currencyCode: string = it.currency ?? 'USD'
              const money = amount != null ? fmtCurrency(amount, locale, currencyCode) : '—'
              return (
                <div key={it.id} className="flex items-center gap-3">
                  <div className="relative w-16 h-16 border rounded bg-white flex-shrink-0">
                    {it.image_url ? (
                      <Image src={it.image_url} alt={it.title ?? 'Producto'} fill className="object-contain" unoptimized />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-gray-400 text-xs">Sin imagen</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold line-clamp-2">{it.title || 'Sin título'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {it.source === 'amazon' ? 'Amazon' : it.source === 'shein' ? 'SHEIN' : 'Externo'}
                      {it.external_id ? ` · ID: ${it.external_id}` : ''}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 mt-1">{money}</div>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-gray-500">{dict.checkout.empty}</p>
          )}

          <div className="border-t border-gray-200 my-2" />

          <div className="flex justify-between text-sm">
            <span>{dict.checkout.subtotal}</span>
            <span>{fmt.format(subtotalCents / 100)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>{dict.checkout.tax ?? 'Tax'}</span>
            <span>{fmt.format(taxCents / 100)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>{dict.checkout.shipping_label}</span>
            <span>{quoteOk === false ? '—' : fmt.format(shippingQuoteCents / 100)}</span>
          </div>

          <div className="flex justify-between text-base font-semibold mt-2">
            <span>{dict.checkout.total ?? 'Total'}</span>
            <span>{fmt.format((grandTotalCents) / 100)}</span>
          </div>

          {readyToQuote && !quoting && quoteOk === true && (
            <>
              <div className="flex justify-between text-sm pt-2">
                <span>{dict.checkout.card_fee_label} ({CARD_FEE_PCT}%)</span>
                <span>{fmt.format(cardFeeCents / 100)}</span>
              </div>
              <p className="text-xs text-gray-500">{dict.checkout.card_fee_note}</p>

              <div className="flex justify-between text-base font-semibold">
                <span>{dict.checkout.total_with_card}</span>
                <span>{fmt.format(totalWithCardFeeCents / 100)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Aceptación de Términos */}
      <div className="rounded border bg-white p-4">
        <label className="inline-flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            {locale === 'en' ? 'I have read and accept the ' : 'He leído y acepto los '}
            <a href={`/${locale}/terms`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
              {locale === 'en' ? 'Terms and Conditions' : 'Términos y Condiciones'}
            </a>
            .
          </span>
        </label>
        {!acceptedTerms && (
          <p className="mt-1 text-xs text-gray-500">
            {locale === 'en' ? 'Required to continue.' : 'Obligatorio para continuar.'}
          </p>
        )}
      </div>

      {/* Modal pago directo */}
      <CardPaymentModal
        open={showCardModal}
        amountLabel={directSession ? fmt.format(directSession.amount) : undefined}
        onClose={() => (!cardPaying ? setShowCardModal(false) : null)}
        onSubmit={handleSubmitCard}
        loading={cardPaying}
        dict={dict.card_modal}
      />

      {/* Pago directo */}
      <button
        onClick={handleStartDirect}
        disabled={startingDirect || payDisabled}
        className="w-full bg-emerald-700 text-white py-3 rounded hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center space-x-2"
      >
        <CreditCard size={18} />
        <span>{startingDirect ? dict.common.loading : `${dict.checkout.directPay}`}</span>
      </button>

    </div>
  )
}
