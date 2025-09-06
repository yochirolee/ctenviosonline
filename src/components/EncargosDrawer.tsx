'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Trash, X } from 'lucide-react'
import { toast } from 'sonner'
import { useParams, useRouter } from 'next/navigation'
import type { Dict } from '@/types/Dict'
import type { EncargosChangedDetail } from '@/types/encargos-events'
import {
  encargosListMine,
  encargosRemove,
  type EncargoItem,
} from '@/lib/api'

type Props = { dict: Dict }

export function openEncargosDrawer() {
  try {
    window.dispatchEvent(new CustomEvent('encargos:open'))
  } catch { }
}

export default function EncargosDrawer({ dict }: Props) {
  const { locale = 'es' } = (useParams() as { locale?: string }) || {}
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<EncargoItem[]>([])
  const [removingIds, setRemovingIds] = useState<number[]>([])

  // Abrir/cerrar por evento global
  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onClose = () => setOpen(false)
    window.addEventListener('encargos:open', onOpen as EventListener)
    window.addEventListener('encargos:close', onClose as EventListener)
    return () => {
      window.removeEventListener('encargos:open', onOpen as EventListener)
      window.removeEventListener('encargos:close', onClose as EventListener)
    }
  }, [])

  // 🔒 Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevPos = document.body.style.position
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.position = prevPos
    }
  }, [open])

  // Cargar encargos
  async function refresh() {
    try {
      setLoading(true)
      const data = await encargosListMine()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    refresh()
  }, [open])

  function sourceLabel(s?: string) {
    if (s === 'amazon') return 'Amazon'
    if (s === 'shein') return 'SHEIN'
    return 'Externo'
  }

  function fmt(n: number, currency: string = 'USD') {
    return new Intl.NumberFormat(locale || 'es', { style: 'currency', currency }).format(n)
  }

  function parsePrice(raw: string | number | null | undefined): number | null {
    if (raw == null) return null
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
    const s = String(raw).trim()
    if (!s) return null
    const n1 = Number(s.replace(/[^\d.-]/g, ''))
    if (Number.isFinite(n1)) return n1
    const n2 = Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
    return Number.isFinite(n2) ? n2 : null
  }

  const subtotal = useMemo(() => {
    const sum = items.reduce((acc, it) => acc + (parsePrice(it.price_estimate) || 0), 0)
    return Math.max(0, sum)
  }, [items])

  const handleRemoveOne = async (id: number) => {
    try {
      setRemovingIds(prev => [...prev, id])
      await encargosRemove(id)
      setItems(prev => prev.filter(x => x.id !== id))
      toast.success('Eliminado del listado de encargos.')

      window.dispatchEvent(
        new CustomEvent<EncargosChangedDetail>('encargos:changed', {
          detail: { type: 'removed', id },
        })
      )
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar.'
      toast.error(msg)
    } finally {
      setRemovingIds(prev => prev.filter(x => x !== id))
    }
  }

  const goCheckout = () => {
    setOpen(false)
    router.push(`/${locale}/encargos/checkout`)
  }

  const continueShopping = () => {
    setOpen(false)
    // opcional: focus en algo o scroll
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-[60] transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-[61] transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* ⬇️ Estructura en columna: header + contenido scroll + footer */}
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header (sticky) */}
          <div className="shrink-0 flex items-center justify-between border-b p-4 bg-white">
            <h3 className="text-lg font-semibold">
              {dict?.encargos?.drawer_title ?? 'Mis encargos'}
            </h3>
            <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-gray-100" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          {/* Lista (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <p className="text-sm text-gray-500">{dict?.common?.loading ?? 'Cargando…'}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-500">
                {dict?.encargos?.empty ?? 'No tienes encargos aún.'}
              </p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {items.map((it) => {
                  const amount = parsePrice(it.price_estimate)
                  const money = amount != null ? fmt(amount, String(it.currency || 'USD')) : '—'
                  const removing = removingIds.includes(it.id)

                  return (
                    <li key={it.id} className="flex py-4">
                      {/* Thumb (como en carrito) */}
                      <div className="w-24 h-24 overflow-hidden rounded-md border border-gray-200 bg-white flex-shrink-0">
                        {it.image_url ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={it.image_url}
                              alt={it.title ?? 'Producto'}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full grid place-items-center text-gray-400 text-xs">
                            Sin imagen
                          </div>
                        )}
                      </div>

                      {/* Texto */}
                      <div className="ml-4 flex flex-1 min-w-0 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="pr-2 text-base font-medium leading-snug break-words line-clamp-2 text-gray-900">
                            {it.title || 'Sin título'}
                          </h3>
                          <p className="shrink-0 whitespace-nowrap text-base font-medium text-gray-900">
                            {money}
                          </p>
                        </div>

                        <div className="mt-1 text-[11px] text-gray-500">
                          {sourceLabel(it.source)} {it.external_id ? `· ID: ${it.external_id}` : ''}
                        </div>

                        <div className="mt-2">
                          <button
                            disabled={removing}
                            onClick={() => handleRemoveOne(it.id)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            title="Eliminar"
                          >
                            <Trash size={14} />
                            {removing ? 'Eliminando…' : 'Eliminar'}
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>


          {/* Footer (sticky bottom) */}
          <div className="shrink-0 border-t p-4 bg-white">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">{fmt(subtotal)}</span>
            </div>

            <div className="mt-2">
              <button
                onClick={goCheckout}
                disabled={items.length === 0}
                className="w-full flex items-center justify-center rounded-md bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {dict?.encargos?.proceed_to_checkout ?? 'Proceder al pago'}
              </button>
            </div>

            <div className="mt-2 flex justify-center text-sm text-gray-500">
              <button
                onClick={continueShopping}
                className="font-medium text-green-600 hover:text-green-500"
              >
                {dict?.cart?.continue ?? 'Continuar comprando'} →
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
