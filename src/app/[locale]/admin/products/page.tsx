'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminTabs from '@/components/admin/AdminTabs'
import {
  listProductsAdmin, createProduct, updateProduct, deleteProduct,
  listCategories, type Product, type Category
} from '@/lib/adminApi'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

type Owner = { id: number; name: string; email?: string | null }

// ---- Variants types (sin any) ----
type ProductOption = {
  id: number
  product_id?: number
  position: 1 | 2 | 3
  name: string
  values: string[]
}

type Variant = {
  id: number
  product_id: number
  option1?: string | null
  option2?: string | null
  option3?: string | null
  stock_qty: number
  archived: boolean
  image_url?: string | null
  sku?: string | null
  weight?: number | null
  price_cents?: number | null // <-- NUEVO
  price_with_margin_cents?: number
  display_total_usd?: number
}


type NewVariantInput = {
  option1?: string | null
  option2?: string | null
  option3?: string | null
  price_cents?: number | null
  weight?: number | null
  image_url?: string | null
  sku?: string | null
  stock_qty: number
  archived?: boolean
  metadata?: Record<string, unknown> | null
}

// --- Tipos para metadata de producto (evitar any) ---
type ProductMeta = {
  taxable?: boolean
  tax_pct?: number
  margin_pct?: number
  price_cents?: number
  archived?: boolean
}
type ProductForm = Partial<Omit<Product, 'metadata'>> & {
  metadata?: ProductMeta
  duty_usd?: number | undefined   // input de UI (se convierte a cents en el backend)
  keywords_text?: string | undefined // caja de texto separada por comas
  link?: string | null 
}
// headers con token para endpoints admin
const authHeaders = (): HeadersInit => {
  const h: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token')
    if (t) h.Authorization = `Bearer ${t}`
  }
  return h
}

