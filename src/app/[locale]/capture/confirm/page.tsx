'use client'

import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { requireCustomerAuth } from '@/lib/requireAuth'
import { encargosCapture } from '@/lib/api'
import { ExternalLink, PencilLine } from 'lucide-react'
import { Info } from 'lucide-react'
import BackButton from '@/components/BackButton'


/* --- helpers --- */
function fmtPrice(raw: string | null | undefined) {
  if (!raw) return ''
  if (/^\s*[$€£]/.test(raw)) return raw.trim()
  const n = Number(String(raw).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3,})/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return String(raw)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function detectSource(host: string): 'amazon' | 'shein' | 'unknown' {
  const h = host.toLowerCase()
  if (h.includes('amazon.')) return 'amazon'
  if (h.includes('shein.') || h.includes('ltwebstatic.com') || h.includes('img.shein.com')) return 'shein'
  return 'unknown'
}

export default function ConfirmCapture() {
  const sp = useSearchParams()
  const router = useRouter()
  const { locale } = useParams() as { locale: string }

  const idParam = sp.get('id')
  const back = sp.get('back') || ''

  const sourceUrl = useMemo(() => {
    try { return decodeURIComponent(back) } catch { return '' }
  }, [back])

  const initialHost = useMemo(() => {
    try { return new URL(sourceUrl).hostname.replace(/^www\./, '') } catch { return '' }
  }, [sourceUrl])

  const [resolvedHost, setResolvedHost] = useState<string>(initialHost)
  const hostname = resolvedHost || initialHost
  const source = useMemo(() => detectSource(hostname || 'amazon.com'), [hostname])

  const vendorLabel = useMemo(() => {
    if (source === 'amazon') return 'Amazon'
    if (source === 'shein') return 'SHEIN'
    return (hostname || 'la tienda')
  }, [source, hostname])

  const [externalId, setExternalId] = useState<string | null>(idParam)
  const [title, setTitle] = useState('')
  const [image, setImage] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // Colores “marca Amazon” suaves
  const AMAZON_BG_TOP = '#2F3F52'
  const AMAZON_BG_BOTTOM = '#3F5168'
  const AMAZON_YELLOW = '#FFD814' // botón principal

  /* --- intentar resolver metadatos si no vinieron --- */
  useEffect(() => {
    const needsResolve = !externalId && !!sourceUrl
    if (!needsResolve) return
      ; (async () => {
        try {
          setLoading(true)
          const r = await fetch('/api/encargos/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: sourceUrl }),
          })
          const data = await r.json().catch(() => null)
          if (data?.ok) {
            try {
              const h = new URL(data.finalUrl || sourceUrl).hostname.replace(/^www\./, '')
              setResolvedHost(h)
            } catch { }
            if (data.external_id && !externalId) setExternalId(data.external_id)
            if (data.title && !title) setTitle(data.title)
            if (data.image && !image) setImage(data.image)
            if (data.price && !price) setPrice(String(data.price))
          }
        } finally {
          setLoading(false)
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalId, sourceUrl])

  /* --- guardar --- */
  const save = async () => {
    const ok = await requireCustomerAuth(router, locale)
    if (!ok) return

    const body = {
      source,
      externalId: externalId,
      sourceUrl: sourceUrl || null,
      title: title || null,
      image: image || null,
      price: price || null,
      currency: 'USD',
    }

    try {
      await encargosCapture(body)
      // notificar otros componentes e abrir drawer
      try { window.dispatchEvent(new CustomEvent('encargos:changed', { detail: { type: 'updated' } })) } catch { }
      try { window.dispatchEvent(new CustomEvent('encargos:open')) } catch { }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar el encargo.'
      alert(msg)
    }
  }


  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
      <BackButton
        label={locale === 'en' ? 'Back' : 'Atrás'}
        fallbackHref={`/${locale}/amazon`}
      />
      {/* Tarjeta principal */}
      <article className="rounded-2xl overflow-hidden border shadow-sm bg-white">
        {/* Franja superior con color Amazon y logo a la derecha en desktop */}
        <div
          className="relative"
          style={{ background: `linear-gradient(180deg, ${AMAZON_BG_TOP} 0%, ${AMAZON_BG_BOTTOM} 100%)` }}
        >
          <div
            className="
              pointer-events-none
              hidden lg:block
              absolute inset-y-0 right-0 w-2/5
              bg-right bg-no-repeat bg-contain opacity-20
            "
            style={{
              backgroundImage:
                "url('https://res.cloudinary.com/dz6nhejdd/image/upload/v1757163390/amazon_PNG13_eyld8b.png')",
            }}
            aria-hidden="true"
          />
          <div className="relative p-5 md:p-6">
            <h1 className="text-xl md:text-2xl font-bold text-white">Confirmar producto</h1>
            <p className="text-white/90 text-sm mt-0.5">
              {vendorLabel ? `Fuente: ${vendorLabel}` : 'Fuente desconocida'}
              {externalId ? ` · ID: ${externalId}${source === 'amazon' ? ' (ASIN)' : ''}` : ''}
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Imagen */}
            <div className="md:w-[220px] lg:w-[260px] shrink-0">
              <div className="relative w-full aspect-square rounded-lg border bg-white">
                {image ? (
                  <Image
                    src={image}
                    alt={title || 'Producto'}
                    fill
                    className="object-contain p-4"
                    sizes="260px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-gray-400">
                    Sin imagen
                  </div>
                )}
              </div>

              {/* Ver en origen */}
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <ExternalLink size={16} />
                  Ver en {vendorLabel}
                </a>
              )}
            </div>

            {/* Datos */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 line-clamp-3">
                {title || (loading ? 'Cargando…' : 'Título no disponible')}
              </h2>

              <div className="mt-2">
                <span className="inline-flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-700">{fmtPrice(price) || '—'}</span>
                  <span className="text-xs rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
                    {vendorLabel}
                  </span>
                </span>
              </div>

              {/* Acciones principales */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={save}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm border border-yellow-300"
                  style={{ backgroundColor: AMAZON_YELLOW }}
                >
                  {loading ? 'Guardando…' : 'Agregar al encargo'}
                </button>

                {/* Aviso de validación */}
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-900">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 text-emerald-700 flex-shrink-0" />
                    <p>
                      <strong>Importante:</strong> Puedes pagar ahora. Antes de comprar al proveedor verificamos la
                      <strong> disponibilidad</strong> y que el <strong>precio/peso</strong> coincidan con lo pagado.
                      Si hay diferencias relevantes (precio, variante, peso o envío), te <strong>contactaremos </strong>
                      para aprobar el cambio. Si no te conviene, podrás pedir un
                      <strong> reembolso inmediato</strong>.
                    </p>
                  </div>
                </div>



                <button
                  onClick={() => setShowEdit((s) => !s)}
                  className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
                  type="button"
                >
                  <PencilLine size={16} />
                  {showEdit ? 'Ocultar edición' : 'Editar detalles (opcional)'}
                </button>
              </div>

              {/* Edición opcional (colapsable) */}
              {showEdit && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium">Título</span>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      placeholder="Título del producto"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Precio (opcional)</span>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      placeholder="$123.45"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium">Imagen URL</span>
                    <input
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      placeholder="https://..."
                    />
                  </label>
                </div>
              )}

              {!externalId && sourceUrl && (
                <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  No se detectó ID automáticamente. Puedes continuar; el encargo guardará el enlace para revisión.
                </p>
              )}
            </div>
          </div>
        </div>
      </article>
    </main>
  )
}
