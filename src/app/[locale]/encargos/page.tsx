'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Trash, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import type { EncargoItem } from '@/lib/api'
import { encargosListMine, encargosRemove } from '@/lib/api'
import { requireCustomerAuth } from '@/lib/requireAuth'

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

function sourceLabel(s?: string): string {
  if (s === 'amazon') return 'Amazon'
  if (s === 'shein') return 'SHEIN'
  return 'Externo'
}

function viewText(s?: string): string {
  if (s === 'amazon') return 'Ver en Amazon'
  if (s === 'shein') return 'Ver en SHEIN'
  return 'Ver producto'
}

export default function EncargosPage() {
  const router = useRouter()
  const { locale } = useParams() as { locale: string }

  const [items, setItems] = useState<EncargoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const ok = await requireCustomerAuth(router, locale)
      if (!ok) return
      try {
        setLoading(true)
        const data = await encargosListMine()
        setItems(Array.isArray(data) ? data : [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = useMemo(() => {
    const sum = (items || []).reduce((acc, it) => acc + (parsePrice(it.price_estimate) || 0), 0)
    return new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: 'USD' }).format(sum)
  }, [items, locale])

  const handleRemove = async (id: number) => {
    try {
      await encargosRemove(id)
      setItems(prev => prev.filter(x => x.id !== id))
      toast.success('Eliminado del listado de encargos.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo eliminar.'
      toast.error(message)
    }
  }

  const goCheckout = () => {
    router.push(`/${locale}/encargos/checkout`)
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Mis encargos</h1>
        {items.length > 0 && (
          <div className="text-sm text-gray-600">
            Total estimado: <span className="font-semibold">{total}</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-600">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-600">No tienes encargos aún.</p>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((it) => {
              const amount = parsePrice(it.price_estimate)
              const currency = (it.currency ?? 'USD') as string
              const money = amount != null
                ? new Intl.NumberFormat(locale || 'es', {
                    style: 'currency',
                    currency,
                  }).format(amount)
                : '—'

              return (
                <article key={it.id} className="rounded border shadow-sm p-3 flex gap-3 bg-white">
                  <div className="relative w-24 h-24 bg-white flex-shrink-0">
                    {it.image_url ? (
                      <Image
                        src={it.image_url}
                        alt={it.title ?? 'Producto'}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-gray-400 text-xs">Sin imagen</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header: badge + id externo */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {sourceLabel(it.source)}
                      </span>
                      {it.external_id && (
                        <span className="text-[11px] text-gray-500">ID: {it.external_id}</span>
                      )}
                      {it.asin && it.source === 'amazon' && (
                        <span className="text-[11px] text-gray-500">ASIN: {it.asin}</span>
                      )}
                    </div>

                    <div className="text-sm font-semibold line-clamp-2 mt-1">
                      {it.title || 'Sin título'}
                    </div>

                    <div className="text-sm text-green-700 font-bold mt-1">
                      {money}
                    </div>

                    <div className="mt-1 flex items-center gap-3">
                      {it.source_url && (
                        <a
                          className="text-xs text-blue-700 hover:underline"
                          href={it.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {viewText(it.source)}
                        </a>
                      )}
                      <button
                        onClick={() => handleRemove(it.id)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-gray-50"
                        title="Eliminar"
                      >
                        <Trash size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-6">
            <button
              onClick={goCheckout}
              className="rounded bg-green-600 px-4 py-2 text-white text-sm inline-flex items-center gap-2"
            >
              <CreditCard size={16} />
              Ir al checkout
            </button>
          </div>
        </>
      )}
    </main>
  )
}
