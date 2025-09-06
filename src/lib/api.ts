// lib/api.ts
// Unifica llamadas de Encargos y tipa correctamente los headers para evitar
// "No overload matches this call" en fetch.

export type AreaTypeCU =
  | 'city' | 'municipio'            // ← lo que hoy devuelve computeAreaType
  | 'hab_city' | 'hab_rural'        // ← por si en el futuro normalizas
  | 'other_city' | 'other_rural'

export type EncargoItem = {
  id: number
  source: 'amazon' | 'shein' | 'unknown' | string
  external_id: string | null
  asin: string | null
  source_url: string | null
  title: string | null
  image_url: string | null
  price_estimate: string | number | null
  currency?: string | null
  created_at?: string
}

export type ShippingCU = {
  country: 'CU'
  first_name: string
  last_name: string
  phone: string            // +53...
  email: string
  province: string
  municipality: string
  address: string          // Dirección exacta
  area_type: AreaTypeCU
  instructions?: string
  ci: string
}

export type ShippingUS = {
  country: 'US'
  first_name: string
  last_name: string
  phone: string            // +1...
  email: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  zip: string
  instructions?: string
}

export type Shipping = ShippingCU | ShippingUS

export type QuoteResponse = {
  ok: boolean
  shipping_total_cents: number
  breakdown?: Array<{
    owner_id: number | null
    owner_name: string
    mode: string
    weight_lb: number
    shipping_cents: number
  }>
  unavailable?: Array<{ owner_id?: number; owner_name?: string }>
  message?: string
}

export type EncargosCheckoutStart = {
  ok?: boolean
  sessionId?: string | number
  payUrl?: string
  amount?: number
  message?: string
}

export type PayDirectResponse = {
  ok: boolean
  paid: boolean
  orders?: number[]
  sessionId?: string | number
  message?: string
}

export type EncargosRemoveArg = number | { all: true };

const API = process.env.NEXT_PUBLIC_API_BASE_URL!

// ===== Headers helpers (TIPADOS) =====
type HeadersDict = Record<string, string>

function authHeaders(): HeadersDict {
  const h: HeadersDict = {}
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) h.Authorization = `Bearer ${token}`
  }
  return h
}

const jsonHeaders = (extra?: HeadersInit): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(extra || {}),
});

// ===== Utils =====
async function parse<T = unknown>(r: Response): Promise<T | null> {
  const txt = await r.text()
  try { return txt ? (JSON.parse(txt) as T) : null } catch { return null }
}

function getObj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function getStr(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}

// ===== API =====
export async function encargosListMine(): Promise<EncargoItem[]> {
  const r = await fetch(`${API}/encargos/mine`, { headers: authHeaders(), cache: 'no-store' })
  const data = await parse<{ ok: boolean; items: EncargoItem[] }>(r)
  if (!r.ok || !data?.ok) return []
  return Array.isArray(data.items) ? data.items : []
}

export async function encargosRemove(arg: EncargosRemoveArg): Promise<{ ok: boolean }> {
  const body = typeof arg === 'number' ? { id: arg } : { all: true }
  const r = await fetch(`${API}/encargos/remove`, {
    method: 'POST',
    headers: jsonHeaders(authHeaders()),
    body: JSON.stringify(body),
  })

  const txt = await r.text()
  let data: unknown = null
  try { data = txt ? JSON.parse(txt) : null } catch {}

  if (!r.ok) {
    const obj = getObj(data)
    const msg = obj ? (getStr(obj, 'message') ?? getStr(obj, 'error')) : undefined
    throw new Error(msg || txt || 'upstream_error')
  }
  return { ok: true }
}

/**
 * Helper para vaciar todos los encargos sin pelearse con TS en el caller.
 */
export async function encargosClearAll(): Promise<{ ok: boolean }> {
  // el "as const" asegura que el tipo de `true` NO se ensanche a boolean
  return encargosRemove({ all: true as const })
}

export async function encargosQuote(shipping: Shipping): Promise<QuoteResponse> {
  const r = await fetch(`${API}/encargos/quote`, {
    method: 'POST',
    headers: jsonHeaders(authHeaders()), // ⬅️ agrega Authorization
    body: JSON.stringify({ shipping }),
  })
  const data = await parse<QuoteResponse>(r)
  if (!r.ok || !data) throw new Error(data?.message || 'No se pudo cotizar el envío')
  return data
}

