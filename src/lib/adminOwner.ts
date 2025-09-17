// src/lib/adminOwner.ts
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
export type CuMode = 'fixed' | 'by_weight';

export type CuBranch = {
  mode?: CuMode;
  fixed?: CubaFixed;
  by_weight?: {
    rate_per_lb?: number;
    base?: CubaByWeightBase;
  };
  min_fee?: number;
  /** NUEVO */
  over_weight_threshold_lbs?: number;
  /** NUEVO */
  over_weight_fee?: number;
};

export type ShippingConfig = {
  us?: { fixed_usd?: number | string };
  cu?: {
    sea?: CuBranch;
    air?: CuBranch;
  };
  /** persiste en owner_shipping_config */
  cu_restrict_to_list?: boolean;
};

export type Owner = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
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

export async function deleteOwner(id: number): Promise<{ ok: true }> {
  const r = await fetch(`${API_URL}/admin/owners/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const text = await r.text().catch(() => '');
  if (!r.ok) throw new Error(`deleteOwner ${r.status} ${text}`);
  return { ok: true } as const;
}

/* ---------------- Config efectiva (owner_shipping_config) ---------------- */

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

/* ---------------- Áreas CU (opcional) ---------------- */

export type OwnerAreaRow = {
  id: number;
  province: string | null;
  municipality: string | null;
  created_at?: string;
};

export async function listOwnerAreasCU(ownerId: number): Promise<OwnerAreaRow[]> {
  const r = await fetch(`${API_URL}/admin/owners/${ownerId}/areas?country=CU`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('listOwnerAreasCU');
  return r.json();
}

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
