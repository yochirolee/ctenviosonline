"use client"

import { useCart } from "@/context/CartContext"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CreditCard } from "lucide-react"
import type { Dict } from '@/types/Dict'
import { toast } from "sonner"
import { computeAreaType } from '@/lib/cubaAreaType'
import CardPaymentModal from '@/components/CardPaymentModal'
import { useLocation } from '@/context/LocationContext'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
const CARD_FEE_PCT = Number(process.env.NEXT_PUBLIC_CARD_FEE_PCT ?? '3')
const FEE_RATE = Number.isFinite(CARD_FEE_PCT) ? CARD_FEE_PCT / 100 : 0

// --- Estados Unidos ---
const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
]

// ===== helpers =====
function buildQuoteErrorMsg({
  province,
  municipality,
  unavailable,
}: {
  province?: string
  municipality?: string
  unavailable?: Array<{ owner_id?: number | null; owner_name?: string }>
}) {
  const loc = [municipality, province].filter(Boolean).join(', ')
  const names = (unavailable || []).map(u => (u?.owner_name || '').trim()).filter(Boolean)
  if (names.length === 1) {
    return loc
      ? `Los productos del proveedor ${names[0]} no pueden entregarse en ${loc}. Cambia la localidad o elimina esos productos para continuar.`
      : `Los productos del proveedor ${names[0]} no pueden entregarse en la localidad seleccionada. Cambia la localidad o elimina esos productos para continuar.`
  }
  if (names.length > 1) {
    const list = names.join(', ')
    return loc
      ? `Los productos de los proveedores ${list} no pueden entregarse en ${loc}. Cambia la localidad o elimina esos productos para continuar.`
      : `Los productos de los proveedores ${list} no pueden entregarse en la localidad seleccionada. Cambia la localidad o elimina esos productos para continuar.`
  }
  return loc
    ? `Algunos productos del carrito no pueden entregarse en ${loc}. Cambia la localidad o elimina esos productos para continuar.`
    : `Algunos productos del carrito no pueden entregarse en la localidad seleccionada. Cambia la localidad o elimina esos productos para continuar.`
}

type UnavailableLine = {
  owner_name?: string
  title: string
  requested?: number
  available?: number
}

function buildAvailabilityErrorMsg(unavailable: UnavailableLine[], locLabel?: string) {
  if (!Array.isArray(unavailable) || unavailable.length === 0) {
    return 'Hay productos sin disponibilidad. Modifica el carrito para continuar.'
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
      const q = (typeof rq === 'number' && typeof av === 'number')
        ? ` (pediste ${rq}, quedan ${av})` : ''
      return `• ${l.title}${q}`
    }).join('\n')
    const locText = locLabel ? ` en ${locLabel}` : ''
    return `Los productos de ${owner} no pueden entregarse${locText}:\n${prods}`
  })
  return parts.join('\n\n')
}

type CheckoutResponse =
  | { orderId?: number; payUrl?: string; message?: string; status?: 'pending' | 'paid' | 'requires_action' | 'failed' }
  | { sessionId?: number | string; payUrl?: string; message?: string; ok?: boolean; paid?: boolean; orders?: number[] }

function getErrorMessage(err: unknown, fallback = "Error en el proceso de checkout.") {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return fallback
}

const LS_FORM_KEY = 'checkout_form_v2' // new version key

// ===== tipos locales de carrito usados en la UI =====
type CartLine = {
  id: number | string
  title: string
  quantity: number
  unit_price?: number
  thumbnail?: string | null
  weight?: number | string | null
  owner_name?: string | null
  metadata?: {
    price_with_margin_cents?: number
    tax_cents?: number
    owner?: string
  } | null
}

