const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/* ========== Categories ========== */

export type Category = { id: number; slug: string; name: string; image_url?: string | null }

export type AdminCustomer = {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  address: string | null
  role: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}


export async function listCategories(): Promise<Category[]> {
  const r = await fetch(`${API_URL}/categories`, { cache: 'no-store' });
  if (!r.ok) throw new Error('categories');
  return r.json(); // ahora trae image_url
}

export async function createCategory(input: { slug: string; name: string; image_url?: string | null }): Promise<Category> {
  const r = await fetch(`${API_URL}/admin/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!r.ok) throw new Error('createCategory')
  return r.json()
}

export async function updateCategory(id: number, input: Partial<Category>): Promise<Category> {
  const r = await fetch(`${API_URL}/admin/categories/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!r.ok) throw new Error('updateCategory')
  return r.json()
}

export async function deleteCategory(id: number) {
  const r = await fetch(`${API_URL}/admin/categories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!r.ok) throw new Error('deleteCategory')
}


/* ========== (Opcional) Owners ========== */

export type CuZoneKey = 'habana_city' | 'habana_municipio' | 'provincias_city' | 'provincias_municipio'
export type CubaFixed = Partial<Record<CuZoneKey, number>>
export type CubaByWeightBase = Partial<Record<CuZoneKey, number>>

export type ShippingConfig = {
  us?: { fixed_usd?: number };
  cu?: {
    mode?: 'fixed' | 'by_weight';
    fixed?: CubaFixed;
    by_weight?: {
      rate_per_lb?: number;
      base?: CubaByWeightBase;
    };
  };
};

export type Owner = {
  id: number;
  name: string;
  email?: string | null;
  shipping_config?: ShippingConfig | null;
};

export async function listOwners(): Promise<Owner[]> {
  const r = await fetch(`${API_URL}/admin/owners`, { headers: authHeaders(), cache: 'no-store' });
  if (!r.ok) throw new Error('listOwners');
  return r.json();
}
export async function createOwner(input: { name: string; email?: string | null; shipping_config?: ShippingConfig }): Promise<Owner> {
  const r = await fetch(`${API_URL}/admin/owners`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(input) });
  if (!r.ok) throw new Error('createOwner');
  return r.json();
}
export async function updateOwner(id: number, input: Partial<Owner>): Promise<Owner> {
  const r = await fetch(`${API_URL}/admin/owners/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(input) });
  if (!r.ok) throw new Error('updateOwner');
  return r.json();
}
export async function deleteOwner(id: number) {
  const r = await fetch(`${API_URL}/admin/owners/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!r.ok) throw new Error('deleteOwner');
}

/* ========== Products ========== */

export type ProductMetadata = {
  /** DEPRECATED: antes guardabas el owner como string en metadata */
  owner?: string
  taxable?: boolean       // default: true
  tax_pct?: number        // 0..30
  margin_pct?: number     // >=0
  price_cents?: number
  archived?: boolean
}

export type Product = {
  id: number
  title: string
  price: number
  weight?: number | null
  category_id?: number | null
  image_url?: string | null
  description?: string | null
  /** NUEVO: relación al owner */
  owner_id?: number | null
  metadata?: ProductMetadata | null
  stock_qty: number
}

export async function listProducts(): Promise<Product[]> {
  const r = await fetch(`${API_URL}/products`, { cache: 'no-store' });
  if (!r.ok) throw new Error('products');
  return r.json();
}
export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
  const r = await fetch(`${API_URL}/products`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(input) });
  if (!r.ok) throw new Error('createProduct');
  return r.json();
}
export async function updateProduct(id: number, input: Partial<Product>): Promise<Product> {
  const r = await fetch(`${API_URL}/products/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(input) });
  if (!r.ok) throw new Error('updateProduct');
  return r.json();
}

export async function deleteProduct(id: number): Promise<unknown> {
  const res = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) throw new Error(`deleteProduct ${res.status} ${text}`)
  try { return JSON.parse(text) as unknown } catch { return {} as unknown }
}

/* Paginado de productos (admin) */

export type ProductPage = {
  items: Product[]
  page: number
  limit: number
  total: number
  pages: number
}

export type ProductQuery = {
  q?: string
  category_id?: number
  /** NUEVO: filtra por owner_id (número). Reemplaza el antiguo 'owner' string. */
  owner_id?: number
  archived?: 'true' | 'false' | 'all'
  page?: number
  limit?: number
}

export async function listProductsAdmin(params: ProductQuery = {}): Promise<ProductPage> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.category_id != null) sp.set('category_id', String(params.category_id))
  if (params.owner_id != null) sp.set('owner_id', String(params.owner_id))
  if (params.archived) sp.set('archived', params.archived)
  if (params.page) sp.set('page', String(params.page))
  if (params.limit) sp.set('limit', String(params.limit))

  const r = await fetch(`${API_URL}/admin/products?${sp.toString()}`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error('productsAdmin')
  return r.json()
}