export default function AdminProductsPage() {
  const router = useRouter()

  const [items, setItems] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [editing, setEditing] = useState<Product | null>(null)

  const [form, setForm] = useState<ProductForm>({
    title: '',
    price: undefined,
    weight: undefined,
    category_id: undefined,
    image_url: 'http://localhost:4000/img/productName.jpg',
    description: '',
    metadata: { taxable: true, tax_pct: undefined, margin_pct: undefined, price_cents: undefined },
    stock_qty: 0,
    owner_id: null,
    title_en: '',
    description_en: '',
    duty_usd: undefined,
    keywords_text: '',
    link: null,
  })

  // Opciones (hasta 3) y Variantes
  const [opt1Name, setOpt1Name] = useState<string>('')
  const [opt2Name, setOpt2Name] = useState<string>('')
  const [opt3Name, setOpt3Name] = useState<string>('')

  const [opt1Values, setOpt1Values] = useState<string>('') // coma separada
  const [opt2Values, setOpt2Values] = useState<string>('')
  const [opt3Values, setOpt3Values] = useState<string>('')

  const [optionsLoaded, setOptionsLoaded] = useState<boolean>(false)
  const [options, setOptions] = useState<ProductOption[]>([])
  const [variants, setVariants] = useState<Variant[]>([])

  // Crear variante rápida
  const [newVar, setNewVar] = useState<NewVariantInput>({
    option1: null, option2: null, option3: null,
    stock_qty: 0, price_cents: null, weight: null, image_url: null, sku: null
  })


  // filtros / paginación
  const [q, setQ] = useState('')
  const [ownerIdFilter, setOwnerIdFilter] = useState<number | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [archived, setArchived] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)

  // debounce
  const debouncedQ = useDebounce(q, 300)

  // carga owners (admin)
  useEffect(() => {
    const loadOwners = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/owners`, {
          headers: authHeaders(),
          cache: 'no-store',
        })
        const data = await res.json().catch(() => [])
        if (Array.isArray(data)) setOwners(data as Owner[])
      } catch {
        setOwners([])
      }
    }
    loadOwners()
  }, [])

  // carga categorías y productos (paginado + filtros)
  const load = useCallback(async () => {
    const [c, data] = await Promise.all([
      listCategories(),
      // evita `as any` construyendo los parámetros correctamente
      listProductsAdmin({
        q: debouncedQ || undefined,
        owner_id: ownerIdFilter,
        category_id: categoryId,
        archived,
        page,
        limit,
      }),
    ])
    setCats(c)
    setItems(data.items)
    setPages(data.pages)
    setTotal(data.total)
  }, [debouncedQ, ownerIdFilter, categoryId, archived, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  // --- helpers ---
  const dollarsToCents = (amount: number | string | undefined) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount
    if (!Number.isFinite(n as number)) return undefined
    return Math.round((n as number) * 100)
  }

  // --- Helpers de dinero/preview variantes (sin any) ---
  const centsToDollars = (cents: number | null | undefined): number | undefined =>
    typeof cents === 'number' && Number.isFinite(cents) ? Math.max(0, cents) / 100 : undefined

  const formatUSD = (n?: number): string => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2) : '0.00')

  type VariantPreviewInputs = {
    productBaseUSD: number
    dutyUSD: number
    marginPct: number
    taxPct: number
    taxable: boolean
    variantPriceUSD?: number // override base por variante (si viene en centavos)
  }

  /**
   * Calcula totales de preview para una variante.
   * Regla: si la variante tiene price_cents, ese es el "base" que sustituye al precio base del producto.
   */
  function computeVariantTotals(inp: VariantPreviewInputs) {
    const base = typeof inp.variantPriceUSD === 'number' ? inp.variantPriceUSD : inp.productBaseUSD
    const cost = base + inp.dutyUSD
    const gain = cost * (inp.marginPct / 100)
    const subtotal = cost + gain
    const tax = inp.taxable ? subtotal * (inp.taxPct / 100) : 0
    const total = subtotal + tax
    return { base, cost, gain, subtotal, tax, total }
  }


  // ===== Admin Variants API helpers (tipados) =====
  async function fetchProductOptions(productId: number) {
    const res = await fetch(`${API_URL}/admin/products/${productId}/options`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('options error')
    // el backend devuelve { options: [...] } o directamente [...]
    const json = await res.json()
    return (Array.isArray(json) ? json : (json.options ?? [])) as ProductOption[]
  }

  async function fetchProductVariants(productId: number) {
    const res = await fetch(`${API_URL}/admin/products/${productId}/variants`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('variants error')
    const json = await res.json()
    return (Array.isArray(json) ? json : (json.variants ?? [])) as Variant[]
  }


  async function saveOptions(productId: number, opts: ProductOption[]) {
    const body = {
      options: opts.map(o => ({
        position: o.position,
        name: o.name,
        values: o.values
      }))
    }
    const res = await fetch(`${API_URL}/admin/products/${productId}/options`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('save options error')
  }

  async function createVariant(productId: number, payload: NewVariantInput) {
    const res = await fetch(`${API_URL}/admin/products/${productId}/variants`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('create variant error')
    return (await res.json()) as Variant
  }

  async function updateVariant(variantId: number, payload: Partial<NewVariantInput> & { archived?: boolean; stock_qty?: number }) {
    const res = await fetch(`${API_URL}/admin/variants/${variantId}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('update variant error')
    return (await res.json()) as Variant
  }

  function sameCombo(a?: { option1?: string | null, option2?: string | null, option3?: string | null },
    b?: { option1?: string | null, option2?: string | null, option3?: string | null }) {
    return (a?.option1 || null) === (b?.option1 || null)
      && (a?.option2 || null) === (b?.option2 || null)
      && (a?.option3 || null) === (b?.option3 || null)
  }

  function findVariantByOptions(list: Variant[], combo: { option1?: string | null, option2?: string | null, option3?: string | null }) {
    return list.find(v => sameCombo(v, combo)) || null
  }


  async function deleteVariant(variantId: number) {
    const res = await fetch(`${API_URL}/admin/variants/${variantId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error('delete variant error')
  }

  // Cargar opciones/variantes para un producto en edición
  const loadOptionsAndVariants = useCallback(async (productId: number) => {
    try {
      const [opts, vars] = await Promise.all([
        fetchProductOptions(productId),
        fetchProductVariants(productId),
      ])

      setOptions(opts)
      setVariants(vars)

      // precargar campos en inputs de "Opciones"
      const o1 = opts.find(o => o.position === 1)
      const o2 = opts.find(o => o.position === 2)
      const o3 = opts.find(o => o.position === 3)
      setOpt1Name(o1?.name ?? '')
      setOpt2Name(o2?.name ?? '')
      setOpt3Name(o3?.name ?? '')
      setOpt1Values((o1?.values ?? []).join(', '))
      setOpt2Values((o2?.values ?? []).join(', '))
      setOpt3Values((o3?.values ?? []).join(', '))

      // ✅ preselección por defecto para que no queden null
      setNewVar(s => ({
        ...s,
        option1: s.option1 ?? (o1?.values?.[0] ?? null),
        option2: s.option2 ?? (o2?.values?.[0] ?? null),
        option3: s.option3 ?? (o3?.values?.[0] ?? null),
      }))

      setOptionsLoaded(true)
    } catch {
      setOptions([]); setVariants([]); setOptionsLoaded(true)
    }
  }, [])



  // valores form para validar/preview
  const meta: ProductMeta = form.metadata ?? {}
  const baseUSD = Number(form.price || 0);
  const dutyUSD = Number(form.duty_usd || 0);
  const marginPct = Number(meta.margin_pct || 0);
  const taxPct = Number(meta.tax_pct || 0);
  const taxable = meta.taxable !== false;

  // costo = base + arancel
  const costUSD = baseUSD + dutyUSD;
  // ganancia = cost * margin%
  const gainUSD = costUSD * (marginPct / 100);
  // subtotal antes de tax = cost + gain
  const subtotalUSD = costUSD + gainUSD;
  // impuesto
  const estTax = taxable ? subtotalUSD * (taxPct / 100) : 0;
  // total
  const estTotal = subtotalUSD + estTax;


  // base + ganancia
  //const priceWithMargin = baseUSD * (1 + marginPct / 100)


  // validación price ↔ price_cents
  const expectedPriceCents = dollarsToCents(form.price)
  const enteredPriceCents = meta.price_cents
  const hasPriceCents = enteredPriceCents != null && !Number.isNaN(enteredPriceCents as number)
  const priceMismatch =
    hasPriceCents &&
    expectedPriceCents != null &&
    expectedPriceCents !== Number(enteredPriceCents)

  const onSubmit = async () => {
    if (!String(form.title || '').trim()) return toast.error('Falta título')
    if (form.price == null || Number.isNaN(form.price as number)) return toast.error('Precio inválido')

    // bloqueo duro si no coinciden price y price_cents
    if (priceMismatch) {
      return toast.error(
        `El "Precio en centavos" (${enteredPriceCents}) no coincide con el precio base (${form.price} → ${expectedPriceCents} centavos).`
      )
    }

    const m: ProductMeta = form.metadata ?? {}
    const cleanMeta: ProductMeta = {
      taxable: m.taxable !== false,
      tax_pct: Math.max(0, Math.min(30, Number.isFinite(m.tax_pct as number) ? Number(m.tax_pct) : 0)),
      margin_pct: Math.max(0, Number.isFinite(m.margin_pct as number) ? Number(m.margin_pct) : 0),
      price_cents:
        m.price_cents == null || Number.isNaN(m.price_cents as number)
          ? undefined
          : Math.floor(Number(m.price_cents)),
      archived: !!m.archived,
    }

    const body: Omit<Product, 'id'> & {
      owner_id?: number | null;
      metadata?: ProductMeta;
      title_en?: string | null;
      description_en?: string | null;
      duty_usd?: number | undefined;
      keywords?: string[] | undefined;
      link?: string | null;
    } = {
      title: String(form.title || '').trim(),
      title_en: form.title_en ? String(form.title_en).trim() : undefined,
      price: Number(form.price || undefined),
      weight: form.weight ?? undefined,
      category_id: form.category_id ?? undefined,
      image_url: form.image_url || '',
      description: form.description || '',
      description_en: form.description_en ?? undefined,
      metadata: cleanMeta,
      stock_qty: Number.isInteger(Number(form.stock_qty)) ? Number(form.stock_qty) : 0,
      owner_id: typeof form.owner_id === 'number' ? form.owner_id : null,
      duty_usd: form.duty_usd, // el backend lo convertirá a cents
      keywords: (form.keywords_text || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0),
        link:
    form.link == null || form.link.trim() === ''
      ? null
      : form.link.trim(),
    };


    try {
      if (editing) {
        await updateProduct(editing.id, body)
        toast.success('Producto actualizado')
      } else {
        await createProduct(body)
        toast.success('Producto creado')
        setPage(1)
      }

      setForm({
        title: '',
        price: undefined,
        weight: undefined,
        category_id: undefined,
        image_url: 'http://localhost:4000/img/productName.jpg',
        description: '',
        metadata: { taxable: true, tax_pct: undefined, margin_pct: undefined, price_cents: undefined },
        stock_qty: 0,
        owner_id: null,
        link: null,
      })
      await load()
      setEditing(null)
    } catch {
      toast.error('No se pudo guardar el producto')
    }
  }

  // Para acceder a campos opcionales sin `any`, define un tipo auxiliar
  type ProductLike = Product & {
    owner_id?: number | null
    stock_qty?: number | null
    category_id?: number | null
    weight?: number | null
    metadata?: ProductMeta | (ProductMeta & Record<string, unknown>)
  }

  const onEdit = (p: Product) => {
    const px = p as (ProductLike & {
      duty_cents?: number | null
      keywords?: string[] | null
    })

    const m = (px.metadata ?? {}) as ProductMeta & { archived?: boolean }
    const dutyUsd = typeof px.duty_cents === 'number' ? px.duty_cents / 100 : undefined
    const kwText = Array.isArray(px.keywords) ? px.keywords.join(', ') : ''

    setEditing(p)
    setForm({
      title: p.title,
      title_en: (p as Product).title_en ?? '',
      price: Number(p.price),
      weight: px.weight ?? undefined,
      category_id: px.category_id ?? undefined,
      image_url: p.image_url || '',
      description: p.description || '',
      description_en: (p as Product).description_en ?? '',
      stock_qty: px.stock_qty ?? 0,
      metadata: {
        taxable: m.taxable ?? true,
        tax_pct: typeof m.tax_pct === 'number' ? m.tax_pct : undefined,
        margin_pct: typeof m.margin_pct === 'number' ? m.margin_pct : undefined,
        price_cents: typeof m.price_cents === 'number' ? m.price_cents : undefined,
        archived: m.archived ?? false,
      },
      owner_id: px.owner_id ?? null,
      duty_usd: dutyUsd,
      keywords_text: kwText,
      link: (px as Product & { link?: string | null }).link ?? null,
    })

    // Cargar opciones/variantes del producto
    void loadOptionsAndVariants(p.id)
  }

  const onDelete = async (id: number) => {
    await deleteProduct(id)
    toast.success('Eliminado')
    await load()
    if (editing?.id === id) setEditing(null)
  }

  // util debounce
  function useDebounce<T>(value: T, delay = 300) {
    const [v, setV] = useState(value)
    useEffect(() => {
      const t = setTimeout(() => setV(value), delay)
      return () => clearTimeout(t)
    }, [value, delay])
    return v
  }

  useEffect(() => {
    if (!editing) return;
    const matched = findVariantByOptions(variants, {
      option1: newVar.option1 ?? null,
      option2: newVar.option2 ?? null,
      option3: newVar.option3 ?? null,
    })
    if (matched) {
      // Precarga campos con lo guardado
      setNewVar(s => ({
        ...s,
        stock_qty: matched.stock_qty ?? 0,
        price_cents: matched.price_cents ?? null,
        weight: matched.weight ?? null,
        image_url: matched.image_url ?? null,
        sku: matched.sku ?? null,
      }))
    }
    // Si no hay variante, NO tocamos los campos para que el usuario pueda crearla
  }, [editing, variants, newVar.option1, newVar.option2, newVar.option3])


  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Productos</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center"
              aria-label="Atrás"
              title="Atrás"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.forward()}
              className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center"
              aria-label="Adelante"
              title="Adelante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AdminTabs />

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-white p-4 rounded shadow">
          <div className="md:col-span-2">
            <label htmlFor="f-q" className="block text-sm font-medium text-gray-700">Buscar</label>
            <input id="f-q" className="input" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
          </div>

          <div>
            <label htmlFor="f-cat" className="block text-sm font-medium text-gray-700">Categoría</label>
            <select
              id="f-cat"
              className="input"
              value={categoryId ?? ''}
              onChange={e => { setCategoryId(e.target.value === '' ? undefined : Number(e.target.value)); setPage(1) }}
            >
              <option value="">Todas las categorías</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="f-owner" className="block text-sm font-medium text-gray-700">Owner</label>
            <select
              id="f-owner"
              className="input"
              value={ownerIdFilter ?? ''}
              onChange={e => {
                const val = e.target.value === '' ? undefined : Number(e.target.value)
                setOwnerIdFilter(val)
                setPage(1)
              }}
            >
              <option value="">Todos los owners</option>
              {owners.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-arch" className="block text-sm font-medium text-gray-700">Estado</label>
            <select
              id="f-arch"
              className="input"
              value={archived}
              onChange={e => { setArchived(e.target.value as 'all' | 'true' | 'false'); setPage(1) }}
            >
              <option value="all">Todos</option>
              <option value="false">Activos</option>
              <option value="true">Archivados</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-limit" className="block text-sm font-medium text-gray-700">Límite</label>
            <select id="f-limit" className="input" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}>
              {[10, 20, 50].map(n => <option key={n} value={n}>{n}/página</option>)}
            </select>
          </div>
        </div>

        {/* Form + lista */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded shadow p-4 space-y-3">
            <h2 className="font-semibold">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>

            <div>
              <label htmlFor="p-title" className="block text-sm font-medium text-gray-700">Título</label>
              <input
                id="p-title"
                className="input"
                value={form.title ?? ''}
                onChange={e => setForm(s => ({ ...s, title: e.target.value }))}
              />
            </div>

            {/* Inglés */}
            <div>
              <label htmlFor="p-title-en" className="block text-sm font-medium text-gray-700">Title (EN)</label>
              <input
                id="p-title-en"
                className="input"
                value={form.title_en ?? ''}
                onChange={e => setForm(s => ({ ...s, title_en: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="p-desc" className="block text-sm font-medium text-gray-700">Descripción</label>
              <textarea
                id="p-desc"
                className="input"
                rows={3}
                placeholder="Descripción breve del producto"
                value={form.description ?? ''}
                onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Se mostrará en la tienda (listado y detalle).
              </p>
            </div>


            <div>
              <label htmlFor="p-desc-en" className="block text-sm font-medium text-gray-700">Description (EN)</label>
              <textarea
                id="p-desc-en"
                className="input"
                rows={3}
                value={form.description_en ?? ''}
                onChange={e => setForm(s => ({ ...s, description_en: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="p-price" className="block text-sm font-medium text-gray-700">Precio base (USD)</label>
              <input
                id="p-price" className="input" type="number" step="0.01"
                value={form.price == null || Number.isNaN(form.price as number) ? '' : String(form.price)}
                onChange={e => setForm(s => ({ ...s, price: e.target.value === '' ? undefined : Number(e.target.value) }))}
              />
              <p className="text-xs text-gray-500 mt-1">Equivale a <strong>{expectedPriceCents ?? 0}</strong> centavos.</p>
            </div>

            {/* Arancel (USD) */}
            <div>
              <label htmlFor="p-duty" className="block text-sm font-medium text-gray-700">Arancel (USD por unidad)</label>
              <input
                id="p-duty" className="input" type="number" step="0.01" min={0}
                value={form.duty_usd == null || Number.isNaN(form.duty_usd) ? '' : String(form.duty_usd)}
                onChange={e => setForm(s => ({ ...s, duty_usd: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) }))}
              />
            </div>


            <div>
              <label htmlFor="p-stock" className="block text-sm font-medium text-gray-700">Stock</label>
              <input
                id="p-stock"
                className="input"
                type="number"
                min={0}
                value={form.stock_qty == null || Number.isNaN(form.stock_qty as number) ? '' : String(form.stock_qty)}
                onChange={e => setForm(s => ({ ...s, stock_qty: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }))}
              />
              <p className="text-xs text-gray-500 mt-1">Si el stock es 0 el producto quedará archivado automáticamente.</p>
            </div>

            <div>
              <label htmlFor="p-weight" className="block text-sm font-medium text-gray-700">Peso</label>
              <input
                id="p-weight" className="input" type="number" step="0.01"
                value={form.weight == null || Number.isNaN(form.weight as number) ? '' : String(form.weight)}
                onChange={e => setForm(s => ({ ...s, weight: e.target.value === '' ? undefined : Number(e.target.value) }))}
              />
            </div>

            <div>
              <label htmlFor="p-cat" className="block text-sm font-medium text-gray-700">Categoría</label>
              <select
                id="p-cat"
                className="input"
                value={form.category_id ?? ''}
                onChange={e => setForm(s => ({ ...s, category_id: e.target.value === '' ? undefined : Number(e.target.value) }))}
              >
                <option value="">Sin categoría</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="p-img" className="block text-sm font-medium text-gray-700">Imagen URL</label>
              <input
                id="p-img"
                className="input"
                value={form.image_url ?? ''}
                onChange={e => setForm(s => ({ ...s, image_url: e.target.value }))}
              />
            </div>

            {/* Keywords */}
            <div>
              <label htmlFor="p-kw" className="block text-sm font-medium text-gray-700">Keywords (coma separadas)</label>
              <input
                id="p-kw" className="input"
                placeholder="ej: crema, piel seca, hidratante"
                value={form.keywords_text ?? ''}
                onChange={e => setForm(s => ({ ...s, keywords_text: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Se usarán en el buscador global además del título/descr en ES/EN.</p>
            </div>

            <div>
              <label htmlFor="p-amazon-url" className="block text-sm font-medium text-gray-700">
                URL de Amazon (opcional)
              </label>
              <input
                id="p-amazon-url"
                className="input"
                type="url"
                placeholder="https://amzn.to/..."
                value={form.link ?? ''}
                onChange={e =>
                  setForm(s => ({
                    ...s,
                    link: e.target.value.trim() === '' ? null : e.target.value.trim(),
                  }))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Si este campo tiene valor, el producto se comportará como enlace externo a Amazon (no se podrá agregar al carrito).
              </p>
            </div>



            {/* Owner real (owner_id) */}
            <div>
              <label htmlFor="p-owner" className="block text-sm font-medium text-gray-700">Owner</label>
              <select
                id="p-owner"
                className="input"
                value={form.owner_id ?? ''} // UI puede mostrar '' pero el estado guarda number|null
                onChange={(e) => {
                  const ownerId = e.target.value === '' ? null : Number(e.target.value)
                  setForm(prev => ({ ...prev, owner_id: ownerId })) // number|null
                }}
              >
                <option value="">Sin owner</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>

            </div>

            <fieldset className="border rounded p-3">
              <legend className="text-sm font-medium text-gray-700">Metadata</legend>

              <div className="mt-2 flex items-center gap-2">
                <input
                  id="m-taxable" type="checkbox"
                  checked={!!(form.metadata?.taxable ?? true)}
                  onChange={e => setForm(s => ({ ...s, metadata: { ...(s.metadata || {}), taxable: e.target.checked } }))}
                />
                <label htmlFor="m-taxable" className="text-sm text-gray-700 select-none">Producto taxable</label>
              </div>

              <div className="mt-2">
                <label htmlFor="m-taxpct" className="block text-sm text-gray-700">Tax %</label>
                <input
                  id="m-taxpct" className="input" type="number" step="0.01" min={0}
                  value={form.metadata?.tax_pct == null || Number.isNaN(form.metadata?.tax_pct) ? '' : String(form.metadata?.tax_pct)}
                  onChange={e => setForm(s => ({ ...s, metadata: { ...(s.metadata || {}), tax_pct: e.target.value === '' ? undefined : Number(e.target.value) } }))}
                />
              </div>

              <div className="mt-2">
                <label htmlFor="m-marginpct" className="block text-sm text-gray-700">Ganancia %</label>
                <input
                  id="m-marginpct" className="input" type="number" step="0.01" min={0}
                  value={form.metadata?.margin_pct == null || Number.isNaN(form.metadata?.margin_pct) ? '' : String(form.metadata?.margin_pct)}
                  onChange={e => setForm(s => ({ ...s, metadata: { ...(s.metadata || {}), margin_pct: e.target.value === '' ? undefined : Number(e.target.value) } }))}
                />
              </div>

              <div className="mt-2">
                <label htmlFor="m-pricecents" className="block text-sm text-gray-700">Precio en centavos (opcional)</label>
                <input
                  id="m-pricecents" className="input" type="number" step="1" min={0}
                  value={form.metadata?.price_cents == null || Number.isNaN(form.metadata?.price_cents) ? '' : String(form.metadata?.price_cents)}
                  onChange={e => setForm(s => ({ ...s, metadata: { ...(s.metadata || {}), price_cents: e.target.value === '' ? undefined : Math.floor(Number(e.target.value)) } }))}
                />
                {priceMismatch && (
                  <p className="text-xs text-red-600 mt-1">
                    No coincide con el precio base (${form.price} → {expectedPriceCents} centavos).
                  </p>
                )}
              </div>
            </fieldset>

            {editing && (
              <div className="mt-4 space-y-4">
                <h3 className="font-semibold">Variantes</h3>

                {/* ----- Opciones (hasta 3) ----- */}
                <div className="border rounded p-3 space-y-3">
                  <div className="text-sm text-gray-600">Define hasta 3 opciones (ej. Talla, Color). Los valores se separan por coma.</div>

                  {/* Opción 1 */}
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-sm text-gray-700">Opción 1 - Nombre</label>
                      <input className="input w-full" placeholder="Talla" value={opt1Name} onChange={e => setOpt1Name(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Valores (coma)</label>
                      <input className="input w-full" placeholder="S, M, L" value={opt1Values} onChange={e => setOpt1Values(e.target.value)} />
                    </div>
                  </div>

                  {/* Opción 2 */}
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-sm text-gray-700">Opción 2 - Nombre</label>
                      <input className="input w-full" placeholder="Color" value={opt2Name} onChange={e => setOpt2Name(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Valores (coma)</label>
                      <input className="input w-full" placeholder="Negro, Blanco" value={opt2Values} onChange={e => setOpt2Values(e.target.value)} />
                    </div>
                  </div>

                  {/* Opción 3 */}
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-sm text-gray-700">Opción 3 - Nombre</label>
                      <input className="input w-full" placeholder="Material" value={opt3Name} onChange={e => setOpt3Name(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Valores (coma)</label>
                      <input className="input w-full" placeholder="Algodón, Seda" value={opt3Values} onChange={e => setOpt3Values(e.target.value)} />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={async () => {
                        if (!editing) return
                        const opts: ProductOption[] = []
                        if (opt1Name.trim()) opts.push({ id: 0, position: 1, name: opt1Name.trim(), values: opt1Values.split(',').map(s => s.trim()).filter(Boolean) })
                        if (opt2Name.trim()) opts.push({ id: 0, position: 2, name: opt2Name.trim(), values: opt2Values.split(',').map(s => s.trim()).filter(Boolean) })
                        if (opt3Name.trim()) opts.push({ id: 0, position: 3, name: opt3Name.trim(), values: opt3Values.split(',').map(s => s.trim()).filter(Boolean) })

                        try {
                          await saveOptions(editing.id, opts)
                          toast.success('Opciones guardadas')

                          // Recargar desde admin y preseleccionar
                          await loadOptionsAndVariants(editing.id)

                          const o1 = opts.find(o => o.position === 1)
                          const o2 = opts.find(o => o.position === 2)
                          const o3 = opts.find(o => o.position === 3)
                          setNewVar(s => ({
                            ...s,
                            option1: o1?.values?.[0] ?? null,
                            option2: o2?.values?.[0] ?? null,
                            option3: o3?.values?.[0] ?? null,
                          }))
                        } catch {
                          toast.error('No se pudieron guardar las opciones')
                        }
                      }}
                    >
                      Guardar opciones
                    </button>
                  </div>
                </div>

                {/* ----- Crear variante ----- */}
                <div className="border rounded p-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    {/* Selects según opciones guardadas */}
                    {options.find(o => o.position === 1) && (
                      <div>
                        <label className="block text-sm text-gray-700">{options.find(o => o.position === 1)?.name}</label>
                        <select className="input w-full" value={newVar.option1 ?? ''} onChange={e => setNewVar(s => ({ ...s, option1: e.target.value || null }))}>
                          <option value="">(Selecciona)</option>
                          {options.find(o => o.position === 1)?.values.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    )}
                    {options.find(o => o.position === 2) && (
                      <div>
                        <label className="block text-sm text-gray-700">{options.find(o => o.position === 2)?.name}</label>
                        <select className="input w-full" value={newVar.option2 ?? ''} onChange={e => setNewVar(s => ({ ...s, option2: e.target.value || null }))}>
                          <option value="">(Selecciona)</option>
                          {options.find(o => o.position === 2)?.values.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    )}
                    {options.find(o => o.position === 3) && (
                      <div>
                        <label className="block text-sm text-gray-700">{options.find(o => o.position === 3)?.name}</label>
                        <select className="input w-full" value={newVar.option3 ?? ''} onChange={e => setNewVar(s => ({ ...s, option3: e.target.value || null }))}>
                          <option value="">(Selecciona)</option>
                          {options.find(o => o.position === 3)?.values.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700">Stock</label>
                      <input className="input w-full" type="number" min={0}
                        value={Number.isFinite(newVar.stock_qty) ? String(newVar.stock_qty) : '0'}
                        onChange={e => setNewVar(s => ({ ...s, stock_qty: Math.max(0, Number(e.target.value || 0)) }))} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Precio (centavos, opcional)</label>
                      <input
                        className="input w-full"
                        type="number"
                        min={0}
                        value={newVar.price_cents ?? ''}
                        onChange={e =>
                          setNewVar(s => ({
                            ...s,
                            price_cents: e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value))),
                          }))
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Equivale a <strong>${formatUSD(centsToDollars(newVar.price_cents))}</strong> USD.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700">Peso (opcional)</label>
                      <input className="input w-full" type="number" step="0.01"
                        value={newVar.weight ?? ''}
                        onChange={e => setNewVar(s => ({ ...s, weight: e.target.value === '' ? null : Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">SKU / Imagen URL</label>
                      <div className="grid grid-cols-1 gap-2">
                        <input className="input w-full" placeholder="SKU" value={newVar.sku ?? ''} onChange={e => setNewVar(s => ({ ...s, sku: e.target.value || null }))} />
                        <input className="input w-full" placeholder="https://..." value={newVar.image_url ?? ''} onChange={e => setNewVar(s => ({ ...s, image_url: e.target.value || null }))} />
                      </div>
                    </div>
                  </div>

                  {/* --- Preview variante --- */}
                  {(() => {
                    const variantUSD = centsToDollars(newVar.price_cents)
                    const totals = computeVariantTotals({
                      productBaseUSD: baseUSD,
                      dutyUSD,
                      marginPct,
                      taxPct,
                      taxable,
                      variantPriceUSD: variantUSD,
                    })
                    return (
                      <div className="rounded-md border bg-gray-50 p-3 text-sm">
                        <div className="font-medium text-gray-800 mb-1">Preview de esta variante</div>
                        <div className="space-y-0.5 text-gray-700">
                          <div>Base: ${formatUSD(totals.base)}</div>
                          <div>+ Arancel: ${formatUSD(dutyUSD)}</div>
                          <div>+ Ganancia ({marginPct}%): ${formatUSD(totals.gain)}</div>
                          <div>Subtotal: ${formatUSD(totals.subtotal)}</div>
                          <div>{taxable ? `+ Tax (${taxPct}%): $${formatUSD(totals.tax)}` : 'Exento de impuestos'}</div>
                          <div className="font-semibold">Total estimado: ${formatUSD(totals.total)}</div>
                        </div>
                      </div>
                    )
                  })()}


                  <div className="pt-1">
                    <button
                      className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={async () => {
                        if (!editing) return

                        const matched = findVariantByOptions(variants, {
                          option1: newVar.option1 ?? null,
                          option2: newVar.option2 ?? null,
                          option3: newVar.option3 ?? null,
                        })

                        try {
                          if (matched) {
                            const updated = await updateVariant(matched.id, {
                              stock_qty: newVar.stock_qty,
                              price_cents: newVar.price_cents ?? null,
                              weight: newVar.weight ?? null,
                              image_url: newVar.image_url ?? null,
                              sku: newVar.sku ?? null,
                            })
                            setVariants(arr => arr.map(v => v.id === matched.id ? {
                              ...v,
                              stock_qty: updated.stock_qty ?? newVar.stock_qty,
                              price_cents: (updated as unknown as { price_cents: number | null })?.price_cents ?? newVar.price_cents ?? null,
                              weight: (updated as unknown as { weight: number | null })?.weight ?? newVar.weight ?? null,
                              image_url: (updated as unknown as { image_url: string | null })?.image_url ?? newVar.image_url ?? null,
                              sku: (updated as unknown as { sku: string | null })?.sku ?? newVar.sku ?? null,
                            } : v))
                            toast.success('Variante actualizada')
                          } else {
                            const created = await createVariant(editing.id, newVar)
                            setVariants(v => [...v, created])
                            toast.success('Variante creada')
                          }
                        } catch {
                          toast.error('No se pudo guardar la variante')
                        }
                      }}
                    >
                      {findVariantByOptions(variants, { option1: newVar.option1 ?? null, option2: newVar.option2 ?? null, option3: newVar.option3 ?? null })
                        ? 'Guardar cambios'
                        : 'Agregar variante'}
                    </button>
                  </div>
                </div>

                {/* ----- Lista de variantes ----- */}
                <div className="border rounded">
                  <div className="p-2 text-sm text-gray-700 border-b bg-gray-50 flex items-center justify-between">
                    <span>Total variantes: {variants.length}</span>
                    {!optionsLoaded && <span className="text-gray-400">Cargando…</span>}
                  </div>
                  <div className="divide-y">
                    {variants.map(v => (
                      <div key={v.id} className="p-3 flex flex-col gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {[v.option1, v.option2, v.option3].filter(Boolean).join(' / ') || 'Sin opciones'}
                          </div>

                          {(() => {
                            const variantUSD = centsToDollars(v.price_cents)
                            const totals = computeVariantTotals({
                              productBaseUSD: baseUSD,
                              dutyUSD,
                              marginPct,
                              taxPct,
                              taxable,
                              variantPriceUSD: variantUSD,
                            })
                            const totalFromBackend =
                              typeof v.display_total_usd === 'number' && Number.isFinite(v.display_total_usd)
                                ? v.display_total_usd
                                : undefined

                            return (
                              <div className="text-sm text-gray-600">
                                Precio (centavos): {v.price_cents ?? '—'}
                                {' · '}Precio base USD: ${formatUSD(variantUSD)}
                                {' · '}Peso: {v.weight ?? '—'}
                                {' · '}Imagen: {v.image_url ? 'sí' : '—'}
                                {' · '}
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                  Total estimado: ${formatUSD(totalFromBackend ?? totals.total)}
                                </span>
                                {v.image_url && <img src={v.image_url} alt="var" className="w-10 h-10 rounded object-cover mt-1" />}
                              </div>
                            )
                          })()}

                        </div>
                        <div className="flex gap-2">
                          <button
                            className="px-2 py-1 rounded bg-gray-200"
                            onClick={async () => {
                              try {
                                const n = prompt('Nuevo stock', String(v.stock_qty))
                                if (n == null) return
                                const updated = await updateVariant(v.id, { stock_qty: Math.max(0, Number(n)) })
                                setVariants(arr => arr.map(x => x.id === v.id ? { ...x, stock_qty: updated.stock_qty } : x))
                                toast.success('Stock actualizado')
                              } catch { toast.error('No se pudo actualizar') }
                            }}
                          >Stock</button>

                          <button
                            className={`px-2 py-1 rounded ${v.archived ? 'bg-emerald-600 text-white' : 'bg-yellow-600 text-white'}`}
                            onClick={async () => {
                              try {
                                const updated = await updateVariant(v.id, { archived: !v.archived })
                                setVariants(arr => arr.map(x => x.id === v.id ? { ...x, archived: updated.archived } : x))
                                toast.success(updated.archived ? 'Archivada' : 'Activada')
                              } catch { toast.error('No se pudo actualizar') }
                            }}
                          >
                            {v.archived ? 'Activar' : 'Archivar'}
                          </button>

                          <button
                            className="px-2 py-1 rounded bg-red-600 text-white"
                            onClick={async () => {
                              if (!confirm('¿Eliminar variante? Si está en órdenes, se archivará.')) return
                              try {
                                await deleteVariant(v.id)
                                setVariants(arr => arr.filter(x => x.id !== v.id))
                                toast.success('Variante eliminada/archivada')
                              } catch { toast.error('No se pudo eliminar') }
                            }}
                          >Borrar</button>
                        </div>
                      </div>
                    ))}
                    {variants.length === 0 && <div className="p-3 text-sm text-gray-500">No hay variantes</div>}
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              Preview: Precio+Arancel+ganancia ${subtotalUSD.toFixed(2)} · {taxable ? `Tax ${taxPct}% = $${estTax.toFixed(2)}` : 'exento'} · Total estimado ${estTotal.toFixed(2)}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onSubmit}
                disabled={priceMismatch}
                className={`px-3 py-2 rounded text-white ${priceMismatch ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {editing ? 'Guardar' : 'Crear'}
              </button>
              {editing && (
                <button
                  onClick={() => {
                    setEditing(null)
                    setForm({
                      title: '',
                      price: undefined,
                      weight: undefined,
                      category_id: undefined,
                      image_url: 'http://localhost:4000/img/productName.jpg',
                      description: '',
                      metadata: { taxable: true, tax_pct: undefined, margin_pct: undefined, price_cents: undefined },
                      stock_qty: 0,
                      owner_id: form.owner_id ?? null,
                      link: null,
                    })
                  }}
                  className="px-3 py-2 rounded bg-gray-200"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="md:col-span-2 bg-white rounded shadow divide-y">
            {items.map(p => {
              const px = p as ProductLike
              const ownerId = px.owner_id as number | undefined
              const ownerName =
                (ownerId && owners.find(o => o.id === ownerId)?.name) || 'sin owner'

              return (
                <div key={p.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center gap-4">
                  <img src={p.image_url || '/product.webp'} alt={p.title} className="w-16 h-16 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{p.title}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">
                        {(() => {
                          const base = Number(p.price || 0)
                          const m = (px.metadata ?? {}) as ProductMeta
                          const marginPct = Number(m.margin_pct || 0)
                          const taxPct = Number(m.tax_pct || 0)
                          const taxable = m.taxable !== false
                          const dutyUsd = typeof px.duty_cents === 'number' ? px.duty_cents / 100 : 0

                          const cost = base + dutyUsd
                          const subtotal = cost * (1 + marginPct / 100)
                          const estTax = taxable ? subtotal * (taxPct / 100) : 0
                          const estTotal = subtotal + estTax
                          return `$${estTotal.toFixed(2)}`
                        })()}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {px.category_id ? `Cat #${px.category_id}` : 'Sin categoría'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {ownerName}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${Number(px.stock_qty || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                          {Number(px.stock_qty || 0) > 0 ? `Stock: ${px.stock_qty}` : 'Agotado'}
                        </span>
                        {((px.metadata as ProductMeta | undefined)?.archived) && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Archivado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2 w-full sm:w-auto sm:ml-auto">
                    <button onClick={() => onEdit(p)} className="flex-1 sm:flex-none px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Editar</button>
                    <button onClick={() => onDelete(p.id)} className="flex-1 sm:flex-none px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Borrar</button>
                  </div>
                </div>
              )
            })}
            {items.length === 0 && <div className="p-4 text-gray-500">Sin productos</div>}
          </div>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between bg-white rounded shadow p-3">
          <div className="text-sm text-gray-600">Página {page} de {pages} · {total} resultados</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
            <button className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Siguiente</button>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
