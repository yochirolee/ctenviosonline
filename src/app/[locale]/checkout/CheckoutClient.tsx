"use client"

import { useCart } from "@/context/CartContext"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter, useParams } from 'next/navigation'
import type { Dict } from '@/types/Dict'
import { toast } from "sonner"
import { computeAreaType } from '@/lib/cubaAreaType'
import CardPaymentModal from '@/components/CardPaymentModal'
import { useLocation } from '@/context/LocationContext'
import { normalizeCubaProvince, normalizeCubaMunicipality } from '@/lib/cuLocations'
import { ArrowLeft, CreditCard, Ship, Plane, PencilLine, Plus, X, UserRound } from "lucide-react"
import { updateRecipient } from '@/lib/recipients'
import {
  listRecipients,
  createRecipient,
  type Recipient,
  type RecipientCU,
  type CreateRecipientCUInput,
  type CreateRecipientUSInput,
} from '@/lib/recipients'

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

// === Catálogo de Cuba (provincias y municipios) ===
export const CU_PROVINCES = [
  'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas', 'Cienfuegos', 'Villa Clara',
  'Sancti Spíritus', 'Ciego de Ávila', 'Camagüey', 'Las Tunas', 'Holguín', 'Granma', 'Santiago de Cuba',
  'Guantánamo', 'Isla de la Juventud',
] as const;
export type CuProvince = typeof CU_PROVINCES[number];

export const CU_MUNS_BY_PROVINCE: Record<CuProvince, readonly string[]> = {
  'Pinar del Río': [
    'Pinar del Río', 'Consolación del Sur', 'San Luis', 'San Juan y Martínez', 'Viñales', 'Minas de Matahambre',
    'La Palma', 'Los Palacios', 'Mantua', 'Guane', 'Sandino'
  ],
  'Artemisa': [
    'Artemisa', 'Bauta', 'Caimito', 'Guanajay', 'Mariel', 'Güira de Melena', 'Alquízar',
    'San Antonio de los Baños', 'Bahía Honda', 'Candelaria', 'San Cristóbal'
  ],
  'La Habana': [
    'Playa', 'Plaza de la Revolución', 'Centro Habana', 'La Habana Vieja', 'Regla', 'Guanabacoa',
    'Habana del Este', 'San Miguel del Padrón', 'Diez de Octubre', 'Cerro', 'Arroyo Naranjo',
    'Boyeros', 'Cotorro', 'Marianao', 'La Lisa'
  ],
  'Mayabeque': [
    'San José de las Lajas', 'Jaruco', 'Santa Cruz del Norte', 'Madruga', 'Güines', 'Melena del Sur',
    'Quivicán', 'San Nicolás', 'Nueva Paz', 'Batabanó'
  ],
  'Matanzas': [
    'Matanzas', 'Cárdenas', 'Jovellanos', 'Colón', 'Perico', 'Pedro Betancourt', 'Jagüey Grande', 'Limonar',
    'Martí', 'Unión de Reyes', 'Calimete', 'Ciénaga de Zapata'
  ],
  'Cienfuegos': [
    'Cienfuegos', 'Cruces', 'Palmira', 'Cumanayagua', 'Rodas', 'Abreus', 'Lajas', 'Aguada de Pasajeros'
  ],
  'Villa Clara': [
    'Santa Clara', 'Camajuaní', 'Caibarién', 'Remedios', 'Placetas', 'Manicaragua', 'Cifuentes', 'Ranchuelo',
    'Encrucijada', 'Santo Domingo', 'Quemado de Güines', 'Corralillo', 'Sagua la Grande'
  ],
  'Sancti Spíritus': [
    'Sancti Spíritus', 'Trinidad', 'Cabaiguán', 'Jatibonico', 'Taguasco', 'Fomento', 'Yaguajay', 'La Sierpe'
  ],
  'Ciego de Ávila': [
    'Ciego de Ávila', 'Morón', 'Ciro Redondo', 'Venezuela', 'Baraguá', 'Chambas', 'Florencia', 'Majagua',
    'Primero de Enero', 'Bolivia'
  ],
  'Camagüey': [
    'Camagüey', 'Florida', 'Vertientes', 'Esmeralda', 'Minas', 'Sierra de Cubitas', 'Carlos Manuel de Céspedes',
    'Santa Cruz del Sur', 'Jimaguayú', 'Sibanicú', 'Guáimaro', 'Nuevitas'
  ],
  'Las Tunas': [
    'Las Tunas', 'Puerto Padre', 'Jesús Menéndez', 'Majibacoa', 'Manatí', 'Colombia', 'Amancio', 'Jobabo'
  ],
  'Holguín': [
    'Holguín', 'Gibara', 'Banes', 'Antilla', 'Rafael Freyre', 'Báguanos', 'Cacocum', 'Calixto García', 'Urbano Noris',
    'Cueto', 'Mayarí', 'Sagua de Tánamo', 'Moa', 'Frank País'
  ],
  'Granma': [
    'Bayamo', 'Manzanillo', 'Niquero', 'Pilón', 'Media Luna', 'Campechuela', 'Yara', 'Río Cauto', 'Jiguaní',
    'Buey Arriba', 'Bartolomé Masó', 'Guisa', 'Cauto Cristo'
  ],
  'Santiago de Cuba': [
    'Santiago de Cuba', 'Palma Soriano', 'San Luis', 'Songo-La Maya', 'Contramaestre', 'Mella',
    'Segundo Frente', 'Tercer Frente', 'Guamá'
  ],
  'Guantánamo': [
    'Guantánamo', 'Baracoa', 'Maisí', 'Imías', 'San Antonio del Sur', 'Caimanera', 'Niceto Pérez',
    'El Salvador', 'Manuel Tames', 'Yateras'
  ],
  'Isla de la Juventud': ['Isla de la Juventud'],
};

// ---- Captura de errores en móvil (verás toasts + logs en consola) ----
declare global {
  interface Window {
    __crashHooked?: boolean;
  }
}

function setupMobileCrashCapture(): void {
  if (typeof window === 'undefined') return;
  if (window.__crashHooked) return;
  window.__crashHooked = true;

  const report = (msg: string, extra?: unknown) => {
    try { toast.error(`⚠️ ${msg}`); } catch { /* noop */ }
    // Nota: 'extra' es 'unknown' para evitar 'any'
    // eslint-disable-next-line no-console
    console.error('[MobileCrash]', msg, extra);
  };

  window.addEventListener('error', (e: ErrorEvent) => {
    const extra = (e.error && typeof e.error === 'object' && 'stack' in (e.error as object))
      ? (e.error as { stack?: unknown }).stack
      : e.error ?? null;
    report(e.message || 'window.error', extra);
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason: unknown = e.reason;
    const msg =
      typeof reason === 'string'
        ? reason
        : (typeof reason === 'object' && reason && 'message' in reason && typeof (reason as { message?: unknown }).message === 'string')
          ? String((reason as { message: string }).message)
          : 'unhandledrejection';

    const extra =
      (typeof reason === 'object' && reason && 'stack' in reason)
        ? (reason as { stack?: unknown }).stack
        : reason;

    report(msg, extra);
  });
}


// ---- Polyfill CustomEvent (por si algún WebView iOS falla) ----
// ---- Polyfill + helper para CustomEvent en iOS WebViews ----
(function () {
  if (typeof window === 'undefined') return;

  let ctorOk = true;
  try {
    // iOS algunas veces "pasa" aquí pero luego falla al instanciar con detalle.
    // Probamos con detalle para estar seguros.
    // eslint-disable-next-line no-new
    new CustomEvent('test', { detail: { ok: true } });
  } catch {
    ctorOk = false;
  }

  if (!ctorOk) {
    // Polyfill mínimo compatible con initCustomEvent
    function CECustomEvent<T = unknown>(type: string, params: CustomEventInit<T> = {}) {
      const e = document.createEvent('CustomEvent');
      e.initCustomEvent(type, Boolean(params.bubbles), Boolean(params.cancelable), params.detail as T);
      return e;
    }
    (window as Window & typeof globalThis).CustomEvent =
      CECustomEvent as unknown as typeof CustomEvent;
  }
})();

// Emite un evento de forma segura en cualquier WebView iOS
function safeDispatch(type: string, detail?: unknown): void {
  try {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  } catch {
    try {
      const ev = document.createEvent('CustomEvent');
      ev.initCustomEvent(type, true, true, detail as never);
      window.dispatchEvent(ev);
    } catch { /* noop */ }
  }
}


// ---- Detección de navegadores "embebidos" (IG/FB/TikTok) ----
function isInAppBrowserUA(ua: string) {
  ua = ua.toLowerCase();
  return ua.includes('fbav') || ua.includes('fbios') || ua.includes('fban') ||
    ua.includes('instagram') || ua.includes('line/') ||
    ua.includes('snapchat') || ua.includes('tiktok');
}

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

const LS_CU_TRANSPORT = 'checkout_cu_transport';

//Para salvar en LS Destinatario por pais
const LS_RECIPIENT_ID_CU = 'checkout_recipient_id_CU';
const LS_RECIPIENT_ID_US = 'checkout_recipient_id_US';
const lsRecipientKeyFor = (country: 'CU' | 'US') =>
  country === 'CU' ? LS_RECIPIENT_ID_CU : LS_RECIPIENT_ID_US;

