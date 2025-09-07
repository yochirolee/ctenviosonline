'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminTabs from '@/components/admin/AdminTabs'
import { listAdminOrdersPaged, updateOrderStatus, type AdminOrderListItem, type AdminOrderPage } from '@/lib/adminApi'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Filters = {
  q: string
  status: string
  payment_method: string
  from: string
  to: string
  page: number
  limit: number
  sort_by: 'created_at' | 'total' | 'status'
  sort_dir: 'asc' | 'desc'
}

/** Extendemos estrictamente lo que necesitamos mostrar de cada fila (sin `any`) */
type AdminOrderListItemWithTotals = AdminOrderListItem & {
  subtotal: number
  tax: number
  base_total: number          // total sin fee (incluye envío)
  card_fee: number
  total_with_fee: number
}

export default function AdminOrdersPage() {
  const { locale } = useParams<{ locale: string }>()
  const router = useRouter()

  const [filters, setFilters] = useState<Filters>({
    q: '',
    status: '',
    payment_method: '',
    from: '',
    to: '',
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_dir: 'desc',
  })

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AdminOrderPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const debouncedQ = useDebounce(filters.q, 300)

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAdminOrdersPaged({
        q: debouncedQ || undefined,
        status: filters.status || undefined,
        payment_method: filters.payment_method || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page: filters.page,
        limit: filters.limit,
        sort_by: filters.sort_by,
        sort_dir: filters.sort_dir,
      })
      setData(res)
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar las órdenes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filters.status, filters.payment_method, filters.from, filters.to, filters.page, filters.limit, filters.sort_by, filters.sort_dir])

  const onChangeStatus = async (id: number, status: string) => {
    try {
      await updateOrderStatus(id, status)
      toast.success('Estado actualizado')
      load()
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Órdenes</h1>

          <div className="flex items-center gap-2">
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
        <div className="bg-white rounded shadow p-4 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Buscar</label>
            <input
              className="input"
              placeholder="id, email, nombre, invoice…"
              value={filters.q}
              onChange={(e) => { setFilters(s => ({ ...s, q: e.target.value, page: 1 })) }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select className="input" value={filters.status} onChange={e => { setFilters(s => ({ ...s, status: e.target.value, page: 1 })) }}>
              <option value="">Todos</option>
              {['pending', 'paid', 'shipped', 'delivered', 'canceled', 'failed'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Método</label>
            <select className="input" value={filters.payment_method} onChange={e => { setFilters(s => ({ ...s, payment_method: e.target.value, page: 1 })) }}>
              <option value="">Todos</option>
              {['bmspay_direct', 'bmspay', 'cash', 'other'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Desde</label>
            <input type="date" className="input" value={filters.from} onChange={e => { setFilters(s => ({ ...s, from: e.target.value, page: 1 })) }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hasta</label>
            <input type="date" className="input" value={filters.to} onChange={e => { setFilters(s => ({ ...s, to: e.target.value, page: 1 })) }} />
          </div>

          <div className="md:col-span-6 flex gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ordenar por</label>
              <select className="input" value={filters.sort_by} onChange={e => setFilters(s => ({ ...s, sort_by: e.target.value as Filters['sort_by'] }))}>
                <option value="created_at">Fecha</option>
                <option value="total">Total</option>
                <option value="status">Estado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dirección</label>
              <select className="input" value={filters.sort_dir} onChange={(e) => setFilters(s => ({ ...s, sort_dir: e.target.value as Filters['sort_dir'] }))}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
            <div className="ml-auto">
              <label className="block text-sm font-medium text-gray-700">Límite</label>
              <select className="input" value={filters.limit} onChange={e => setFilters(s => ({ ...s, limit: Number(e.target.value), page: 1 }))}>
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/página</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>ID</Th>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th className="text-right">Ítems</Th>
                <Th className="text-right">Subtotal</Th>
                <Th className="text-right">Tax</Th>
                <Th className="text-right">Envío</Th>
                <Th className="text-right">Total (sin fee)</Th>
                <Th className="text-right">Fee</Th>
                <Th className="text-right">Total + fee</Th>
                <Th>Estado</Th>
                <Th>Método</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={13} className="p-4 text-center text-gray-500">Cargando…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={13} className="p-4 text-center text-red-600">{error}</td></tr>
              )}
              {!loading && !error && data?.items?.length === 0 && (
                <tr><td colSpan={13} className="p-4 text-center text-gray-500">Sin resultados</td></tr>
              )}
              {!loading && !error && data?.items?.map((o) => (
                <Row
                  key={o.id}
                  o={o as AdminOrderListItemWithTotals}
                  fmt={(n) => fmt.format(n)}
                  onView={() => router.push(`/${locale}/admin/orders/${o.id}`)}
                  onChangeStatus={onChangeStatus}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!loading && data && (
          <div className="flex items-center justify-between bg-white rounded shadow p-3">
            <div className="text-sm text-gray-600">
              Página {data.page} de {data.pages} · {data.total} resultados
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
                disabled={filters.page <= 1}
                onClick={() => setFilters(s => ({ ...s, page: Math.max(1, s.page - 1) }))}
              >
                Anterior
              </button>
              <button
                className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
                disabled={filters.page >= data.pages}
                onClick={() => setFilters(s => ({ ...s, page: Math.min(data.pages, s.page + 1) }))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}

function Th(
  { children, className = '' }: { children?: React.ReactNode; className?: string }
) {
  return (
    <th className={`px-3 py-2 text-left font-semibold text-gray-700 ${className}`}>
      {children}
    </th>
  );
}

function Row({
  o,
  fmt,
  onView,
  onChangeStatus,
}: {
  o: AdminOrderListItemWithTotals
  fmt: (n: number) => string
  onView: () => void
  onChangeStatus: (id: number, s: string) => void
}) {
  const name = [o.first_name, o.last_name].filter(Boolean).join(' ') || '—'
  const email = o.email || '—'
  const when = new Date(o.created_at).toLocaleString()

  // Envío derivado de lo que ya viene del back: base_total = subtotal + tax + envío
  const shipping = Math.max(Number((o.base_total - o.subtotal - o.tax).toFixed(2)), 0)

  return (
    <tr className="border-t">
      <td className="px-3 py-2 font-mono">#{o.id}</td>
      <td className="px-3 py-2 whitespace-nowrap">{when}</td>
      <td className="px-3 py-2">
        <div className="font-medium">{name}</div>
        <div className="text-xs text-gray-600">{email}</div>
      </td>
      <td className="px-3 py-2 text-right">{o.items_count}</td>

      {/* Mostrar TAL CUAL vienen del back (y envío derivado) */}
      <td className="px-3 py-2 text-right">{fmt(o.subtotal)}</td>
      <td className="px-3 py-2 text-right">{fmt(o.tax)}</td>
      <td className="px-3 py-2 text-right">{fmt(shipping)}</td>
      <td className="px-3 py-2 text-right">{fmt(o.base_total)}</td>
      <td className="px-3 py-2 text-right">{fmt(o.card_fee)}</td>
      <td className="px-3 py-2 text-right font-semibold">{fmt(o.total_with_fee)}</td>

      <td className="px-3 py-2">
        <span className={
          'px-2 py-0.5 rounded text-xs ' +
          (o.status === 'paid' ? 'bg-green-100 text-green-700'
            : o.status === 'pending' ? 'bg-amber-100 text-amber-700'
              : o.status === 'failed' ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700')
        }>
          {o.status}
        </span>
      </td>
      <td className="px-3 py-2">
        {o.payment_method === 'bmspay_direct' ? 'bmspay (direct)' : (o.payment_method || '—')}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex gap-2">
          <button onClick={onView} className="px-2 py-1 rounded bg-white border hover:bg-gray-50">Ver</button>
          <select
            className="px-2 py-1 rounded border bg-white"
            value=""
            onChange={(e) => e.target.value && onChangeStatus(o.id, e.target.value)}
          >
            <option value="">Estado…</option>
            {['pending', 'paid', 'shipped', 'delivered', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </td>
    </tr>
  )
}

function useDebounce<T>(value: T, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
