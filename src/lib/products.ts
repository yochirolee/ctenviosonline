// src/lib/products.ts

export type DeliveryLocation = {
  country: 'US' | 'CU'
  province?: string
  municipality?: string 
  area_type?: 'city' | 'municipio'
}

export type SimplifiedProduct = {
  id: number
  name: string
  price: number // USD (decimales)
  imageSrc: string
  variant_id: string
  description?: string
}

type ProductFromAPI = {
  id: number | string
  title?: string
  price: string | number                // base (no usar para mostrar)
  image_url?: string | null
  description?: string
  // campos de precio calculado (si el backend los expone)
  price_with_margin_cents?: number
  price_with_margin_usd?: number | string
  metadata?: any
}

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

/** Helper para construir los query params de ubicación (country/province/area_type). */
function buildLocParams(loc?: DeliveryLocation) {
  const sp = new URLSearchParams()
  if (!loc) return sp
  if (loc.country) sp.set('country', loc.country)
  if (loc.province) sp.set('province', String(loc.province))
    if (loc?.municipality) sp.set('municipality', String(loc.municipality))
  if (loc.area_type) sp.set('area_type', String(loc.area_type))
  return sp
}

/** Mapea un producto del API al formato simplificado que usa el front. */
function mapApiProduct(p: ProductFromAPI): SimplifiedProduct {
  const priceUsd =
    p.price_with_margin_cents != null
      ? Number(p.price_with_margin_cents) / 100
      : (p.price_with_margin_usd != null ? Number(p.price_with_margin_usd) : Number(p.price))

  return {
    id: Number(p.id),
    name: p.title ?? '',
    price: Number.isFinite(priceUsd) ? priceUsd : 0,
    imageSrc: p.image_url || '/product.webp',
    variant_id: String(p.id),
    description: p.description || '',
  }
}

/** Categorías (incluye nombre e imagen por si quieres mostrarlos en grillas/nav). */
export async function getCategories(): Promise<
  { id: number; slug: string; name: string; image_url?: string | null }[]
> {
  const res = await fetch(`${API_URL}/categories`, { cache: 'no-store' })
  if (!res.ok) return []
  const rows: { id: number; slug: string; name: string; image_url?: string | null }[] =
    await res.json()
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    image_url: c.image_url ?? null,
  }))
}

/** Productos por categoría, filtrando por ubicación cuando se provee. */
export async function getProductsByCategory(
  category: string,
  loc?: DeliveryLocation
): Promise<SimplifiedProduct[]> {
  const sp = buildLocParams(loc)
  const url = `${API_URL}/products/category/${encodeURIComponent(category)}${
    sp.toString() ? `?${sp.toString()}` : ''
  }`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data: ProductFromAPI[] = await res.json()
  return data.map(mapApiProduct)
}

/** Productos generales (home/listados), también acepta filtro por ubicación. */
export async function getProducts(loc?: DeliveryLocation): Promise<SimplifiedProduct[]> {
  const sp = buildLocParams(loc)
  const url = `${API_URL}/products${sp.toString() ? `?${sp.toString()}` : ''}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data: ProductFromAPI[] = await res.json()
  return data.map(mapApiProduct)
}

// lib/products.ts
export async function getBestSellers(
  loc?: DeliveryLocation,
  opts?: { limit?: number; days?: number; status?: string }
): Promise<(SimplifiedProduct & { sold_qty: number })[]> {
  const sp = buildLocParams(loc)
  if (opts?.limit) sp.set('limit', String(opts.limit))
  if (opts?.days) sp.set('days', String(opts.days))
  if (opts?.status) sp.set('status', opts.status)

  const url = `${API_URL}/products/best-sellers${sp.toString() ? `?${sp.toString()}` : ''}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data: any[] = await res.json()

  return data.map((p) => ({
    ...mapApiProduct(p),          // id, name, price, imageSrc, description...
    sold_qty: Number(p.sold_qty ?? 0),   // 👈 normaliza a number SIEMPRE
  }))
}

export async function searchProducts(
  q: string,
  loc?: DeliveryLocation,
  opts?: { page?: number; limit?: number }
): Promise<SimplifiedProduct[]> {
  const sp = buildLocParams(loc);
  if (q) sp.set('q', q);
  if (opts?.page) sp.set('page', String(opts.page));
  if (opts?.limit) sp.set('limit', String(opts.limit));

  const url = `${API_URL}/products/search${sp.toString() ? `?${sp.toString()}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  const rows = (data?.items ?? []) as any[];
  return rows.map(mapApiProduct);
}

// lib/products.ts
export async function searchProductsPaged(
  q: string,
  loc?: DeliveryLocation,
  opts?: { page?: number; limit?: number }
): Promise<{ items: SimplifiedProduct[]; page: number; limit: number; has_more: boolean }> {
  const sp = buildLocParams(loc);
  if (q) sp.set('q', q);
  if (opts?.page) sp.set('page', String(opts.page));
  if (opts?.limit) sp.set('limit', String(opts.limit));

  const url = `${API_URL}/products/search${sp.toString() ? `?${sp.toString()}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { items: [], page: opts?.page || 1, limit: opts?.limit || 12, has_more: false };

  const data = await res.json();
  const rows = (data?.items ?? []) as any[];
  return {
    items: rows.map(mapApiProduct),
    page: Number(data?.page ?? opts?.page ?? 1),
    limit: Number(data?.limit ?? opts?.limit ?? 12),
    has_more: Boolean(data?.has_more),
  };
}