const toLocalPhone = (country: 'US' | 'CU', value: string | null | undefined) => {
  const d = String(value ?? '').replace(/\D/g, '')
  if (country === 'US') {
    // acepta 10 o 11 con leading 1 -> deja 10
    return d.replace(/^1(?=\d{10}$)/, '').slice(0, 10)
  }
  // CU: si viene 53 + 8+ dígitos -> quita 53
  return d.replace(/^53(?=\d{8,}$)/, '')
}

type UnavailableLine = {
  owner_name?: string
  title: string
  requested?: number
  available?: number
}

// === tipos de quote ===
type ShippingTransport = 'sea' | 'air';

type ShippingQuoteInputCU = {
  country: 'CU';
  province: string;
  municipality: string;
  area_type: string;
  transport?: ShippingTransport;
};

type ShippingQuoteInputUS = {
  country: 'US';
  state: string;
  city: string;
  zip: string;
};

type ShippingQuoteInput = ShippingQuoteInputCU | ShippingQuoteInputUS;

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

function getErrorMessage(err: unknown, fallback = "Error en el proceso de checkout.") {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return fallback
}

const isRecipientDuplicate = (e: unknown): boolean => {
  if (typeof e !== 'object' || e === null) return false
  const obj = e as Record<string, unknown>

  const status =
    typeof obj.status === 'number'
      ? obj.status
      : (typeof obj.response === 'object' && obj.response !== null
        ? (obj.response as Record<string, unknown>).status as number | undefined
        : undefined)

  const errorStr =
    (typeof obj.error === 'string' && obj.error) ||
    (typeof obj.message === 'string' && obj.message) ||
    (typeof obj.response === 'object' && obj.response !== null &&
      (obj.response as Record<string, unknown>).data &&
      typeof (obj.response as Record<string, unknown>).data === 'object' &&
      typeof ((obj.response as Record<string, unknown>).data as Record<string, unknown>).error === 'string'
      ? (((obj.response as Record<string, unknown>).data as Record<string, unknown>).error as string)
      : undefined)

  return status === 409 || (errorStr ?? '').includes('recipient_duplicate')
}

const LS_FORM_KEY = 'checkout_form_v2'

const getToken = () =>
  (typeof window !== 'undefined' ? localStorage.getItem('token') : null)

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

// === NUEVO: tipo ubicación tomada de destinatario seleccionado ===
type ShipLoc =
  | { country: 'CU'; province: string; municipality: string }
  | { country: 'US'; state: string; city: string; zip: string }


