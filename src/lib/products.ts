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

export type ProductMetadata = {
  owner?: string
  taxable?: boolean
  tax_pct?: number
  margin_pct?: number
  price_cents?: number
  archived?: boolean
  [k: string]: unknown
}

type ProductFromAPI = {
  id: number | string
  // ES
  title?: string | null
  description?: string | null
  // EN
  title_en?: string | null
  description_en?: string | null

  price: string | number                // base (no usar para mostrar)
  image_url?: string | null

  // campos de precio calculado (si el backend los expone)
  price_with_margin_cents?: number | null
  price_with_margin_usd?: number | string | null

  metadata?: ProductMetadata | null
}

type BestSellerFromAPI = ProductFromAPI & {
  sold_qty?: number | string | null
}

type SearchResponse = {
  items?: ProductFromAPI[]
  page?: number
  limit?: number
  has_more?: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

/** Helper para construir los query params de ubicación (country/province/area_type). */
function buildLocParams(loc?: DeliveryLocation) {
  const sp = new URLSearchParams()
  if (!loc) return sp
  if (loc.country) sp.set('country', loc.country)
  if (loc.province) sp.set('province', String(loc.province))
  if (loc.municipality) sp.set('municipality', String(loc.municipality))
  if (loc.area_type) sp.set('area_type', String(loc.area_type))
  return sp
}

/** Mapea un producto del API al formato simplificado que usa el front, resolviendo idioma. */
function mapApiProduct(p: ProductFromAPI, locale: 'en' | 'es' = 'es'): SimplifiedProduct {
  const priceUsd =
    p.price_with_margin_cents != null
      ? Number(p.price_with_margin_cents) / 100
      : (p.price_with_margin_usd != null ? Number(p.price_with_margin_usd) : Number(p.price))

  // Resuelve nombre/descr con fallback limpio
  const name =
    locale === 'en'
      ? (p.title_en && p.title_en.trim()) || (p.title && p.title.trim()) || ''
      : (p.title && p.title.trim()) || (p.title_en && p.title_en.trim()) || ''

  const description =
    locale === 'en'
      ? ((p.description_en && p.description_en.trim()) || (p.description && p.description.trim()) || '')
      : ((p.description && p.description.trim()) || (p.description_en && p.description_en.trim()) || '')

  return {
    id: Number(p.id),
    name,
    price: Number.isFinite(priceUsd) ? priceUsd : 0,
    imageSrc: p.image_url || '/product.webp',
    variant_id: String(p.id),
    description,
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
  loc?: DeliveryLocation,
  locale: 'en' | 'es' = 'es'
): Promise<SimplifiedProduct[]> {
  const sp = buildLocParams(loc)
  const url = `${API_URL}/products/category/${encodeURIComponent(category)}${
    sp.toString() ? `?${sp.toString()}` : ''
  }`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data: ProductFromAPI[] = await res.json()
  return data.map((p) => mapApiProduct(p, locale))
}

/** Productos generales (home/listados), también acepta filtro por ubicación. */
export async function getProducts(
  loc?: DeliveryLocation,
  locale: 'en' | 'es' = 'es'
): Promise<SimplifiedProduct[]> {
  const sp = buildLocParams(loc)
  const url = `${API_URL}/products${sp.toString() ? `?${sp.toString()}` : ''}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data: ProductFromAPI[] = await res.json()
  return data.map((p) => mapApiProduct(p, locale))
}

/** Más vendidos (puede venir sold_qty como string/number/null desde el backend) */
export async function getBestSellers(
  loc?: DeliveryLocation,
  opts?: { limit?: number; days?: number; status?: string },
  locale: 'en' | 'es' = 'es'
): Promise<(SimplifiedProduct & { sold_qty: number })[]> {
  const sp = buildLocParams(loc)
  if (opts?.limit) sp.set('limit', String(opts.limit))
  if (opts?.days) sp.set('days', String(opts.days))
  if (opts?.status) sp.set('status', opts.status)

  const url = `${API_URL}/products/best-sellers${sp.toString() ? `?${sp.toString()}` : ''}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data: BestSellerFromAPI[] = await res.json()

  return data.map((p) => ({
    ...mapApiProduct(p, locale),
    sold_qty: Number(p.sold_qty ?? 0),
  }))
}

/** Búsqueda simple (devuelve solo items) */
export async function searchProducts(
  q: string,
  loc?: DeliveryLocation,
  opts?: { page?: number; limit?: number },
  locale: 'en' | 'es' = 'es'
): Promise<SimplifiedProduct[]> {
  const sp = buildLocParams(loc)
  if (q) sp.set('q', q)
  if (opts?.page) sp.set('page', String(opts.page))
  if (opts?.limit) sp.set('limit', String(opts.limit))

  const url = `${API_URL}/products/search${sp.toString() ? `?${sp.toString()}` : ''}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data: SearchResponse = await res.json()
  const rows: ProductFromAPI[] = data.items ?? []
  return rows.map((p) => mapApiProduct(p, locale))
}

/** Búsqueda con paginado */
export async function searchProductsPaged(
  q: string,
  loc?: DeliveryLocation,
  opts?: { page?: number; limit?: number },
  locale: 'en' | 'es' = 'es'
): Promise<{ items: SimplifiedProduct[]; page: number; limit: number; has_more: boolean }> {
  const sp = buildLocParams(loc)
  if (q) sp.set('q', q)
  if (opts?.page) sp.set('page', String(opts.page))
  if (opts?.limit) sp.set('limit', String(opts.limit))

  const url = `${API_URL}/products/search${sp.toString() ? `?${sp.toString()}` : ''}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    return { items: [], page: opts?.page || 1, limit: opts?.limit || 12, has_more: false }
  }

  const data: SearchResponse = await res.json()
  const rows: ProductFromAPI[] = data.items ?? []
  return {
    items: rows.map((p) => mapApiProduct(p, locale)),
    page: Number(data.page ?? opts?.page ?? 1),
    limit: Number(data.limit ?? opts?.limit ?? 12),
    has_more: Boolean(data.has_more),
  }
}

// === Detalle de producto por ID ===
export async function getProductById(
  id: number,
  locale: 'en' | 'es' = 'es'
): Promise<SimplifiedProduct | null> {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const raw: ProductFromAPI = await res.json()
    return mapApiProduct(raw, locale)
  } catch {
    return null
  }
}