export async function encargosCheckoutStart(params: {
  shipping: Shipping
  locale: string
  terms: { accepted: true; url: string; accepted_at: string; version: string }
  payer?: { first_name?: string; last_name?: string; email?: string; phone?: string; address?: string; zip?: string }
  billing?: { first_name?: string; last_name?: string; email?: string; phone?: string; address?: string; zip?: string }
}): Promise<EncargosCheckoutStart> {
  const r = await fetch(`${API}/encargos/checkout`, {
    method: 'POST',
    headers: jsonHeaders(authHeaders()), // ⬅️ agrega Authorization
    body: JSON.stringify({
      payment_method: 'bmspay',
      metadata: {
        shipping: params.shipping,
        locale: params.locale,
        terms: params.terms,
        payer: params.payer || undefined,
        billing: params.billing || undefined,
      },
    }),
  })
  const data = await parse<EncargosCheckoutStart>(r)
  if (!r.ok || !data) throw new Error(data?.message || 'No se pudo iniciar el checkout')
  return data
}

export async function encargosStartDirect(params: {
  shipping: Shipping
  locale: string
  terms: { accepted: true; url: string; accepted_at: string; version: string }
  payer?: { first_name?: string; last_name?: string; email?: string; phone?: string; address?: string; zip?: string }
  billing?: { first_name?: string; last_name?: string; email?: string; phone?: string; address?: string; zip?: string }
}): Promise<EncargosCheckoutStart> {
  const metadata = {
    terms: params.terms,                       // { accepted:true, url, accepted_at, version }
    ...(params.payer ? { payer: params.payer } : {}),
    ...(params.billing ? { billing: params.billing } : {}),
  };

  const r = await fetch(`${API}/encargos/start-direct`, {
    method: 'POST',
    headers: jsonHeaders(authHeaders()),       // debe incluir Authorization + Content-Type
    body: JSON.stringify({
      shipping: params.shipping,
      locale: params.locale || 'es',
      metadata,
    }),
  });

  const data = await parse<EncargosCheckoutStart>(r);
  if (!r.ok || !data?.ok) {
    throw new Error(data?.message || 'No se pudo iniciar el pago directo');
  }
  // data.amount → centavos. Para mostrar: (data.amount/100).toFixed(2)
  return data;
}

export async function encargosPayDirect(params: {
  sessionId: string | number
  amount: number
  cardNumber: string
  expMonth: string
  expYear: string
  cvn: string
  zipCode?: string
  nameOnCard?: string
}): Promise<PayDirectResponse> {
  const r = await fetch(`${API}/payments-direct/bmspay/sale-encargos`, {
    method: 'POST',
    headers: jsonHeaders(authHeaders()), // ⬅️ agrega Authorization
    body: JSON.stringify(params),
  })
  const data = await parse<PayDirectResponse>(r)
  if (!r.ok || !data) throw new Error(data?.message || 'Pago no aprobado')
  return data
}

// ---------- Perfil del cliente (buyer/billing) ----------
export type CustomerProfile = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string      // US, preferible 10 dígitos sin +1
  address?: string
  zip?: string
}

/**
 * Carga el perfil del cliente desde /customers/me (fallback /me)
 * y normaliza llaves comunes.
 */
export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  const headers = authHeaders()
  if (!headers.Authorization) return null

  try {
    const r1 = await fetch(`${API}/customers/me`, { headers })
    const d1 = await parse<unknown>(r1)
    if (r1.ok && d1) {
      const o = getObj(d1)
      if (o) {
        return {
          first_name: getStr(o, 'first_name') ?? getStr(o, 'firstName') ?? getStr(o, 'nombre'),
          last_name:  getStr(o, 'last_name')  ?? getStr(o, 'lastName')  ?? getStr(o, 'apellidos'),
          email:      getStr(o, 'email'),
          phone:      o['phone'] ? String(o['phone']).replace(/^\+?1/, '') : undefined,
          address:    getStr(o, 'address') ?? getStr(o, 'address_line1') ?? getStr(o, 'direccion'),
          zip:        getStr(o, 'zip') ?? getStr(o, 'zipCode'),
        }
      }
    }
  } catch {}
  return null
}

// --- Capturar/guardar un encargo desde la página de confirmación ---
export async function encargosCapture(payload: {
  source: 'amazon' | 'shein' | 'unknown' | string
  externalId?: string | null
  sourceUrl?: string | null
  title?: string | null
  image?: string | null
  price?: string | number | null
  currency?: string
}): Promise<{ ok: boolean; id?: number }> {
  // Este endpoint pasa por el API route de Next porque ahí haces el mapping camelCase→snake_case
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) headers['x-auth-token'] = token
  }

  const r = await fetch('/api/encargos/capture', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const txt = await r.text()
  let data: unknown = null
  try { data = txt ? JSON.parse(txt) : null } catch {}

  const obj = getObj(data)

  if (!r.ok || !obj || obj.ok !== true) {
    const msg = obj ? (getStr(obj, 'message') ?? getStr(obj, 'error')) : undefined
    throw new Error(msg || txt || 'No se pudo guardar el encargo')
  }

  return { ok: true, id: typeof obj['id'] === 'number' ? (obj['id'] as number) : undefined }
}
