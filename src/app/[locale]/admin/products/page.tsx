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
  const priceWithMargin = baseUSD * (1 + marginPct / 100)


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
    const px = p as ProductLike
    const m = (px.metadata ?? {}) as ProductMeta & { archived?: boolean }
    const dutyUsd = typeof px.duty_cents === 'number' ? px.duty_cents / 100 : undefined;
    const kwText = Array.isArray(px.keywords) ? px.keywords.join(', ') : '';
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
    })

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
