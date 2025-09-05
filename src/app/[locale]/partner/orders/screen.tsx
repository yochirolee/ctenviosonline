'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listPartnerOrders,
  partnerAssign,
  partnerSetStatus,
  type PartnerOrder,
  partnerMarkDeliveredWithPhoto, // 👈 IMPORTA la nueva función
} from '@/lib/partnerApi'
import { getMe } from '@/lib/adminApi'
import { toast } from 'sonner'

type Status = 'paid' | 'shipped' | 'delivered'
type Scope = 'mine' | 'available'

// Mínimo que usamos de "me"
type Me = {
  id: number | string
  metadata?: { role?: string } | null
} | null

export default function PartnerOrdersScreen() {
  const router = useRouter()
  const [me, setMe] = useState<Me>(null)
  const [status, setStatus] = useState<Status>('paid')
  const [scope, setScope] = useState<Scope>('mine') // solo aplica a delivery
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<PartnerOrder[]>([])
  const [loading, setLoading] = useState(false)

  // estado para el flujo de foto
  const [deliverForId, setDeliverForId] = useState<number | null>(null)
  const [deliverPhoto, setDeliverPhoto] = useState<File | null>(null)
  const [deliverNotes, setDeliverNotes] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getMe().then(setMe).catch(() => setMe(null))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPartnerOrders({ status, scope, page, limit })
      setItems(data.items)
      setPages(data.pages)
      setTotal(data.total)
    } catch {
      toast.error('No se pudo cargar órdenes')
    } finally {
      setLoading(false)
    }
  }, [status, scope, page, limit])

  useEffect(() => {
    load()
  }, [load])

  const role = me?.metadata?.role
  const isDelivery = role === 'delivery'
  const isOwner = role === 'owner' || role === 'admin'

  const claim = async (id: number) => {
    try {
      await partnerAssign(id, 'take')
      toast.success(`Orden #${id} asignada`)
      await load()
    } catch {
      toast.error('No se pudo asignar')
    }
  }

  const release = async (id: number) => {
    try {
      await partnerAssign(id, 'release')
      toast.success(`Orden #${id} liberada`)
      await load()
    } catch {
      toast.error('No se pudo liberar')
    }
  }

  const mark = async (id: number, s: 'shipped' | 'delivered') => {
    try {
      await partnerSetStatus(id, s)
      toast.success(`Orden #${id} marcada como ${s}`)
      await load()
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  // marcar delivered con foto (usa /deliver/partner/:id/mark-delivered)
  const markWithPhoto = async (id: number) => {
    if (sending) return
    setSending(true)
    try {
      await partnerMarkDeliveredWithPhoto(id, { photo: deliverPhoto, notes: deliverNotes })
      toast.success(`Orden #${id} marcada como delivered`)
      // limpia UI
      setDeliverForId(null)
      setDeliverPhoto(null)
      setDeliverNotes('')
      await load()
    } catch {
      toast.error('No se pudo actualizar el estado (foto)')
    } finally {
      setSending(false)
    }
  }

  const fmtName = (o: PartnerOrder) =>
    [o.first_name, o.last_name].filter(Boolean).join(' ') || '—'
  const fmtTotal = (n: number | null | undefined) =>
    typeof n === 'number' ? `$${n.toFixed(2)}` : '—'

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Órdenes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={() => router.forward()}
            className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">Estado</label>
          <select
            className="input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as Status)
              setPage(1)
            }}
          >
            <option value="paid">paid</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
          </select>
        </div>
        {isDelivery && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Ámbito</label>
            <select
              className="input"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as Scope)
                setPage(1)
              }}
            >
              <option value="mine">mis órdenes</option>
              <option value="available">disponibles</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Límite</label>
          <select
            className="input"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(1)
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}/página
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded shadow divide-y">
        {loading && <div className="p-4 text-gray-500">Cargando...</div>}
        {!loading && items.length === 0 && (
          <div className="p-4 text-gray-500">Sin órdenes</div>
        )}

        {!loading &&
          items.map((o) => {
            const assigneeId = o.metadata?.delivery_assignee_id
            const assignedToMe = String(assigneeId || '') === String(me?.id || '')

            // Flags por-orden
            const canPhotoDeliver = (isDelivery && assignedToMe) || isOwner
            const showDeliverUI = canPhotoDeliver && o.status === 'shipped' && deliverForId === o.id

            return (
              <div
                key={o.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">Orden #{o.id}</div>
                  <div className="text-sm text-gray-700">
                    Cliente: {fmtName(o)}{' '}
                    {o.customer_email ? `· ${o.customer_email}` : ''}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 space-x-2">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      Estado: {o.status}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      Total: {fmtTotal(o.total)}
                    </span>
                    {assigneeId && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        Asignada a:{' '}
                        {o.metadata?.delivery_assignee_name || assigneeId}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 sm:mt-0 flex flex-col gap-2 w-full sm:w-auto">
                  {/* Botones delivery */}
                  {isDelivery && scope === 'available' && !assigneeId && o.status !== 'delivered' && (
                    <button
                      onClick={() => claim(o.id)}
                      className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Tomar orden
                    </button>
                  )}

                  {isDelivery && assignedToMe && o.status === 'paid' && (
                    <button
                      onClick={() => mark(o.id, 'shipped')}
                      className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Marcar shipped
                    </button>
                  )}

                  {/* Botón para abrir UI de foto (delivery asignado o owner/admin) */}
                  {((isDelivery && assignedToMe) || isOwner) && o.status === 'shipped' && !showDeliverUI && (
                    <button
                      onClick={() => setDeliverForId(o.id)}
                      className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      Marcar delivered (con foto)
                    </button>
                  )}

                  {/* Bloque de foto + notas */}
                  {showDeliverUI && (
                    <div className="border rounded p-3 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setDeliverPhoto(e.target.files?.[0] || null)}
                      />
                      <textarea
                        className="w-full border rounded p-2 text-sm"
                        placeholder="Notas (opcional)"
                        rows={2}
                        value={deliverNotes}
                        onChange={(e) => setDeliverNotes(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => markWithPhoto(o.id)}
                          disabled={sending}
                          className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {sending ? 'Enviando…' : 'Subir foto y marcar delivered'}
                        </button>
                        <button
                          onClick={() => { setDeliverForId(null); setDeliverPhoto(null); setDeliverNotes('') }}
                          className="px-3 py-2 rounded bg-gray-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Liberar (solo delivery) */}
                  {isDelivery && assignedToMe && o.status !== 'delivered' && (
                    <button
                      onClick={() => release(o.id)}
                      className="px-3 py-2 rounded bg-gray-200"
                    >
                      Liberar
                    </button>
                  )}

                  {/* Acciones owner/admin extra (sin foto) */}
                  {isOwner && o.status === 'paid' && (
                    <button
                      onClick={() => mark(o.id, 'shipped')}
                      className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Marcar shipped
                    </button>
                  )}
                  {/* Si quieres forzar foto para delivered de owner/admin, no muestres este botón:
                  {isOwner && o.status === 'shipped' && !showDeliverUI && (
                    <button
                      onClick={() => mark(o.id, 'delivered')}
                      className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      Marcar delivered (sin foto)
                    </button>
                  )} */}
                </div>
              </div>
            )
          })}
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between bg-white rounded shadow p-3">
        <div className="text-sm text-gray-600">
          Página {page} de {pages} · {total} resultados
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