export default function CheckoutPage({ dict }: { dict: Dict }) {
  const { items, cartId, clearCart } = useCart()
  const cartItems: CartLine[] = useMemo(
    () => (items as unknown as CartLine[]) ?? [],
    [items]
  )

  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const { location } = useLocation() // <- fuente de verdad para CU/US (banner)

  const isCU = location?.country === 'CU'
  const isUS = location?.country === 'US'
  const [transport, setTransport] = useState<ShippingTransport>('sea');


  // ===== (NUEVO) Datos del comprador (perfil) =====
  const [buyer, setBuyer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    zip: "",
  })

  // Precargar desde API del customer
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    const controller = new AbortController()

    const load = async () => {
      try {
        let data: unknown = null
        try {
          const r = await fetch(`${API_URL}/customers/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          })
          if (r.ok) data = await r.json().catch(() => null)
        } catch { }

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
      } catch { /* noop */ }
    }

    load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setupMobileCrashCapture();
  }, []);

  // — Billing (buyer) card edit state —
  const [editingBilling, setEditingBilling] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)

  async function saveBilling() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      toast.error(locale === 'en' ? 'Please log in again.' : 'Inicia sesión de nuevo.', { position: 'bottom-center' })
      return
    }
    setSavingBilling(true)
    try {
      const body = {
        first_name: (buyer.first_name || '').trim(),
        last_name: (buyer.last_name || '').trim(),
        phone: (buyer.phone || '').trim(),
        address: (buyer.address || '').trim(),
        zip: (buyer.zip || '').trim(),
        // el email lo editas aquí pero no lo envío en PUT si tu backend no lo acepta; si lo acepta, añade: email: (buyer.email || '').trim(),
      }
      const r = await fetch(`${API_URL}/customers/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error()
      toast.success(locale === 'en' ? 'Billing info updated.' : 'Datos de facturación actualizados.', { position: 'bottom-center' })
      setEditingBilling(false)
    } catch {
      toast.error(locale === 'en' ? 'Could not update billing info.' : 'No se pudieron actualizar los datos de facturación.', { position: 'bottom-center' })
    } finally {
      setSavingBilling(false)
    }
  }


  // ===== (NUEVO) Destinatarios guardados =====
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recLoading, setRecLoading] = useState(false)
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [recipientLoc, setRecipientLoc] = useState<ShipLoc | null>(null)

  const selectValue: string = selectedRecipientId != null ? String(selectedRecipientId) : '';

  // filtra por país del banner (UX simple)
  const filteredRecipients = useMemo(
    () => recipients.filter(r => r.country === (isCU ? 'CU' : isUS ? 'US' : r.country)),
    [recipients, isCU, isUS]
  )
  const noRecipientsForCountry = filteredRecipients.length === 0

  const recipientsForCountry = useMemo(
    () => (location?.country ? recipients.filter(r => r.country === location.country) : recipients),
    [recipients, location?.country]
  )

  const applyRecipient = useCallback((r: Recipient) => {
    const rawCountry = (r as { country?: string }).country;
    const cc: 'CU' | 'US' = (() => {
      const s = String(rawCountry ?? '').trim().toUpperCase();
      if (s === 'CU' || s === 'CUBA') return 'CU';
      if (s === 'US' || s === 'USA' || s === 'UNITED STATES' || s === 'EEUU' || s === 'EE.UU.') return 'US';
      // Heurística por estructura, evita clasificar mal si backend vino sin country.
      return ('province' in (r as object) || 'municipality' in (r as object)) ? 'CU' : 'US';
    })();

    if (cc === 'CU') {
      const rc = r as RecipientCU;
      setRecipientLoc({
        country: 'CU',
        province: rc.province || '',
        municipality: rc.municipality || ''
      });
      setFormData(prev => ({
        ...prev,
        nombre: r.first_name || '',
        apellidos: r.last_name || '',
        email: r.email || '',
        telefono: toLocalPhone('CU', r.phone),
        instrucciones: r.instructions || '',
        address1: '', address2: '', city: '', state: '', zip: '',
        direccion: rc.address || '',
        ci: rc.ci || '',
      }));
    } else {
      const ru = r as {
        address_line1?: string; address_line2?: string | null;
        city?: string; state?: string; zip?: string;
      };
      setRecipientLoc({
        country: 'US',
        state: ru.state || '',
        city: ru.city || '',
        zip: ru.zip || ''
      });
      setFormData(prev => ({
        ...prev,
        nombre: r.first_name || '',
        apellidos: r.last_name || '',
        email: r.email || '',
        telefono: r.phone || '',
        instrucciones: r.instructions || '',
        address1: ru.address_line1 || '',
        address2: ru.address_line2 || '',
        city: ru.city || '',
        state: ru.state || '',
        zip: ru.zip || '',
        direccion: '',
        ci: '',
      }));
    }

    try { localStorage.removeItem(LS_FORM_KEY) } catch { }
    try { localStorage.setItem(lsRecipientKeyFor(cc), String(r.id)) } catch { }
  }, []);

  // evita trabajo durante el cambio de destinatario (tick siguiente)
const switchingRecipientRef = useRef(false);

const findRecipientById = useCallback(
  (id: number, country?: 'CU'|'US'): Recipient | null => {
    const list = country
      ? recipients.filter(r => normalizeCountry((r as any).country) === country)
      : recipients;
    const r = list.find(x => x.id === id);
    return r ?? null;
  },
  [recipients]
);



  useEffect(() => {
    if (!location?.country) return;
    if (recipients.length === 0) return;

    // ¿El seleccionado actual sigue válido para el país?
    const current = recipients.find(r => r.id === selectedRecipientId);
    if (current?.country === location.country) return;

    // 1) Intentar destinatario guardado en LS para el nuevo país
    try {
      if (location.country === 'CU' || location.country === 'US') {
        const key = lsRecipientKeyFor(location.country as 'CU' | 'US');
        const raw = localStorage.getItem(key);
        const savedId = raw ? Number(raw) : NaN;
        if (Number.isFinite(savedId)) {
          const saved = recipients.find(r => r.id === savedId && r.country === location.country);
          if (saved) {
            setSelectedRecipientId(saved.id);
            applyRecipient(saved);
            return;
          }
        }
      }
    } catch { /* noop */ }

    // 2) Autoselección por país (tu misma lógica)
    if (location.country === 'CU' && location.province && location.municipality) {
      const provCanon = normalizeCubaProvince(location.province) || location.province;
      const munCanon = normalizeCubaMunicipality(provCanon, location.municipality) || location.municipality;

      const match = recipients
        .filter((r): r is RecipientCU => r.country === 'CU')
        .find(r =>
          (normalizeCubaProvince(r.province) || r.province) === provCanon &&
          (normalizeCubaMunicipality(provCanon, r.municipality) || r.municipality) === munCanon
        );

      if (match) {
        setSelectedRecipientId(match.id);
        applyRecipient(match);
        return;
      }
    } else if (location.country === 'US') {
      const match = recipients.find(r => r.country === 'US' && r.is_default)
        || recipients.find(r => r.country === 'US');
      if (match) {
        setSelectedRecipientId(match.id);
        applyRecipient(match);
        return;
      }
    }

    // 3) Si nada aplica → limpiar para que el formulario use el país del banner
    setSelectedRecipientId(null);
    setRecipientLoc(null);
  }, [location?.country, location?.province, location?.municipality, recipients, selectedRecipientId, applyRecipient]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    let abort = false
    const run = async () => {
      setRecLoading(true)
      try {
        const rows = await listRecipients()
        if (abort) return
        setRecipients(rows)
        if (!location?.country) return

        // ✅ Preferir destinatario guardado en LS para el país actual
        try {
          const key = lsRecipientKeyFor(location.country as 'CU' | 'US')
          const raw = localStorage.getItem(key)
          const savedId = raw ? Number(raw) : NaN
          if (Number.isFinite(savedId)) {
            const saved = rows.find(r => r.id === savedId && r.country === location.country)
            if (saved) {
              setSelectedRecipientId(saved.id)
              applyRecipient(saved)
              return
            }
          }
        } catch { /* noop */ }

        // ↪️ Fallback solo si no existía guardado
        const firstMatch = rows.find(r => r.country === (isCU ? 'CU' : isUS ? 'US' : r.country))
        if (firstMatch) {
          setSelectedRecipientId(firstMatch.id)
          applyRecipient(firstMatch)
        }
      } catch { /* noop */ }
      finally { setRecLoading(false) }
    }
    run()
    return () => { abort = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== FORM DATA (persist) =====
  const [formData, setFormData] = useState({
    // comunes
    nombre: "",
    apellidos: "",
    telefono: "",
    email: "",
    instrucciones: "",
    // US
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    // Cuba
    direccion: "",
    ci: "",
  })

  // Carga inicial desde LS
  const loadedRef = useRef(false)
  // Carga inicial desde LS (solo invitados sin recipient seleccionado)
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    try {
      const token = getToken()
      if (token || selectedRecipientId !== null) {
        localStorage.removeItem(LS_FORM_KEY)
        return
      }
      const raw = localStorage.getItem(LS_FORM_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setFormData(prev => ({ ...prev, ...parsed }))
      }
    } catch { /* noop */ }
  }, [selectedRecipientId])


  // Guarda incremental en LS
  useEffect(() => {
    try {
      const token = getToken()
      const shouldPersist = !token && selectedRecipientId === null
      if (!shouldPersist) {
        localStorage.removeItem(LS_FORM_KEY)
        return
      }
      localStorage.setItem(LS_FORM_KEY, JSON.stringify(formData))
    } catch { /* noop */ }
  }, [formData, selectedRecipientId])

  const transportHydratedRef = useRef(false);
  const recipientHydratedRef = useRef(false);

  // ===== Validación =====
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const effectiveCountry: 'CU' | 'US' | null =
    (recipientLoc?.country ?? (isCU ? 'CU' : isUS ? 'US' : null))

  const isShipCU = effectiveCountry === 'CU'
  const isShipUS = effectiveCountry === 'US'

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    let firstErrorField: string | null = null

    if (newErrors.buyer_email) {
      firstErrorField = 'billing_email'
    }

    // helpers
    const onlyDigits = (s: string) => String(s || '').replace(/\D/g, '')
    const isEmpty = (s?: string) => !String(s || '').trim()

    // Email comprador (requerido)
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!buyer.email || !EMAIL_RE.test(buyer.email)) {
      newErrors.buyer_email =
        dict.checkout?.errors?.email ||
        (locale === 'en'
          ? 'Billing email is required and must be valid'
          : 'El email de facturación es obligatorio y debe ser válido')
    }

    // Email receptor (opcional, si viene debe ser válido)
    if (formData.email && !EMAIL_RE.test(formData.email)) {
      newErrors.email = dict.checkout?.errors?.email || 'Email inválido'
    }

    // Comunes
    if (isEmpty(formData.nombre)) {
      newErrors.nombre = dict.checkout?.errors?.nombre || 'Nombre requerido'
    }
    if (isEmpty(formData.apellidos)) {
      newErrors.apellidos = dict.checkout?.errors?.apellidos || 'Apellidos requeridos'
    }

    // País efectivo (según recipient o banner)
    const effectiveCountry: 'CU' | 'US' | null =
      (recipientLoc?.country ?? (isCU ? 'CU' : isUS ? 'US' : null))
    const isShipCU = effectiveCountry === 'CU'
    const isShipUS = effectiveCountry === 'US'

    if (isShipCU) {
      // Teléfono CU: EXACTAMENTE 8 dígitos
      const cuPhone = onlyDigits(formData.telefono)
      if (!/^\d{8}$/.test(cuPhone)) {
        newErrors.telefono = dict.checkout?.errors?.telefono || 'El teléfono debe tener exactamente 8 dígitos'
      }

      // CI: 11 dígitos
      if (!/^\d{11}$/.test(String(formData.ci || '').trim())) {
        newErrors.ci = dict.checkout?.errors?.ci || 'El CI debe tener 11 dígitos'
      }

      // Dirección exacta (requerida)
      if (isEmpty(formData.direccion)) {
        newErrors.direccion = dict.checkout?.errors?.address || 'La dirección exacta es obligatoria'
      }
    } else if (isShipUS) {
      // Teléfono US: EXACTAMENTE 10 dígitos
      const usPhone = onlyDigits(formData.telefono)
      if (!/^\d{10}$/.test(usPhone)) {
        newErrors.telefono = dict.checkout?.errors?.telefonoeu || 'El teléfono debe tener 10 dígitos'
      }

      if (isEmpty(formData.address1)) {
        newErrors.address1 = dict.checkout?.errors?.address1eu || 'Dirección (línea 1) requerida'
      }
      if (isEmpty(formData.city)) {
        newErrors.city = dict.checkout?.errors?.cityeu || 'Ciudad requerida'
      }
      if (isEmpty(formData.state)) {
        newErrors.state = dict.checkout?.errors?.stateeu || 'Estado requerido'
      }
      if (!/^\d{5}(-\d{4})?$/.test(String(formData.zip || ''))) {
        newErrors.zip = dict.checkout?.errors?.zipeu || 'ZIP inválido'
      }
    } else {
      // Sin país → error de selección (lleva el scroll al banner)
      newErrors._noCountry = dict.location_banner?.location_select_required1 || 'Selecciona un país para continuar'
    }

    // === Elegir el primer campo a enfocar (orden por país) ===
    const orderCU = ['nombre', 'apellidos', 'telefono', 'ci', 'direccion'] as const
    const orderUS = ['nombre', 'apellidos', 'telefono', 'address1', 'city', 'state', 'zip'] as const


    if (Object.keys(newErrors).length > 0) {
      if (isShipCU) {
        firstErrorField = orderCU.find(k => newErrors[k] !== undefined) || null
      } else if (isShipUS) {
        firstErrorField = orderUS.find(k => newErrors[k] !== undefined) || null
      }
      if (!firstErrorField && newErrors._noCountry) {
        // id del contenedor del banner que ya tienes en el JSX
        firstErrorField = 'location'
      }
      // Fallback por si algo quedó fuera del orden
      if (!firstErrorField) {
        firstErrorField = Object.keys(newErrors)[0] || null
      }
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
    isShipUS
      ? Boolean(
        (recipientLoc?.country === 'US'
          ? (recipientLoc.state && recipientLoc.city && recipientLoc.zip)
          : (formData.state && formData.city && formData.zip))
      )
      : isShipCU
        ? Boolean(
          (recipientLoc?.country === 'CU'
            ? (recipientLoc.province && recipientLoc.municipality)
            : (location?.province && location?.municipality))
        )
        : false

  useEffect(() => {
    if (!isCU || transportHydratedRef.current) return;
    transportHydratedRef.current = true;
    try {
      const t = localStorage.getItem(LS_CU_TRANSPORT);
      if (t === 'sea' || t === 'air') setTransport(t as ShippingTransport);
    } catch { /* noop */ }
  }, [isCU]);

  useEffect(() => {
    try {
      if (isCU) localStorage.setItem(LS_CU_TRANSPORT, transport);
      else localStorage.removeItem(LS_CU_TRANSPORT);
    } catch { /* noop */ }
  }, [isCU, transport]);

  useEffect(() => {
    // Espera a tener país y lista cargada
    if (!location?.country || recipientHydratedRef.current) return;
    if (recipients.length === 0) return;

    try {
      const key = lsRecipientKeyFor(location.country as 'CU' | 'US');
      const raw = localStorage.getItem(key);
      if (raw) {
        const id = Number(raw);
        if (Number.isFinite(id)) {
          const r = recipients.find(x => x.id === id && x.country === location.country);
          if (r) {
            setSelectedRecipientId(r.id);
            applyRecipient(r);
          }
        }
      }
    } catch { /* noop */ }
    finally {
      // Marcamos hidratado SOLO después de que hubo lista para intentar
      recipientHydratedRef.current = true;
    }
  }, [location?.country, recipients, applyRecipient]);

  useEffect(() => {
    try {
      const r = recipients.find(x => x.id === selectedRecipientId);
      if (!r) return;
      const key = lsRecipientKeyFor(r.country as 'CU' | 'US');
      localStorage.setItem(key, String(r.id));
    } catch { /* noop */ }
  }, [selectedRecipientId, recipients]);

  useEffect(() => {
    if (switchingRecipientRef.current) {
      return;
    }
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
        let shipping: ShippingQuoteInput;

        if (recipientLoc?.country === 'CU') {
          const province = recipientLoc.province?.trim() || '';
          const municipality = recipientLoc.municipality?.trim() || '';
          if (!province || !municipality) { setQuoting(false); return; }
          shipping = {
            country: 'CU',
            province,
            municipality,
            area_type: computeAreaType(province, municipality),
            transport,
          };
        } else if (recipientLoc?.country === 'US') {
          const state = recipientLoc.state?.trim() || '';
          const city = recipientLoc.city?.trim() || '';
          const zip = recipientLoc.zip?.trim() || '';
          if (!state || !city || !zip) { setQuoting(false); return; }
          shipping = { country: 'US', state, city, zip };
        } else if (isCU) {
          const province = (location?.province || '').trim();
          const municipality = (location?.municipality || '').trim();
          if (!province || !municipality) { setQuoting(false); return; }
          shipping = {
            country: 'CU',
            province,
            municipality,
            area_type: computeAreaType(province, municipality),
            transport,
          };
        } else {
          const state = (formData.state || '').trim();
          const city = (formData.city || '').trim();
          const zip = (formData.zip || '').trim();
          if (!state || !city || !zip) { setQuoting(false); return; }
          shipping = { country: 'US', state, city, zip };
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
        const serverMsg = (rec && typeof rec.message === 'string') ? String(rec.message) : ''

        // helpers tipados para CU
        const provinceArg = shipping.country === 'CU' ? shipping.province : undefined
        const municipalityArg = shipping.country === 'CU' ? shipping.municipality : undefined

        if (okFlag === false) {
          const u = Array.isArray(rec?.unavailable)
            ? (rec!.unavailable as Array<{ owner_id: number; owner_name: string }>)
            : []
          setQuoteOk(false)
          const errMsg =
            buildQuoteErrorMsg({
              province: provinceArg,
              municipality: municipalityArg,
              unavailable: u,
            }) + (serverMsg ? `\n${serverMsg}` : '')
          setQuoteError(errMsg)
          setUnavailableOwners(u)
          setShippingQuoteCents(0)
          setShippingBreakdown([])
          return
        }

        if (r.status >= 400 || !rec) {
          const u = Array.isArray(rec?.unavailable)
            ? (rec!.unavailable as Array<{ owner_id: number; owner_name: string }>)
            : []
          setQuoteOk(false)
          const errMsg =
            buildQuoteErrorMsg({
              province: provinceArg,
              municipality: municipalityArg,
              unavailable: u,
            }) + (serverMsg ? `\n${serverMsg}` : '')
          setQuoteError(errMsg)
          setUnavailableOwners(u)
          setShippingQuoteCents(0)
          setShippingBreakdown([])
          return
        }

        setQuoteOk(true)
        setQuoteError(null)
        setUnavailableOwners([])
        setShippingQuoteCents(Number((rec.shipping_total_cents as number) || 0))
        setShippingBreakdown(
          Array.isArray(rec.breakdown)
            ? (rec.breakdown as Array<{ owner_id: number | null; owner_name: string; mode: string; weight_lb: number; shipping_cents: number }>)
            : []
        )
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
  }, [
    cartId,
    isShipCU, isShipUS,
    location?.province, location?.municipality, location?.country,
    formData.state, formData.city, formData.zip,
    readyToQuote,
    recipientLoc,
    selectedRecipientId,
    transport,
  ])


  const grandTotalCents = subtotalCents + taxCents + shippingQuoteCents
  const cardFeeCents = Math.round(grandTotalCents * FEE_RATE)
  const totalWithCardFeeCents = grandTotalCents + cardFeeCents

  const deliveryName = useMemo(
    () => [formData.nombre, formData.apellidos].filter(Boolean).join(' '),
    [formData.nombre, formData.apellidos]
  )

  const deliveryAddress = useMemo(() => {
    if (isShipUS) {
      const city = recipientLoc?.country === 'US' ? recipientLoc.city : formData.city
      const state = recipientLoc?.country === 'US' ? recipientLoc.state : formData.state
      const zip = recipientLoc?.country === 'US' ? recipientLoc.zip : formData.zip
      const countryLabel = locale === 'en' ? 'United States' : 'Estados Unidos'
      const parts = [formData.address1, city, state, zip, countryLabel].filter(Boolean)
      return parts.join(', ')
    }
    if (isShipCU) {
      const province = recipientLoc?.country === 'CU' ? recipientLoc.province : (location?.province || '')
      const municipality = recipientLoc?.country === 'CU' ? recipientLoc.municipality : (location?.municipality || '')
      const parts = [formData.direccion, municipality, province, 'Cuba'].filter(Boolean)
      return parts.join(', ')
    }
    return ''
  }, [isShipUS, isShipCU, recipientLoc, formData.address1, formData.city, formData.state, formData.zip, formData.direccion, location?.province, location?.municipality, locale])


  const isPaying = false

  // ===== Aceptación de Términos
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const payDisabled =
    isPaying ||
    cartItems.length === 0 ||
    quoting ||
    !readyToQuote ||
    (readyToQuote && quoteOk !== true) ||
    !acceptedTerms

  // ===== Pago directo =====
  const [showCardModal, setShowCardModal] = useState(false)
  const [startingDirect, setStartingDirect] = useState(false)
  const [cardPaying, setCardPaying] = useState(false)
  const [directSession, setDirectSession] = useState<{ id: string; amount: number } | null>(null)

  const handleStartDirect = async () => {
    const { ok, firstErrorField } = validate()
    if (!ok) {
      const needsBillingEmail = !buyer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)
      if (needsBillingEmail) setEditingBilling(true)
      if (firstErrorField) {
        // da un pequeño delay si acabamos de abrir el editor para asegurar que el input existe
        setTimeout(() => {
          const el = document.getElementById(firstErrorField)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              ; (el as HTMLInputElement).focus()
          } else {
            const card = document.getElementById('billing-card')
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, needsBillingEmail ? 120 : 0)
      }
      return
    }
    if (quoting || (readyToQuote && quoteOk !== true)) {
      toast.error(quoteError || 'Hay productos que no se pueden entregar a esa dirección.', { position: 'bottom-center' })
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
        const locLabel =
          (recipientLoc?.country === 'CU')
            ? [recipientLoc.municipality, recipientLoc.province].filter(Boolean).join(', ')
            : (recipientLoc?.country === 'US'
              ? [recipientLoc.city, recipientLoc.state, recipientLoc.zip].filter(Boolean).join(', ')
              : (isCU
                ? [location?.municipality, location?.province].filter(Boolean).join(', ')
                : [formData.city, formData.state, formData.zip].filter(Boolean).join(', ')))

        toast.error(buildAvailabilityErrorMsg(Array.isArray(vdata?.unavailable) ? (vdata.unavailable as UnavailableLine[]) : [], locLabel), { position: 'bottom-center' })
        return
      }
    } catch {
      toast.error('No se pudo validar disponibilidad. Intenta de nuevo.', { position: 'bottom-center' })
      return
    }

    // === shipping final (misma estructura de siempre, pero preferimos el destinatario si fue seleccionado)
    const shipping =
      (recipientLoc?.country === 'CU' || (isShipCU && !recipientLoc))
        ? (() => {
          const province = (recipientLoc?.country === 'CU') ? recipientLoc.province : location!.province!
          const municipality = (recipientLoc?.country === 'CU') ? recipientLoc.municipality : location!.municipality!
          return {
            country: 'CU' as const,
            first_name: formData.nombre,
            last_name: formData.apellidos,
            phone: `+53${formData.telefono.replace(/\D/g, '').replace(/^53(?=\d{8,}$)/, '')}`,
            email: formData.email || buyer.email,
            province,
            municipality,
            address: formData.direccion || '',
            area_type: computeAreaType(province, municipality),
            instructions: formData.instrucciones || undefined,
            ci: formData.ci,
            transport,
          }
        })()
        : {
          country: 'US' as const,
          first_name: formData.nombre,
          last_name: formData.apellidos,
          phone: `+1${formData.telefono.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')}`,
          email: formData.email || buyer.email,
          address_line1: formData.address1,
          address_line2: formData.address2 || undefined,
          city: (recipientLoc?.country === 'US') ? recipientLoc.city : formData.city,
          state: (recipientLoc?.country === 'US') ? recipientLoc.state : formData.state,
          zip: (recipientLoc?.country === 'US') ? recipientLoc.zip : formData.zip,
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
            shipping_prefs: { transport },
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

  const goToRecipientSelect = () => {
    const el = document.getElementById('recipient_select') as HTMLSelectElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus()
      return
    }
    // Fallback si por alguna razón no está el select:
    router.push(`/${locale}/account#recipients`)
  }

  const DELIVERY_TIMES: {
    en: { title: string; sea: [string, string][], air: [string, string][] };
    es: { title: string; sea: [string, string][], air: [string, string][] };
  } = {
    en: {
      title: 'Delivery times',
      sea: [
        ['Sea shipments:', 'estimated 25–35 calendar days from payment confirmation.'],
        ['“72 hours” category:', 'delivered within 72 hours (3 days) in covered areas, counted from payment confirmation.'],
        ['Mixed orders:', '“72 hours” items keep their 72-hour window; the rest follow the sea timeline.'],
      ],
      air: [
        ['Air shipments:', 'estimated 7–14 calendar days from payment confirmation.'],
        ['“72 hours” category:', 'delivered within 72 hours (3 days) in covered areas, counted from payment confirmation.'],
        ['Mixed orders:', '“72 hours” items keep their 72-hour window; the rest follow the air timeline.'],
      ],
    },
    es: {
      title: 'Tiempos de entrega',
      sea: [
        ['Envíos por barco:', 'estimados entre 25 y 35 días naturales desde la confirmación del pago.'],
        ['Categoría “72 horas”:', 'entrega en un máximo de 72 horas (3 días) en zonas de cobertura, contadas desde la confirmación del pago.'],
        ['Pedidos mixtos:', 'los artículos “72 horas” mantienen su plazo; el resto sigue el plazo de barco.'],
      ],
      air: [
        ['Envíos por avión:', 'estimados entre 7 y 14 días naturales desde la confirmación del pago.'],
        ['Categoría “72 horas”:', 'entrega en un máximo de 72 horas (3 días) en zonas de cobertura, contadas desde la confirmación del pago.'],
        ['Pedidos mixtos:', 'los artículos “72 horas” mantienen su plazo; el resto sigue el plazo de avión.'],
      ],
    },
  };

  // ===== Recipient modal state + helpers (colocar antes de // ===== UI =====) =====

  // Tipado local del borrador para no pelear con el union (CU/US)
  type RecipientDraft = {
    id?: number;
    country?: 'CU' | 'US';
    first_name?: string;
    last_name?: string;
    email?: string | null;
    phone?: string | null;
    label?: string | null;
    notes?: string | null;
    is_default?: boolean;
    instructions?: string | null;

    // US
    address_line1?: string;
    address_line2?: string | null;
    city?: string;
    state?: string;
    zip?: string;

    // CU
    address?: string;
    ci?: string;
    province?: string;
    municipality?: string;
  };

  // Subtipo derivado del union que ya tienes importado
  type RecipientUSNarrow = Extract<Recipient, { country: 'US' }>;

  const isRecipientUS = (x: Recipient): x is RecipientUSNarrow =>
    normalizeCountry((x as { country?: string }).country) === 'US';

  const isRecipientCU = (x: Recipient): x is RecipientCU =>
    normalizeCountry((x as { country?: string }).country) === 'CU';

  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [recipientModalMode, setRecipientModalMode] = useState<'create' | 'edit'>('create');
  const [recipientDraft, setRecipientDraft] = useState<RecipientDraft>({});
  const [savingRecipientInline, setSavingRecipientInline] = useState(false);
  const [recipientErrors, setRecipientErrors] = useState<Record<string, string>>({});

  // Normaliza cualquier valor de país a 'CU' | 'US'
  function normalizeCountry(c: unknown): 'CU' | 'US' {
    const s = String(c ?? '').trim().toUpperCase();
    if (s === 'CU' || s === 'CUBA') return 'CU';
    if (s === 'US' || s === 'USA' || s === 'UNITED STATES' || s === 'EEUU' || s === 'EE.UU.') return 'US';
    return 'CU';
  }


  function openCreateRecipient() {
    const defaultCountry: 'CU' | 'US' =
      (location?.country === 'CU' || location?.country === 'US') ? location.country : 'CU';

    setRecipientModalMode('create');

    if (defaultCountry === 'CU') {
      // Asegura combinaciones válidas (si banner trae algo raro)
      const prov = CU_PROVINCES.includes((location?.province ?? '') as CuProvince)
        ? (location!.province as CuProvince)
        : CU_PROVINCES[0];
      const muns = CU_MUNS_BY_PROVINCE[prov];
      const mun = muns.includes(location?.municipality ?? '') ? (location!.municipality as string) : muns[0];

      setRecipientDraft({
        country: 'CU',
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        province: prov,
        municipality: mun,
        address: '',
        ci: '',
        instructions: '',
      });
    } else {
      setRecipientDraft({
        country: 'US',
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip: '',
        instructions: '',
      });
    }
    setShowRecipientModal(true);
  }

  function toRecipientDraft(r: Recipient): RecipientDraft {
    const country = normalizeCountry((r as { country?: string }).country);

    if (country === 'CU') {
      const rc = r as RecipientCU;
      return {
        id: rc.id,
        country: 'CU',
        first_name: rc.first_name,
        last_name: rc.last_name,
        email: rc.email ?? null,
        phone: rc.phone ?? null,
        label: rc.label ?? null,
        notes: rc.notes ?? null,
        is_default: rc.is_default ?? false,
        instructions: rc.instructions ?? null,
        province: rc.province,
        municipality: rc.municipality,
        address: rc.address,
        ci: rc.ci,
      };
    }

    // US por defecto cuando country === 'US' (evita caer en CU por tener keys "presentes" pero vacías)
    const ru = r as {
      id: number;
      first_name: string; last_name: string;
      email?: string | null; phone?: string | null;
      label?: string | null; notes?: string | null;
      is_default?: boolean; instructions?: string | null;
      address_line1?: string; address_line2?: string | null;
      city?: string; state?: string; zip?: string;
    };

    return {
      id: ru.id,
      country: 'US',
      first_name: ru.first_name,
      last_name: ru.last_name,
      email: ru.email ?? null,
      phone: ru.phone ?? null,
      label: ru.label ?? null,
      notes: ru.notes ?? null,
      is_default: ru.is_default ?? false,
      instructions: ru.instructions ?? null,
      address_line1: ru.address_line1 || '',
      address_line2: (ru.address_line2 ?? null),
      city: ru.city || '',
      state: ru.state || '',
      zip: ru.zip || '',
    };
  }

  function openEditRecipient() {
    if (selectedRecipientId == null) return; // aceptamos id=0 si existiera
    const r = recipients.find(x => x.id === selectedRecipientId);
    if (!r) return;
    setRecipientModalMode('edit');

    const rr = { ...r, country: normalizeCountry(r.country) } as Recipient;

    if (rr.country === 'CU') {
      const prov: CuProvince = CU_PROVINCES.includes(rr.province as CuProvince)
        ? (rr.province as CuProvince)
        : CU_PROVINCES[0];
      const muns = CU_MUNS_BY_PROVINCE[prov];
      const mun = muns.includes(rr.municipality) ? rr.municipality : muns[0];
      setRecipientDraft({ ...toRecipientDraft(rr), province: prov, municipality: mun });
    } else {
      setRecipientDraft(toRecipientDraft(rr));
    }
    setShowRecipientModal(true);
  }

  function validateRecipient(d: RecipientDraft): boolean {
    const E: Record<string, string> = {};
    const required = (v?: string) => String(v || '').trim().length > 0;
    const digits = (v?: string | null) => String(v ?? '').replace(/\D/g, '');

    if (!required(d.first_name)) E.first_name = locale === 'en' ? 'First name required' : 'Nombre requerido';
    if (!required(d.last_name)) E.last_name = locale === 'en' ? 'Last name required' : 'Apellidos requeridos';

    if (d.country === 'US') {
      if (digits(d.phone).length !== 10) E.phone = locale === 'en' ? '10 digits required' : '10 dígitos requeridos';
      if (!required(d.address_line1)) E.address_line1 = dict.checkout?.errors?.address1eu || 'Dirección requerida';
      if (!required(d.city)) E.city = dict.checkout?.errors?.cityeu || 'Ciudad requerida';
      if (!required(d.state)) E.state = dict.checkout?.errors?.stateeu || 'Estado requerido';
      if (!/^\d{5}(-\d{4})?$/.test(String(d.zip || ''))) E.zip = dict.checkout?.errors?.zipeu || 'ZIP inválido';
    }

    if (d.country === 'CU') {
      if (digits(d.phone).length !== 8) E.phone = locale === 'en' ? '8 digits required' : '8 dígitos requeridos';
      if (!required(d.ci) || digits(d.ci).length !== 11) E.ci = dict.checkout?.errors?.ci || 'CI inválido';
      if (!required(d.address)) E.address = dict.checkout?.errors?.address || 'Dirección requerida';
      if (!required(d.province)) E.province = locale === 'en' ? 'Province required' : 'Provincia requerida';
      if (!required(d.municipality)) E.municipality = locale === 'en' ? 'Municipality required' : 'Municipio requerido';
    }

    setRecipientErrors(E);
    return Object.keys(E).length === 0;
  }

  async function saveRecipientFromModal() {
    const d = recipientDraft;
    if (!d?.country) return;
    if (!validateRecipient(d)) return;

    try {
      setSavingRecipientInline(true);
      if (recipientModalMode === 'create') {
        // Crear
        const created = d.country === 'CU'
          ? await createRecipient({
            country: 'CU',
            first_name: d.first_name!, last_name: d.last_name!,
            email: d.email || undefined, phone: d.phone || undefined,
            instructions: d.instructions || undefined,
            province: d.province!, municipality: d.municipality!,
            address: d.address!, ci: d.ci!,
          } as CreateRecipientCUInput)
          : await createRecipient({
            country: 'US',
            first_name: d.first_name!, last_name: d.last_name!,
            email: d.email || undefined, phone: d.phone || undefined,
            instructions: d.instructions || undefined,
            address_line1: d.address_line1!, address_line2: d.address_line2 || undefined,
            city: d.city!, state: d.state!, zip: d.zip!,
          } as CreateRecipientUSInput);

        setRecipients(prev => [created, ...prev]);
        setSelectedRecipientId(created.id);
        applyRecipient(created);
        try {
          const key = lsRecipientKeyFor(created.country);
          localStorage.setItem(key, String(created.id));
        } catch { }
        setShowRecipientModal(false);
        toast.success(locale === 'en' ? 'Recipient saved' : 'Destinatario guardado', { position: 'bottom-center' });
        return;
      }
      // Editar
      if (!('id' in d) || !d.id) return;

      const patch =
        d.country === 'CU'
          ? {
            country: 'CU' as const,
            first_name: d.first_name,
            last_name: d.last_name,
            email: d.email,
            phone: d.phone,
            instructions: d.instructions,
            province: d.province,
            municipality: d.municipality,
            address: d.address,
            ci: d.ci,
          }
          : {
            country: 'US' as const,
            first_name: d.first_name,
            last_name: d.last_name,
            email: d.email,
            phone: d.phone,
            instructions: d.instructions,
            address_line1: d.address_line1,
            address_line2: d.address_line2,
            city: d.city,
            state: d.state,
            zip: d.zip,
          };

      const updated = await updateRecipient(d.id as number, patch);
      setRecipients(prev => prev.map(x => x.id === updated.id ? updated : x));
      setSelectedRecipientId(updated.id);
      applyRecipient(updated);
      setShowRecipientModal(false);
      toast.success(locale === 'en' ? 'Recipient updated' : 'Destinatario actualizado', { position: 'bottom-center' });

    } catch (e) {
      if (isRecipientDuplicate(e)) {
        toast.info(locale === 'en'
          ? 'This recipient already exists.'
          : 'Este destinatario ya existe.', { position: 'bottom-center' });

        // (Opcional) tratar de autoseleccionarlo
        try {
          const rows = await listRecipients();
          setRecipients(rows);

          const match = rows.find(r => {
            const sameName =
              r.first_name?.trim().toLowerCase() === (d.first_name || '').trim().toLowerCase() &&
              r.last_name?.trim().toLowerCase() === (d.last_name || '').trim().toLowerCase();

            if (d.country === 'CU') {
              return isRecipientCU(r) &&
                sameName &&
                (r.ci?.trim() === (d.ci || '').trim());
            }

            return isRecipientUS(r) &&
              sameName &&
              (r.address_line1?.trim().toLowerCase() === (d.address_line1 || '').trim().toLowerCase()) &&
              (r.zip?.trim() === (d.zip || '').trim());
          });


          if (match) {
            setSelectedRecipientId(match.id);
            applyRecipient(match);
            setShowRecipientModal(false);
          }
        } catch { }

        return; // no lo tratamos como error fatal
      }
      toast.error(getErrorMessage(e, locale === 'en' ? 'Could not save recipient.' : 'No se pudo guardar el destinatario.'), { position: 'bottom-center' });
    } finally {
      setSavingRecipientInline(false);
    }
  }

  // ===== Modal: Create/Edit Recipient (como constante) =====
  const recipientModal = showRecipientModal && (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !savingRecipientInline && setShowRecipientModal(false)}
      />
      {/* + overflow-y-auto para poder desplazar el overlay completo si hace falta */}
      <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto">
        {/* + max-h y overflow para que el panel no exceda la pantalla y haga scroll interno */}
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border max-h-[85vh] overflow-y-auto">
          {/* + sticky top-0 para mantener visible el header */}
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10">
            <div className="font-semibold">
              {recipientModalMode === 'create'
                ? (locale === 'en' ? 'New recipient' : 'Nuevo destinatario')
                : (locale === 'en' ? 'Edit recipient' : 'Editar destinatario')}
            </div>
            <button
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
              onClick={() => !savingRecipientInline && setShowRecipientModal(false)}
              aria-label={locale === 'en' ? 'Close' : 'Cerrar'}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Selector de país (solo creación) */}
            {recipientModalMode === 'create' && (
              <div className="flex gap-2">
                {(['CU', 'US'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setRecipientDraft(prev => ({
                      ...prev,
                      country: c,
                      ...(c === 'CU'
                        ? { province: location?.province || '', municipality: location?.municipality || '', address: '', ci: '' }
                        : { address_line1: '', address_line2: '', city: '', state: '', zip: '' })
                    }))}
                    className={[
                      "px-3 py-1.5 rounded border",
                      recipientDraft.country === c ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "hover:bg-gray-50"
                    ].join(' ')}
                  >
                    {c === 'CU' ? 'Cuba' : 'USA'}
                  </button>
                ))}
              </div>
            )}

            {/* Comunes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.first_name}</label>
                <input
                  className="input"
                  value={recipientDraft.first_name || ''}
                  onChange={(e) => setRecipientDraft(d => ({ ...d, first_name: e.target.value }))}
                />
                {recipientErrors.first_name && <p className="text-xs text-red-600 mt-1">{recipientErrors.first_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.last_name}</label>
                <input
                  className="input"
                  value={recipientDraft.last_name || ''}
                  onChange={(e) => setRecipientDraft(d => ({ ...d, last_name: e.target.value }))}
                />
                {recipientErrors.last_name && <p className="text-xs text-red-600 mt-1">{recipientErrors.last_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.phone}</label>
                <input
                  className="input"
                  placeholder={recipientDraft.country === 'US' ? '10 dígitos' : '8 dígitos'}
                  value={recipientDraft.phone || ''}
                  onChange={(e) => setRecipientDraft(d => ({ ...d, phone: e.target.value }))}
                />
                {recipientErrors.phone && <p className="text-xs text-red-600 mt-1">{recipientErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {dict.checkout.email} <span className="text-gray-500">({locale === 'en' ? 'optional' : 'opcional'})</span>
                </label>
                <input
                  className="input"
                  value={recipientDraft.email || ''}
                  onChange={(e) => setRecipientDraft(d => ({ ...d, email: e.target.value }))}
                />
              </div>
            </div>

            {/* País-específico */}
            {recipientDraft.country === 'CU' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.ci}</label>
                  <input
                    className="input"
                    value={recipientDraft.ci || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, ci: e.target.value }))}
                  />
                  {recipientErrors.ci && <p className="text-xs text-red-600 mt-1">{recipientErrors.ci}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.addressExact}</label>
                  <input
                    className="input"
                    value={recipientDraft.address || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, address: e.target.value }))}
                  />
                  {recipientErrors.address && <p className="text-xs text-red-600 mt-1">{recipientErrors.address}</p>}
                </div>
                {/* Provincia (select) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{locale === 'en' ? 'Province' : 'Provincia'}</label>
                  <select
                    className="input"
                    value={recipientDraft.province || ''}
                    onChange={(e) => {
                      const prov = e.target.value as CuProvince;
                      const muns = CU_MUNS_BY_PROVINCE[prov] ?? [];
                      setRecipientDraft(d => ({
                        ...d,
                        province: prov,
                        municipality: (muns[0] ?? ''),
                      }));
                    }}
                  >
                    {CU_PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {recipientErrors.province && <p className="text-xs text-red-600 mt-1">{recipientErrors.province}</p>}
                </div>

                {/* Municipio (select dependiente) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{locale === 'en' ? 'Municipality' : 'Municipio'}</label>
                  <select
                    className="input"
                    value={recipientDraft.municipality || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, municipality: e.target.value }))}
                  >
                    {(recipientDraft.province
                      ? CU_MUNS_BY_PROVINCE[recipientDraft.province as CuProvince] ?? []
                      : []
                    ).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {recipientErrors.municipality && <p className="text-xs text-red-600 mt-1">{recipientErrors.municipality}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.instructions_label}</label>
                  <input
                    className="input"
                    value={recipientDraft.instructions || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, instructions: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.address1eu}</label>
                  <input
                    className="input"
                    value={recipientDraft.address_line1 || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, address_line1: e.target.value }))}
                  />
                  {recipientErrors.address_line1 && <p className="text-xs text-red-600 mt-1">{recipientErrors.address_line1}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.address2eu} <span className="text-gray-500">(opcional)</span></label>
                  <input
                    className="input"
                    value={recipientDraft.address_line2 || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, address_line2: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.cityeu}</label>
                  <input
                    className="input"
                    value={recipientDraft.city || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, city: e.target.value }))}
                  />
                  {recipientErrors.city && <p className="text-xs text-red-600 mt-1">{recipientErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.stateeu}</label>
                  <select
                    className="input"
                    value={recipientDraft.state || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, state: e.target.value }))}
                  >
                    <option value="">{locale === 'en' ? 'Select' : 'Seleccione'}</option>
                    {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                  {recipientErrors.state && <p className="text-xs text-red-600 mt-1">{recipientErrors.state}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.zipeu}</label>
                  <input
                    className="input"
                    value={recipientDraft.zip || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, zip: e.target.value }))}
                  />
                  {recipientErrors.zip && <p className="text-xs text-red-600 mt-1">{recipientErrors.zip}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">{dict.checkout.instructions_label}</label>
                  <input
                    className="input"
                    value={recipientDraft.instructions || ''}
                    onChange={(e) => setRecipientDraft(d => ({ ...d, instructions: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* + sticky bottom-0 para mantener visible el footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t sticky bottom-0 bg-white z-10">
            <button
              type="button"
              className="px-3 py-1.5 rounded border hover:bg-gray-50"
              onClick={() => !savingRecipientInline && setShowRecipientModal(false)}
              disabled={savingRecipientInline}
            >
              {locale === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              onClick={saveRecipientFromModal}
              disabled={savingRecipientInline}
            >
              {savingRecipientInline
                ? (locale === 'en' ? 'Saving…' : 'Guardando…')
                : (recipientModalMode === 'create' ? (locale === 'en' ? 'Save recipient' : 'Guardar destinatario') : (locale === 'en' ? 'Save changes' : 'Guardar cambios'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (!showRecipientModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showRecipientModal]);


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
                { try { safeDispatch('location:open'); } catch { } window.scrollTo({ top: 0, behavior: 'smooth' }) }
              }}
            >
              {dict.location_banner.location_selected_change}
            </button>
          </div>
        )}
        {isUS && (
          <div>
            Estados Unidos.{" "}
            <button
              type="button"
              className="underline text-emerald-800 hover:text-emerald-900"
              onClick={() => { try { safeDispatch('location:open'); } catch { } window.scrollTo({ top: 0, behavior: 'smooth' }) }}

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
      {/* Aviso: navegador embebido */}
      {
        typeof navigator !== 'undefined' && isInAppBrowserUA(navigator.userAgent) && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 mt-3">
            {locale === 'en'
              ? 'You are opening this page inside an app browser (e.g. Instagram/Facebook). If you see errors, tap the ••• menu and open in Safari.'
              : 'Estás abriendo la página dentro del navegador de otra app (por ejemplo Instagram/Facebook). Si ves errores, ábrela en Safari desde el menú •••.'}
          </div>
        )
      }



      {/* ===== Billing (Buyer) ===== */}
      <h2 className="text-2xl font-bold">
        {locale === 'en' ? 'Billing information' : 'Datos de facturación'}
      </h2>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">
            {locale === 'en' ? 'Billing contact (will receive the receipt)' : 'Contacto de facturación (recibe el comprobante)'}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {locale === 'en'
              ? 'Prefilled from your profile.'
              : 'Precargado desde tu perfil.'}
          </p>
        </div>

        {/* Cuerpo de la card (como en Shipping) */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div id="billing-card" className="rounded-lg border bg-white p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 w-full">
                <div className="rounded-full p-2 border bg-white">
                  <UserRound className="h-5 w-5 text-emerald-700" />
                </div>

                {/* Vista compacta / Editor inline */}
                {!editingBilling ? (
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">
                      {buyer.first_name || formData.nombre || '—'} {buyer.last_name || formData.apellidos || ''}
                    </div>

                    {/* Dirección de facturación */}
                    <div className="text-gray-700">
                      {buyer.address ? buyer.address : '—'}
                    </div>

                    {/* Contactos */}
                    <div className="text-gray-600">
                      {buyer.phone ? `📞 ${buyer.phone}` : ''}
                      {(buyer.phone && buyer.email) ? ' · ' : ''}
                      {buyer.email ? `✉️ ${buyer.email}` : ''}
                      {!buyer.email && (
                        <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-red-700 border-red-200 bg-red-50">
                          {locale === 'en' ? 'Required' : 'Requerido'}
                        </span>
                      )}
                    </div>

                    {/* ZIP */}
                    {buyer.zip && (
                      <div className="text-gray-600">
                        ZIP: {buyer.zip}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full">
                    {/* Editor inline compacto */}
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
                      <div className="md:col-span-2">
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
                          {locale === 'en' ? 'Billing address' : 'Dirección de facturación'}
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

                    {/* Acciones */}
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                        onClick={saveBilling}
                        disabled={savingBilling}
                      >
                        {savingBilling ? (locale === 'en' ? 'Saving…' : 'Guardando…') : (locale === 'en' ? 'Save' : 'Guardar')}
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded border hover:bg-gray-50"
                        onClick={() => setEditingBilling(false)}
                        disabled={savingBilling}
                      >
                        {locale === 'en' ? 'Cancel' : 'Cancelar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón Editar (solo en vista compacta) */}
              {!editingBilling && (
                <button
                  type="button"
                  onClick={() => setEditingBilling(true)}
                  title={locale === 'en' ? 'Edit billing' : 'Editar facturación'}
                  aria-label={locale === 'en' ? 'Edit billing' : 'Editar facturación'}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full border bg-white hover:bg-emerald-50 hover:border-emerald-300 ring-emerald-200 focus:outline-none focus:ring-4 transition mt-3"
                >
                  <PencilLine className="h-5 w-5 text-emerald-700" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* ===== 1) Datos de envío ===== */}
      <h2 className="text-2xl font-bold">{dict.checkout.shipping}</h2>

      <div className="rounded-xl border bg-white shadow-sm">
        {/* Cabecera visual */}
        <div className="border-b px-4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">{dict.checkout.shipping}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{dict.checkout.shipping1}</p>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">

          {/* === NUEVO: Selector de destinatarios guardados (filtrado por país del banner) === */}
          <div>
            <div className="rounded-lg border bg-white p-3 text-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="font-medium">
                  {locale === 'en' ? 'Recipient' : 'Destinatario'}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    id="recipient_select"
                    key={`recipients-${location?.country ?? 'xx'}`}   // fuerza remount si cambia el país
                    className="input"
                    value={selectValue}                               // ← ahora usa string
                    onChange={(e) => {
                      const val = e.target.value;
                      const id = val ? Number(val) : null;
                    
                      // marca que estamos cambiando
                      switchingRecipientRef.current = true;
                    
                      setSelectedRecipientId(id);
                    
                      if (id === null || Number.isNaN(id)) {
                        setRecipientLoc(null);
                        try {
                          if (location?.country === 'CU' || location?.country === 'US') {
                            localStorage.removeItem(lsRecipientKeyFor(location.country));
                          }
                        } catch {}
                        // liberamos el lock en el próximo tick para que el quote se reactive
                        requestAnimationFrame(() => { switchingRecipientRef.current = false; });
                        return;
                      }
                    
                      // difiere la aplicación del destinatario al próximo frame:
                      requestAnimationFrame(() => {
                        const country = (location?.country === 'CU' || location?.country === 'US')
                          ? location.country
                          : undefined;
                    
                        const r = findRecipientById(id, country as any);
                        if (r) {
                          applyRecipient(r);
                        }
                        // si por timing no se encontró, no hacemos nada (no crashea)
                        switchingRecipientRef.current = false;
                      });
                    }}
                    
                  >
                    <option value="">
                      {recLoading
                        ? (locale === 'en' ? 'Loading…' : 'Cargando…')
                        : noRecipientsForCountry
                          ? (locale === 'en' ? 'No saved recipients' : 'Sin destinatarios guardados')
                          : (locale === 'en' ? 'Select a recipient' : 'Selecciona un destinatario')}
                    </option>

                    {recipientsForCountry.map(r => (
                      <option key={r.id} value={String(r.id)}>   {/* ← value como string */}
                        {r.first_name} {r.last_name} · {r.country}{r.is_default ? (locale === 'en' ? ' · default' : ' · predeterminado') : ''}
                      </option>
                    ))}
                  </select>


                  {/* Nuevo destinatario */}
                  <button
                    type="button"
                    onClick={openCreateRecipient}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-full border bg-white hover:bg-emerald-50 hover:border-emerald-300 focus:outline-none focus:ring-4 ring-emerald-200 transition"
                    title={locale === 'en' ? 'New recipient' : 'Nuevo destinatario'}
                    aria-label={locale === 'en' ? 'New recipient' : 'Nuevo destinatario'}
                  >
                    <Plus className="h-5 w-5 text-emerald-700" />
                  </button>

                  {/* Editar seleccionado */}
                  {selectedRecipientId && (
                    <button
                      type="button"
                      onClick={openEditRecipient}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full border bg-white hover:bg-emerald-50 hover:border-emerald-300 focus:outline-none focus:ring-4 ring-emerald-200 transition"
                      title={locale === 'en' ? 'Edit recipient' : 'Editar destinatario'}
                      aria-label={locale === 'en' ? 'Edit recipient' : 'Editar destinatario'}
                    >
                      <PencilLine className="h-5 w-5 text-emerald-700" />
                    </button>
                  )}
                </div>
              </div>

              {/* Aviso de país/ubicación mixtos (mantén tu lógica) */}
              {recipientLoc && location?.country && recipientLoc.country !== location.country && (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {locale === 'en'
                    ? (recipientLoc.country === 'US'
                      ? 'You selected a recipient in the United States, but the selected destination above is Cuba. The quote will use the United States based on the recipient.'
                      : 'You selected a recipient in Cuba, but the selected destination above is the United States. The quote will use Cuba based on the recipient.')
                    : (recipientLoc.country === 'US'
                      ? 'Has seleccionado un destinatario de Estados Unidos, pero el destino seleccionado está en Cuba. La cotización usará Estados Unidos según el destinatario.'
                      : 'Has seleccionado un destinatario de Cuba, pero el destino seleccionado está en Estados Unidos. La cotización usará Cuba según el destinatario.')}
                </div>
              )}

              {/* Tarjeta de solo lectura cuando hay seleccionado */}
              {selectedRecipientId ? (() => {
                const r = recipients.find(x => x.id === selectedRecipientId)
                if (!r) return null
                return (
                  <div className="mt-3 rounded-lg border bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full p-2 border bg-white">
                          <UserRound className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {r.first_name} {r.last_name} {r.label ? `· ${r.label}` : ''}
                          </div>
                          <div className="text-gray-700">
                            {r.country === 'US'
                              ? [r.address_line1, r.address_line2, r.city, r.state, r.zip, 'United States'].filter(Boolean).join(', ')
                              : [r.address, r.municipality, r.province, 'Cuba'].filter(Boolean).join(', ')
                            }
                          </div>
                          <div className="text-gray-600">
                            {r.phone ? `📞 ${r.phone}` : ''} {r.email ? ` · ✉️ ${r.email}` : ''}
                          </div>
                          {r.country === 'CU' && r.ci && (
                            <div className="text-gray-600">{locale === 'en' ? 'ID' : 'CI'}: {r.ci}</div>
                          )}
                          {r.instructions && (
                            <div className="text-gray-600">{locale === 'en' ? 'Instructions:' : 'Instrucciones:'} {r.instructions}</div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openEditRecipient}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-full border bg-white hover:bg-emerald-50 hover:border-emerald-300 focus:outline-none focus:ring-4 ring-emerald-200 transition"
                        title={locale === 'en' ? 'Edit recipient' : 'Editar destinatario'}
                        aria-label={locale === 'en' ? 'Edit recipient' : 'Editar destinatario'}
                      >
                        <PencilLine className="h-5 w-5 text-emerald-700" />
                      </button>
                    </div>
                  </div>
                )
              })() : (
                <p className="text-xs text-gray-500 mt-2">
                  {locale === 'en'
                    ? 'You can pick a saved recipient or create a new one here. If none is selected, you may fill the form below.'
                    : 'Puedes elegir un destinatario guardado o crear uno nuevo aquí. Si no seleccionas ninguno, puedes llenar el formulario de abajo.'}
                </p>
              )}
            </div>


            {recipientLoc?.country === 'CU' && location?.country === 'CU' && (
              (recipientLoc.province?.trim() !== (location.province || '').trim()
                || recipientLoc.municipality?.trim() !== (location.municipality || '').trim()) && (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 mb-3">
                  {locale === 'en'
                    ? `You selected a recipient in ${recipientLoc.municipality}, ${recipientLoc.province}, but the selected destination shows ${location.municipality}, ${location.province}. The quote and shipping will use the recipient’s address.`
                    : `Has seleccionado un destinatario en ${recipientLoc.municipality}, ${recipientLoc.province}, pero el destino seleccionado está en ${location.municipality}, ${location.province}. La cotización y el envío usarán la dirección del destinatario.`}
                </div>
              )
            )}


          </div>

          {/* ===== Método de envío a Cuba ===== */}
          {isCU && (
            <div className="rounded-xl border bg-white shadow-sm p-4">
              <div className="text-sm font-semibold text-gray-800 mb-3">
                {locale === 'en' ? 'Shipping method to Cuba' : 'Método de envío a Cuba'}
              </div>

              <fieldset
                role="radiogroup"
                aria-label={locale === 'en' ? 'Shipping method to Cuba' : 'Método de envío a Cuba'}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {/* Card: Barco */}
                <label
                  className={[
                    "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition",
                    transport === 'sea'
                      ? "border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50"
                      : "border-gray-200 hover:border-emerald-300"
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="cu_transport"
                    className="sr-only"
                    checked={transport === 'sea'}
                    onChange={() => setTransport('sea')}
                    aria-checked={transport === 'sea'}
                  />
                  <div className="mt-0.5 shrink-0">
                    <div className={[
                      "rounded-full p-2 border",
                      transport === 'sea' ? "border-emerald-500 bg-white" : "border-gray-300 bg-white"
                    ].join(" ")}>
                      <Ship className="h-5 w-5" aria-hidden />
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {locale === 'en' ? 'Sea' : 'Barco'}
                      <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700">
                        {locale === 'en' ? 'More economical' : 'Más económico'}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      {locale === 'en'
                        ? 'Estimated 25–35 calendar days'
                        : 'Estimado 25–35 días naturales'}
                    </div>
                  </div>
                </label>

                {/* Card: Avión */}
                <label
                  className={[
                    "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition",
                    transport === 'air'
                      ? "border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50"
                      : "border-gray-200 hover:border-emerald-300"
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="cu_transport"
                    className="sr-only"
                    checked={transport === 'air'}
                    onChange={() => setTransport('air')}
                    aria-checked={transport === 'air'}
                  />
                  <div className="mt-0.5 shrink-0">
                    <div className={[
                      "rounded-full p-2 border",
                      transport === 'air' ? "border-emerald-500 bg-white" : "border-gray-300 bg-white"
                    ].join(" ")}>
                      <Plane className="h-5 w-5" aria-hidden />
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {locale === 'en' ? 'Air' : 'Avión'}
                      <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700">
                        {locale === 'en' ? 'Faster' : 'Más rápido'}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      {locale === 'en'
                        ? 'Estimated 7–14 calendar days'
                        : 'Estimado 7–14 días naturales'}
                    </div>
                  </div>
                </label>
              </fieldset>
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
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm whitespace-pre-line">
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

      {/* ===== 2) Resumen ===== */}
      <h1 className="text-2xl font-bold">{dict.checkout.title}</h1>
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3 sm:px-6">
          <h3 className="text-base font-semibold text-gray-800">{dict.checkout.title}</h3>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
          {(deliveryName || deliveryAddress) && (
            <div className="rounded-lg border bg-white p-3 text-sm">
              <div className="font-medium">
                {locale === 'en' ? 'Delivering to' : 'Envío a'}
              </div>

              {deliveryName && (
                <div className="text-gray-900">{deliveryName}</div>
              )}

              {deliveryAddress && (
                <div className="text-gray-600">{deliveryAddress}</div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                  onClick={goToRecipientSelect}
                >
                  {locale === 'en' ? 'Change delivery address' : 'Cambiar dirección de entrega'}
                </button>

              </div>

            </div>
          )}

          {isShipCU && (<div className="rounded-lg border bg-white p-3 text-sm space-y-2">
            <div className="font-medium">
              <div className="mt-2 text-sm text-gray-700">
                <span className="font-medium">
                  {locale === 'en' ? 'Delivery By:' : 'Entrega por:'}
                </span>{' '}
                {transport === 'air'
                  ? (locale === 'en' ? 'Air' : 'Avión')
                  : (locale === 'en' ? 'Sea' : 'Barco')}
              </div>

              {locale === 'en' ? DELIVERY_TIMES.en.title : DELIVERY_TIMES.es.title}
            </div>

            {/* Lista dinámica según transporte */}
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {(
                locale === 'en'
                  ? (transport === 'air' ? DELIVERY_TIMES.en.air : DELIVERY_TIMES.en.sea)
                  : (transport === 'air' ? DELIVERY_TIMES.es.air : DELIVERY_TIMES.es.sea)
              ).map(([strong, rest], i) => (
                <li key={i}>
                  <strong>{strong}</strong> {rest}
                </li>
              ))}
            </ul>
          </div>
          )}


          <div className="rounded-lg border bg-white p-3 text-sm space-y-2">
            <div className="font-medium">
              {locale === 'en' ? 'Your items' : 'Tus artículos'}
            </div>
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
          </div>
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

      {/* ===== Términos ===== */}
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

      {/* ===== 3) Pago ===== */}
      <h2 className="text-2xl font-bold">{dict.checkout.payment}</h2>

      <CardPaymentModal
        open={showCardModal}
        amountLabel={directSession ? fmt.format(directSession.amount) : undefined}
        onClose={() => (!cardPaying ? setShowCardModal(false) : null)}
        onSubmit={handleSubmitCard}
        loading={cardPaying}
        dict={dict.card_modal}
      />

      <button
        onClick={handleStartDirect}
        disabled={startingDirect || payDisabled}
        className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center space-x-2"
      >
        <CreditCard size={18} />
        <span>{startingDirect ? dict.common.loading : `${dict.checkout.directPay}`}</span>
      </button>
      {recipientModal}
    </div >
  )
}