export type OwnerGroup = {
  owner_id: number
  owner_name: string
  products: Array<{
    id: number
    title: string
    title_en?: string | null
    image_url?: string | null
    display_total_usd: number
    display_total_cents: number
    price_with_margin_cents: number
    tax_cents: number
    metadata?: Record<string, unknown> | null
    stock_qty?: number | null
  }>
}

export async function getByOwners(
  loc?: { country?: string; province?: string; area_type?: string; municipality?: string },
  opts?: { owners_limit?: number; per_owner?: number; owner_ids?: number[]; locale?: 'es'|'en' }
): Promise<OwnerGroup[]> {
  const params = new URLSearchParams()
  if (loc?.country) params.set('country', loc.country)
  if (loc?.province) params.set('province', loc.province)
  if (loc?.area_type) params.set('area_type', String(loc.area_type))
  if (loc?.municipality) params.set('municipality', loc.municipality)
  if (opts?.owners_limit) params.set('owners_limit', String(opts.owners_limit))
  if (opts?.per_owner) params.set('per_owner', String(opts.per_owner))
  if (opts?.owner_ids?.length) params.set('owner_ids', opts.owner_ids.join(','))

  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/products/by-owners?${params.toString()}`, { cache: 'no-store' })
  const json = await r.json().catch(() => ({ owners: [] }))
  return Array.isArray(json?.owners) ? json.owners as OwnerGroup[] : []
}