export async function uploadCategoryImage(id: number, file: File) {
  const token = localStorage.getItem('token') || ''
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/upload/category/${id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  if (!res.ok) throw new Error('upload category image')
  return res.json() as Promise<{ url: string }>
}

/* ========== Auth/Me ========== */

export async function getMe() {
  const res = await fetch(`${API_URL}/customers/me`, { headers: authHeaders(), cache: 'no-store' });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error('me');
  return res.json();
}

/* ========== Orders (ADMIN) ========== */

/** Tipo antiguo que devuelve PATCH /admin/orders/:id/status */
export type OrderRow = {
  id: number
  customer_id: number | null
  status: string
  payment_method: string | null
  created_at: string
  total?: string
  total_calc?: string
  items_count?: number
  metadata?: Record<string, unknown> | null
}

/** Nuevo item del listado de órdenes admin (paginado) */
export type AdminOrderListItem = {
  id: number
  created_at: string
  status: string
  payment_method: string | null
  customer_id: number | null
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  subtotal: number
  tax: number
  base_total: number
  card_fee: number
  total_with_fee: number
  items_count: number
}

/** Respuesta paginada del listado admin */
export type AdminOrderPage = {
  items: AdminOrderListItem[]
  page: number
  pages: number
  total: number
  limit: number
  fee_pct: number
}

/** Filtros del listado admin */
export type AdminOrderFilters = {
  q?: string
  status?: string
  payment_method?: string
  from?: string
  to?: string
  page?: number
  limit?: number
  sort_by?: 'created_at'|'total'|'status'
  sort_dir?: 'asc'|'desc'
}

/** Listado con filtros + paginado (RECOMENDADO) */
export async function listAdminOrdersPaged(filters: AdminOrderFilters = {}): Promise<AdminOrderPage> {
  const qs = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v != null && v !== '') qs.set(k, String(v))
  })
  const r = await fetch(`${API_URL}/admin/orders?${qs.toString()}`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error('ordersPaged')
  return r.json()
}

/** Wrapper de compatibilidad (DEPRECATED): retorna sólo items de la primera página */
export async function listAdminOrders(): Promise<AdminOrderListItem[]> {
  const r = await listAdminOrdersPaged({})
  return r.items
}

/** Cambiar estado (se mantiene tal cual tu backend) */
export async function updateOrderStatus(id: number, status: string): Promise<OrderRow> {
  const r = await fetch(`${API_URL}/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error('updateStatus');
  return r.json();
}

/* ========== Order detail (ADMIN) ========== */
export type AdminOrderItem = {
  product_id: number | null
  product_name?: string | null
  image_url?: string | null
  source_url?: string | null   
  external_id?: string | null  
  quantity: number
  unit_price: number
}

export type AdminOrderDetail = {
  order: {
    id: number
    created_at: string
    status: string
    payment_method: string | null
    pricing: { subtotal: number; tax: number; total: number }
    card_fee_pct: number
    card_fee: number
    total_with_fee: number
    metadata?: Record<string, unknown> | null
    customer?: { id?: number; email?: string | null; name?: string | null; phone?: string | null; address?: string | null }
  }
  items: AdminOrderItem[]
}

//admin customers
export async function listCustomersAdmin(params: {
  q?: string
  role?: string
  page?: number
  limit?: number
}) {
  const qp = new URLSearchParams()
  if (params?.q) qp.set('q', params.q)
  if (params?.role) qp.set('role', params.role)
  if (params?.page) qp.set('page', String(params.page))
  if (params?.limit) qp.set('limit', String(params.limit))

  const res = await fetch(`${API_URL}/admin/customers?${qp.toString()}`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Error listando clientes')
  return res.json() as Promise<{ items: AdminCustomer[]; page: number; pages: number; total: number; limit: number }>
}

export async function setCustomerRole(id: number, role: 'admin'|'owner'|'mensajero'|''|null) {
  const res = await fetch(`${API_URL}/admin/customers/${id}/role`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  })
  if (!res.ok) throw new Error('Error asignando rol')
  return res.json()
}

export async function deleteCustomerAdmin(id: number) {
  const res = await fetch(`${API_URL}/admin/customers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error eliminando cliente')
  return res.json()
}

export async function getAdminOrderDetail(id: number): Promise<AdminOrderDetail> {
  const r = await fetch(`${API_URL}/admin/orders/${id}/detail`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('orderDetail');
  return r.json() as Promise<AdminOrderDetail>;
}