export default function CheckoutPage({ dict }: { dict: Dict }) {
  const { items, cartId, clearCart, refreshCartNow } = useCart()
  const cartItems: CartLine[] = (items as unknown as CartLine[]) ?? []

  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const { location } = useLocation() // <- fuente de verdad para CU/US

  const isCU = location?.country === 'CU'
  const isUS = location?.country === 'US'

  // ===== (NUEVO) Datos del comprador (perfil) =====
  const [buyer, setBuyer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",     // guarda solo dígitos preferiblemente (US)
    address: "",
    zip: "",       // Billing ZIP / ZIP del comprador
  })

  // Precargar desde API del customer
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    const controller = new AbortController()

    const load = async () => {
      try {
        let data: unknown = null

        // 1) intenta /customers/me
        try {
          const r = await fetch(`${API_URL}/customers/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          })
          if (r.ok) data = await r.json().catch(() => null)
        } catch { }

        // 2) fallback /me
        if (!data) {
          try {
            const r2 = await fetch(`${API_URL}/me`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            })
            if (r2.ok) data = await r2.json().catch(() => null)
          } catch { }
        }

        if (data && typeof data === 'object') {
          const rec = data as Record<string, unknown>
          const getStr = (key: string): string | undefined =>
            typeof rec[key] === 'string' ? (rec[key] as string) : undefined

          setBuyer(prev => ({
            first_name: getStr('first_name') || getStr('firstName') || getStr('nombre') || prev.first_name,
            last_name: getStr('last_name') || getStr('lastName') || getStr('apellidos') || prev.last_name,
            email: getStr('email') || prev.email,
            phone: String(getStr('phone') || getStr('telefono') || prev.phone || '').replace(/^\+?1/, ''),
            address: getStr('address') || getStr('address_line1') || getStr('direccion') || prev.address,
            zip: getStr('zip') || getStr('zipCode') || prev.zip || "",
          }))
        }
      } catch {
        // noop
      }
    }

    load()
    return () => controller.abort()
  }, [])

  // ===== FORM DATA (persist) =====
  const [formData, setFormData] = useState({
    // comunes
    nombre: "",
    apellidos: "",
    telefono: "",
    email: "",
    instrucciones: "",   // lo usamos como “Dirección exacta / referencias” para Cuba
    // US
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    // Cuba: mantenemos el campo “direccion” para compatibilidad si ya lo usas en backend
    direccion: "",
    ci: "",
  })

  // Carga inicial desde LS
  const loadedRef = useRef(false)
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    try {
      const raw = localStorage.getItem(LS_FORM_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setFormData(prev => ({ ...prev, ...parsed }))
      }
    } catch { }
  }, [])

  // Guarda incremental en LS
  useEffect(() => {
    try { localStorage.setItem(LS_FORM_KEY, JSON.stringify(formData)) } catch { }
  }, [formData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // ===== Validación =====
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    let firstErrorField: string | null = null


    // ✅ Email del COMPRADOR (facturación) — REQUERIDO
    if (!buyer.email || !EMAIL_RE.test(buyer.email)) {
      newErrors.buyer_email = (dict.checkout.errors.email)
        || (locale === 'en'
          ? 'Billing email is required and must be valid'
          : 'El email de facturación es obligatorio y debe ser válido')
      if (!firstErrorField) firstErrorField = 'billing_email' // 👈 id del input
    }

    // ✅ Email del RECEPTOR (envío) — OPCIONAL (solo validar si viene algo)
    if (formData.email && !EMAIL_RE.test(formData.email)) {
      newErrors.email = dict.checkout.errors.email
      if (!firstErrorField) firstErrorField = 'email' // 👈 id del input de envío
    }

    // ===== Comunes =====
    if (!formData.nombre) {
      newErrors.nombre = dict.checkout.errors.nombre
      if (!firstErrorField) firstErrorField = 'nombre'
    }

    if (!formData.apellidos) {
      newErrors.apellidos = dict.checkout.errors.apellidos
      if (!firstErrorField) firstErrorField = 'apellidos'
    }

    if (isCU) {
      // ===== Cuba =====
      // Banner obligatorio con province/municipality
      if (!location?.province || !location?.municipality) {
        newErrors._cuLoc = dict.location_banner.location_select_required
        if (!firstErrorField) firstErrorField = 'location'
      }

      // Teléfono cubano: 8+ dígitos
      if (!/^[0-9]{8,}$/.test(formData.telefono.replace(/\D/g, ''))) {
        newErrors.telefono = dict.checkout.errors.telefono
        if (!firstErrorField) firstErrorField = 'telefono'
      }

      // CI cubano: 11 dígitos exactos
      if (!/^\d{11}$/.test(formData.ci.trim())) {
        newErrors.ci = dict.checkout.errors.ci || 'El CI debe tener 11 dígitos'
        if (!firstErrorField) firstErrorField = 'ci'
      }

      // Dirección exacta requerida
      if (!formData.direccion?.trim()) {
        newErrors.direccion = dict.checkout.errors.address
        if (!firstErrorField) firstErrorField = 'direccion'
      }

    } else if (isUS) {
      // ===== Estados Unidos =====
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

  // ===== Precios (centavos) =====
  const priceWithMarginCentsFromMeta = (item: CartLine): number | undefined => {
    const v = item?.metadata?.price_with_margin_cents
    return typeof v === 'number' && v >= 0 ? v : undefined
  }

  const normalizeUnitPriceToCents = (item: CartLine): number => {
    const up = Number(item?.unit_price ?? 0)
    if (!isFinite(up)) return 0
    if (Number.isInteger(up) && up >= 1000) return up
    return Math.round(up * 100)
  }

  const itemDisplayCents = useCallback((item: CartLine): number => {
    return priceWithMarginCentsFromMeta(item) ?? normalizeUnitPriceToCents(item)
  }, [])

  const subtotalCents = useMemo(
    () => cartItems.reduce((acc, it) => acc + itemDisplayCents(it) * it.quantity, 0),
    [cartItems, itemDisplayCents]
  )

  const taxCents = useMemo(
    () =>
      cartItems.reduce((acc, it) => {
        const perItemTax = Number.isFinite(it?.metadata?.tax_cents) ? Number(it.metadata?.tax_cents) : 0
        return acc + perItemTax * it.quantity
      }, 0),
    [cartItems]
  )

  // ===== Shipping quote =====
  const [shippingQuoteCents, setShippingQuoteCents] = useState(0)
  const [shippingBreakdown, setShippingBreakdown] = useState<
    Array<{ owner_id: number | null, owner_name: string, mode: string, weight_lb: number, shipping_cents: number }>
  >([])
  const [quoting, setQuoting] = useState(false)
  const [quoteOk, setQuoteOk] = useState<boolean | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [unavailableOwners, setUnavailableOwners] = useState<{ owner_id: number, owner_name: string }[]>([])
  const fmt = new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' })

  const readyToQuote =
    isUS
      ? Boolean(formData.state && formData.city && formData.zip)
      : Boolean(isCU && location?.province && location?.municipality)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!cartId || !token) return

    if (!readyToQuote) {
      setShippingQuoteCents(0)
      setShippingBreakdown([])
      setQuoteOk(null)
      setQuoteError(null)
      setUnavailableOwners([])
      return
    }

    const controller = new AbortController()
    const run = async () => {
      setQuoting(true)
      try {
        const shipping =
          isCU
            ? {
              country: 'CU',
              province: location!.province,
              municipality: location!.municipality,
              area_type: computeAreaType(location!.province!, location!.municipality!),
            }
            : {
              country: 'US',
              state: formData.state,
              city: formData.city,
              zip: formData.zip,
            }

        const r = await fetch(`${API_URL}/shipping/quote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cartId, shipping }),
          signal: controller.signal,
        })

        const raw = await r.text()
        let data: unknown = null
        try { data = raw ? JSON.parse(raw) : null } catch { data = null }

        const rec = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : null
        const okFlag = rec && typeof rec.ok === 'boolean' ? (rec.ok as boolean) : undefined

        if (okFlag === false) {
          const u = Array.isArray(rec?.unavailable) ? (rec!.unavailable as Array<{ owner_id: number; owner_name: string }>) : []
          setQuoteOk(false)
          setQuoteError(
            buildQuoteErrorMsg({
              province: isCU ? location?.province : undefined,
              municipality: isCU ? location?.municipality : undefined,
              unavailable: u,
            }) || (typeof rec?.message === 'string' ? (rec.message as string) : 'No se puede entregar a esta dirección.')
          )
          setUnavailableOwners(u)
          setShippingQuoteCents(0)
          setShippingBreakdown([])
          return
        }

        if (r.status >= 400 || !rec) {
          const u = Array.isArray(rec?.unavailable) ? (rec!.unavailable as Array<{ owner_id: number; owner_name: string }>) : []
          setQuoteOk(false)
          setQuoteError(
            buildQuoteErrorMsg({
              province: isCU ? location?.province : undefined,
              municipality: isCU ? location?.municipality : undefined,
              unavailable: u,
            })
          )
          setUnavailableOwners(u)
          setShippingQuoteCents(0)
          setShippingBreakdown([])
          return
        }

        setQuoteOk(true)
        setQuoteError(null)
        setUnavailableOwners([])
        setShippingQuoteCents(Number((rec.shipping_total_cents as number) || 0))
        setShippingBreakdown(Array.isArray(rec.breakdown) ? (rec.breakdown as Array<{ owner_id: number | null, owner_name: string, mode: string, weight_lb: number, shipping_cents: number }>) : [])
      } catch {
        // noop
      } finally {
        setQuoting(false)
      }
    }
    const t = setTimeout(run, 350)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId, isCU, isUS, location?.province, location?.municipality, location?.country, formData.state, formData.city, formData.zip, readyToQuote])

  const grandTotalCents = subtotalCents + taxCents + shippingQuoteCents
  const cardFeeCents = Math.round(grandTotalCents * FEE_RATE)
  const totalWithCardFeeCents = grandTotalCents + cardFeeCents

  const [isPaying, setIsPaying] = useState(false)

  // ===== (ya existente) Checkbox de Términos
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const payDisabled =
    isPaying ||
    cartItems.length === 0 ||
    quoting ||
    !readyToQuote ||
    (readyToQuote && quoteOk !== true) ||
    !acceptedTerms

  // ===== helpers para leer campos de respuestas desconocidas =====
  const getMsg = (v: unknown): string | undefined => {
    if (typeof v === 'object' && v !== null) {
      const m = (v as Record<string, unknown>).message
      return typeof m === 'string' ? m : undefined
    }
    return undefined
  }
  const getPayUrl = (v: unknown): string | undefined => {
    if (typeof v === 'object' && v !== null) {
      const u = (v as Record<string, unknown>).payUrl
      return typeof u === 'string' ? u : undefined
    }
    return undefined
  }
  const getSessionId = (v: unknown): string | number | undefined => {
    if (typeof v === 'object' && v !== null) {
      const s = (v as Record<string, unknown>).sessionId
      return (typeof s === 'string' || typeof s === 'number') ? s : undefined
    }
    return undefined
  }
  const getOrderId = (v: unknown): string | number | undefined => {
    if (typeof v === 'object' && v !== null) {
      const s = (v as Record<string, unknown>).orderId
      return (typeof s === 'string' || typeof s === 'number') ? s : undefined
    }
    return undefined
  }

  // ===== Checkout por link =====
  const handleCheckout = async () => {

    const { ok, firstErrorField } = validate()
    if (!ok) {
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
      }
      return
    }
    if (isPaying) return
    if (readyToQuote && quoteOk !== true) {
      toast.error(quoteError || 'Hay productos que no se pueden entregar a esa dirección.')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Inicia sesión para continuar')
      return
    }

    // PRE-CHECK disponibilidad
    try {
      const vr = await fetch(`${API_URL}/cart/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cartId }),
      })
      const vdata = await vr.json().catch(() => null)
      if (!vdata || vdata.ok !== true) {
        const locLabel = isCU
          ? [location?.municipality, location?.province].filter(Boolean).join(', ')
          : [formData.city, formData.state, formData.zip].filter(Boolean).join(', ')
        const msg = buildAvailabilityErrorMsg(Array.isArray(vdata?.unavailable) ? (vdata.unavailable as UnavailableLine[]) : [], locLabel)
        toast.error(msg)
        return
      }
    } catch {
      toast.error('No se pudo validar disponibilidad. Intenta de nuevo.')
      return
    }

    setIsPaying(true)

    let data: CheckoutResponse | null = null
    let idForFail = ''

    try {
      if (!cartId) throw new Error('Carrito no encontrado')

      const shipping =
        isCU
          ? {
            country: 'CU',
            first_name: formData.nombre,
            last_name: formData.apellidos,
            phone: `+53${formData.telefono}`,
            email: formData.email || buyer.email,
            province: location!.province,
            municipality: location!.municipality,
            address: formData.direccion || '', // “Dirección exacta”
            area_type: computeAreaType(location!.province!, location!.municipality!),
            instructions: formData.instrucciones || undefined,
            ci: formData.ci,
          }
          : {
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

      const res = await fetch(`${API_URL}/checkout/${cartId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_method: 'bmspay',
          metadata: {
            shipping,
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
          },
        }),
      })

      const raw = await res.text()
      try { data = raw ? (JSON.parse(raw) as CheckoutResponse) : null } catch { data = null }

      const sessionId = getSessionId(data)
      const orderId = getOrderId(data)
      idForFail = sessionId ? String(sessionId) : (orderId ? String(orderId) : '')

      if (!res.ok) {
        const msg = getMsg(data) || 'No se pudo completar el checkout.'
        const rec = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : null
        const stockIssue =
          rec?.reason === 'insufficient_stock' ||
          (Array.isArray(rec?.stock_issues)) ||
          /sin disponibilidad|sin stock|stock/i.test(String(msg))

        if (stockIssue) refreshCartNow()
        toast.error(msg)
        router.push(`/${locale}/checkout/cancel?ref=${idForFail}&msg=${encodeURIComponent(msg)}`)
        return
      }

      const payUrl = getPayUrl(data)
      if (payUrl) {
        window.location.assign(payUrl)
        return
      }

      if (sessionId !== undefined) {
        toast.success('¡Orden creada!')
        await clearCart()
        router.push(`/${locale}/checkout/success?sessionId=${sessionId}`)
        return
      }

      throw new Error('Respuesta inesperada del servidor.')
    } catch (err: unknown) {
      refreshCartNow()
      const msg = getMsg(data) || getErrorMessage(err)
      toast.error(msg)
      router.push(`/${locale}/checkout/cancel?ref=${idForFail}&msg=${encodeURIComponent(msg)}`)
    } finally {
      setIsPaying(false)
    }
  }

  // ===== Pago directo =====
  const [showCardModal, setShowCardModal] = useState(false)
  const [startingDirect, setStartingDirect] = useState(false)
  const [cardPaying, setCardPaying] = useState(false)
  const [directSession, setDirectSession] = useState<{ id: string; amount: number } | null>(null)

  const handleStartDirect = async () => {
    const { ok, firstErrorField } = validate()
    if (!ok) {
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
      }
      return
    }
    if (quoting || (readyToQuote && quoteOk !== true)) {
      toast.error(quoteError || 'Hay productos que no se pueden entregar a esa dirección.')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Inicia sesión para continuar')
      return
    }

    // disponibilidad
    try {
      const vr = await fetch(`${API_URL}/cart/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cartId }),
      })
      const vdata = await vr.json().catch(() => null)
      if (!vdata || vdata.ok !== true) {
        const locLabel = isCU
          ? [location?.municipality, location?.province].filter(Boolean).join(', ')
          : [formData.city, formData.state, formData.zip].filter(Boolean).join(', ')
        toast.error(buildAvailabilityErrorMsg(Array.isArray(vdata?.unavailable) ? (vdata.unavailable as UnavailableLine[]) : [], locLabel))
        return
      }
    } catch {
      toast.error('No se pudo validar disponibilidad. Intenta de nuevo.')
      return
    }

    const shipping =
      isCU
        ? {
          country: 'CU',
          first_name: formData.nombre,
          last_name: formData.apellidos,
          phone: `+53${formData.telefono}`,
          email: formData.email || buyer.email,
          province: location!.province,
          municipality: location!.municipality,
          address: formData.direccion || '',
          area_type: computeAreaType(location!.province!, location!.municipality!),
          instructions: formData.instrucciones || undefined,
          ci: formData.ci,
        }
        : {
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

    setStartingDirect(true)
    try {
      const r = await fetch(`${API_URL}/checkout-direct/start-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cartId,
          shipping,
          locale,
          metadata: {
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
            terms: { accepted: true, url: `/${locale}/terms`, accepted_at: new Date().toISOString(), version: 'v1' },
          }
        }),
      })
      const data = await r.json().catch(() => null)

      if (!r.ok || !data?.ok) {
        const msg = (typeof data === 'object' && data && typeof (data as Record<string, unknown>).message === 'string')
          ? String((data as Record<string, unknown>).message)
          : 'No se pudo iniciar el pago directo.'
        toast.error(msg)
        return
      }

      setDirectSession({ id: String((data as Record<string, unknown>).sessionId), amount: Number((data as Record<string, unknown>).amount || 0) })
      setShowCardModal(true)
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error iniciando el pago directo.'))
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
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Inicia sesión para continuar')
      return
    }

    setCardPaying(true)
    try {
      const r = await fetch(`${API_URL}/payments-direct/bmspay/sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId: directSession.id,
          amount: directSession.amount,
          cardNumber: p.cardNumber.replace(/\s+/g, ''),
          expMonth: p.expMonth,
          expYear: p.expYear,
          cvn: p.cvn,
          zipCode: p.zipCode,
          nameOnCard: p.nameOnCard,
        }),
      })
      const data = await r.json().catch(() => null)

      if (!r.ok || !data?.ok || (data as Record<string, unknown>).paid !== true) {
        const msg = (typeof data === 'object' && data && typeof (data as Record<string, unknown>).message === 'string')
          ? String((data as Record<string, unknown>).message)
          : 'El pago fue rechazado.'
        toast.error(msg)
        return
      }

      toast.success('¡Pago aprobado! Creando orden…')
      setShowCardModal(false)

      await clearCart()
      const rec = data as Record<string, unknown>
      const sid = (typeof rec.sessionId === 'string' || typeof rec.sessionId === 'number') ? rec.sessionId : directSession.id
      window.location.assign(`/${locale}/checkout/success?sessionId=${sid}`)
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error procesando el pago.'))
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
        {isUS && <div>Estados Unidos. <button type="button" className="underline text-emerald-800 hover:text-emerald-900" onClick={() => { try { window.dispatchEvent(new CustomEvent('location:open')) } catch { } window.scrollTo({ top: 0, behavior: 'smooth' }) }}> {dict.location_banner.location_selected} </button></div>}
        {!isCU && !isUS && (
          <div className="text-red-700">
            {dict.location_banner.location_selected_change}
          </div>
        )}
      </div>

      {/* ===== (NUEVO) Datos del comprador ===== */}
      <h2 className="text-2xl font-bold">{locale === 'en' ? 'Buyer information' : 'Datos del comprador'}</h2>
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">
            {locale === 'en' ? 'Buyer (will receive the receipt)' : 'Comprador (recibe el comprobante)'}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {locale === 'en'
              ? 'Prefilled from your profile. You can edit before paying.'
              : 'Precargado desde tu perfil. Puedes editarlo antes de pagar.'}
          </p>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.first_name}</label>
              <input
                className="input"
                value={buyer.first_name}
                onChange={(e) => setBuyer(b => ({ ...b, first_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.last_name}</label>
              <input
                className="input"
                value={buyer.last_name}
                onChange={(e) => setBuyer(b => ({ ...b, last_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.email}</label>
              <input
                id="billing_email"
                className="input"
                value={buyer.email}
                onChange={(e) => setBuyer(b => ({ ...b, email: e.target.value }))}
              />
              {errors.buyer_email && (
                <p className="text-red-500 text-xs mt-1">{errors.buyer_email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {locale === 'en' ? 'Buyer phone (US)' : 'Teléfono del comprador (EE. UU.)'}
              </label>
              <input
                className="input"
                placeholder={locale === 'en' ? '10 digits' : '10 dígitos'}
                value={buyer.phone}
                onChange={(e) => setBuyer(b => ({ ...b, phone: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {locale === 'en' ? 'Buyer address' : 'Dirección del comprador'}
              </label>
              <input
                className="input"
                value={buyer.address}
                onChange={(e) => setBuyer(b => ({ ...b, address: e.target.value }))}
              />
            </div>
            <div className="md:max-w-xs">
              <label className="block text-sm font-medium text-gray-700">
                {locale === 'en' ? 'ZIP code (billing)' : 'Código ZIP (facturación)'}
              </label>
              <input
                className="input"
                value={buyer.zip}
                onChange={(e) => setBuyer(b => ({ ...b, zip: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 1) Datos de envío */}
      <h2 className="text-2xl font-bold">{dict.checkout.shipping}</h2>

      <div className="rounded-xl border bg-white shadow-sm">
        {/* Cabecera visual (solo estética) */}
        <div className="border-b px-4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">{dict.checkout.shipping}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{dict.checkout.shipping1}</p>
        </div>

        {/* Contenido */}
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

          {/* Cuba: sólo dirección exacta (prov/mun vienen del banner) */}
          {isCU && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.ci}</label>
                <input
                  id="ci"
                  name="ci"
                  value={formData.ci}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder=""
                />
                {errors.ci && <p className="text-red-500 text-xs mt-1">{errors.ci}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.addressExact}</label>
                <input
                  id="direccion"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder={dict.checkout.addressExact_placeholder}
                />
                {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>}
                {errors._cuLoc && <p className="text-red-500 text-xs mt-1">{errors._cuLoc}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {dict.checkout.instructions_label}
                </label>
                <input
                  name="instrucciones"
                  value={formData.instrucciones}
                  onChange={handleChange}
                  className="input w-full"
                />
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
                <label className="block text-sm font-medium text-gray-700">
                  {dict.checkout.address2eu} <span className="text-gray-500">(opcional)</span>
                </label>
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

          {/* Estado de cotización */}
          <div className="pt-2 text-sm text-gray-600">
            {quoting
              ? dict.checkout.quoting
              : (quoteOk === false
                ? dict.checkout.quote_not_available
                : `${dict.checkout.quote_estimated}${fmt.format(shippingQuoteCents / 100)}`)}
          </div>

          {/* Error del quote */}
          {quoteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
              {quoteError}
              {unavailableOwners.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {unavailableOwners.map(u => (
                    <li key={u.owner_id}>
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

      {/* 2) Resumen del pedido (incluye envío) */}
      <h1 className="text-2xl font-bold">{dict.checkout.title}</h1>
      <div className="rounded-xl border bg-white shadow-sm">
        {/* Cabecera visual */}
        <div className="border-b px-4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">{dict.checkout.title}</h3>
        </div>

        {/* Contenido */}
        <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
          {cartItems.length > 0 ? (
            cartItems.map((item) => {
              const perItemCents = itemDisplayCents(item)
              const lineCents = perItemCents * item.quantity
              return (
                <div key={item.id} className="flex items-center space-x-4">
                  <img
                    src={item.thumbnail || "/pasto.jpg"}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-md border"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.title} <span className="text-gray-600">x{item.quantity}</span>
                    </p>
                    {Number(item?.weight) > 0 && (
                      <p className="text-xs text-gray-500">
                        {dict.checkout.weight}{Number(item.weight).toFixed(2)}{dict.checkout.weight_unit}
                      </p>
                    )}

                    {(item?.owner_name || item?.metadata?.owner) && (
                      <p className="text-xs text-gray-500">
                        {dict.checkout.provider}{item.owner_name || item.metadata?.owner}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-gray-800 mt-1">
                      {fmt.format(lineCents / 100)}
                    </p>
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
            <span>{fmt.format(grandTotalCents / 100)}</span>
          </div>

          {readyToQuote && !quoting && quoteOk === true && (
            <>
              <div className="flex justify-between text-sm pt-2">
                <span>
                  {dict.checkout.card_fee_label} ({CARD_FEE_PCT}%)
                </span>
                <span>{fmt.format(cardFeeCents / 100)}</span>
              </div>
              <p className="text-xs text-gray-500">
                {dict.checkout.card_fee_note}
              </p>

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
            <a
              href={`/${locale}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline"
            >
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

      {/* 3) Pago */}
      <h2 className="text-2xl font-bold">{dict.checkout.payment}</h2>

      <CardPaymentModal
        open={showCardModal}
        amountLabel={directSession ? fmt.format(directSession.amount) : undefined}
        onClose={() => (!cardPaying ? setShowCardModal(false) : null)}
        onSubmit={handleSubmitCard}
        loading={cardPaying}
        dict={dict.card_modal}
      />

      {/* Pago con tarjeta directo */}
      <button
        onClick={handleStartDirect}
        disabled={startingDirect || payDisabled}
        className="w-full bg-emerald-700 text-white py-3 rounded hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center space-x-2"
      >
        <CreditCard size={18} />
        <span>{startingDirect ? dict.common.loading : `${dict.checkout.directPay}`}</span>
      </button>

      {/* Pago por link */}
      <button
        onClick={handleCheckout}
        disabled={payDisabled}
        className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center space-x-2"
      >
        <CreditCard size={18} />
        <span>{isPaying ? dict.common.loading : `${dict.checkout.pay}`}</span>
      </button>
    </div>
  )
}
