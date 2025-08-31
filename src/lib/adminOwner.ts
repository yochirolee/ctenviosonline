// lib/adminOwner.ts
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export type CuZoneKey =
  | 'habana_city'
  | 'habana_municipio'
  | 'provincias_city'
  | 'provincias_municipio';

export type CubaFixed = Partial<Record<CuZoneKey, number>>;
export type CubaByWeightBase = Partial<Record<CuZoneKey, number>>;

export type ShippingConfig = {
  us?: { fixed_usd?: number };
  cu?: {
    mode?: 'fixed' | 'by_weight';
    fixed?: {
      habana_city?: number;
      habana_municipio?: number;
      provincias_city?: number;
      provincias_municipio?: number;
    };
    by_weight?: {
      rate_per_lb?: number;
      base?: {
        habana_city?: number;
        habana_municipio?: number;
        provincias_city?: number;
        provincias_municipio?: number;
      };
    };
    min_fee?: number;
  };
  /** 🔴 Este flag se persiste en owner_shipping_config.country='CU' */
  cu_restrict_to_list?: boolean;
};

export type Owner = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  /** JSON guardado en owners.shipping_config (referencial/legacy para UI) */
  shipping_config?: ShippingConfig | null;
};

/* ---------------- Owners CRUD ---------------- */

export async function getOwners(): Promise<Owner[]> {
  const r = await fetch(`${API_URL}/admin/owners`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('getOwners');
  return r.json();
}

export async function createOwner(input: {
  name: string;
  email: string;
  phone?: string;
  shipping_config?: ShippingConfig;
}): Promise<Owner> {
  const r = await fetch(`${API_URL}/admin/owners`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error('createOwner');
  return r.json();
}

/** Actualiza datos básicos del owner (y opcionalmente el JSON owners.shipping_config si lo necesitas para UI) */
export async function updateOwner(
  id: number,
  input: Partial<Pick<Owner, 'name' | 'email' | 'phone' | 'shipping_config'>>
): Promise<Owner> {
  const r = await fetch(`${API_URL}/admin/owners/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error('updateOwner');
  return r.json();
}

/** Eliminar owner */
export async function deleteOwner(id: number): Promise<{ ok: true }> {
  const r = await fetch(`${API_URL}/admin/owners/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const text = await r.text().catch(() => '');
  if (!r.ok) throw new Error(`deleteOwner ${r.status} ${text}`);
  // Éxito: estandarizamos la respuesta y eliminamos el `as any`
  return { ok: true } as const;
}


/* ---------------- Shipping config efectiva (owner_shipping_config) ---------------- */

/**
 * 🔐 IMPORTANTE:
 * Guarda la configuración efectiva de envíos en owner_shipping_config
 * (incluye cu_restrict_to_list). Este endpoint debe existir en tu backend:
 *   PUT /admin/owners/:ownerId/shipping-config
 */
export async function updateOwnerShippingConfig(
  id: number,
  shipping_config: ShippingConfig
): Promise<{ ok: true }> {
  const r = await fetch(`${API_URL}/admin/owners/${id}/shipping-config`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(shipping_config),
  });
  if (!r.ok) throw new Error('updateOwnerShippingConfig');
  return r.json().catch(() => ({ ok: true }));
}

/* ---------------- (Opcional) Helpers para áreas CU ---------------- */

export type OwnerAreaRow = {
  id: number;
  province: string | null;
  municipality: string | null;
  created_at?: string;
};

/** Lista áreas permitidas (Cuba) para un owner */
export async function listOwnerAreasCU(ownerId: number): Promise<OwnerAreaRow[]> {
  const r = await fetch(`${API_URL}/admin/owners/${ownerId}/areas?country=CU`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('listOwnerAreasCU');
  return r.json();
}

/** Reemplaza todas las áreas permitidas (Cuba) */
export async function saveOwnerAreasCU(
  ownerId: number,
  items: Array<{ province: string; municipality: string | null }>
): Promise<{ ok: true; count: number }> {
  const r = await fetch(`${API_URL}/admin/owners/${ownerId}/areas`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ country: 'CU', items }),
  });
  if (!r.ok) throw new Error('saveOwnerAreasCU');
  return r.json();
}
