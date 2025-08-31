'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, use } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

// límites de cliente (manténlos alineados con el backend)
const MAX_MB = Number(process.env.NEXT_PUBLIC_DELIVERY_MAX_MB ?? 6)
const ALLOWED_MIME = /^(image\/(jpe?g|png|webp|heic|heif))$/i

type DeliveryOrderShipping = {
  address?: string
  address2?: string
  city?: string
  state?: string
  zip?: string
  contact?: string
  phone?: string
}

type DeliveryOrder = {
  id: number | string
  status?: string
  shipping: DeliveryOrderShipping
}

type Draft = {
  notes?: string
  client_tx_id?: string
}

export default function DeliverPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<DeliveryOrder | null>(null)
  const [delivered, setDelivered] = useState(false)
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null) // local/remote
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const clientTxRef = useRef<string>('')
  const DRAFT_KEY = useMemo(() => `deliver:${token}`, [token])

  // Cargar orden + draft local
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await fetch(`${API_URL}/deliver/${encodeURIComponent(token)}`, { cache: 'no-store' })
        const j = await r.json().catch(() => null) as
          | { ok: true; order: DeliveryOrder; delivered?: boolean }
          | { ok: false; message?: string }
          | null

        if (!mounted) return
        if (!j || !('ok' in j) || j.ok !== true) {
          setMessage((j as { message?: string } | null)?.message || 'No se pudo cargar')
          setLoading(false)
          return
        }
        setOrder(j.order)
        setDelivered(!!j.delivered)

        // draft local
        try {
          const raw = localStorage.getItem(DRAFT_KEY)
          if (raw) {
            const d = JSON.parse(raw) as Draft
            setNotes(d.notes || '')
            clientTxRef.current = d.client_tx_id || ''
            // (foto no se rehidrata por seguridad)
          }
        } catch {}
        setLoading(false)
      } catch {
        setMessage('Error de red')
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl)
      }
    }
  }, [token, DRAFT_KEY, photoPreviewUrl])

  const persistDraft = (patch: Draft = {}) => {
    const next: Draft = {
      notes,
      client_tx_id: clientTxRef.current || '',
      ...patch,
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    } catch {}
  }

  const onSelectPhoto = (f: File | null) => {
    // limpia preview previa
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl)
    }

    if (!f) {
      setPhoto(null)
      setPhotoPreviewUrl(null)
      persistDraft({})
      return
    }

    // validaciones de cliente
    const tooBig = f.size > MAX_MB * 1024 * 1024
    const badType = !ALLOWED_MIME.test(f.type)
    if (tooBig || badType) {
      setMessage(
        tooBig
          ? `La imagen excede ${MAX_MB} MB.`
          : 'Formato no permitido. Usa JPG, PNG, WEBP o HEIC.'
      )
      setPhoto(null)
      setPhotoPreviewUrl(null)
      return
    }

    setMessage(null)
    setPhoto(f)
    setPhotoPreviewUrl(URL.createObjectURL(f))
    persistDraft({})
  }

  const removePhoto = () => {
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl)
    }
    setPhoto(null)
    setPhotoPreviewUrl(null)
  }

  const submit = async () => {
    if (delivered || sending) return
    setSending(true)
    setMessage(null)

    const clientTx = clientTxRef.current || crypto.randomUUID()
    clientTxRef.current = clientTx
    persistDraft({ client_tx_id: clientTx })

    try {
      const fd = new FormData()
      fd.append('token', token)
      fd.append('client_tx_id', clientTx)
      fd.append('notes', notes || '')
      if (photo) fd.append('photo', photo)

      const r = await fetch(`${API_URL}/deliver/confirm`, { method: 'POST', body: fd })
      const j = await r.json().catch(() => null) as
        | {
            ok: true
            already_delivered?: boolean
            photo_url?: string
            status?: string
          }
        | { ok: false; message?: string }
        | null

      if (!j || !('ok' in j) || j.ok !== true) {
        setMessage((j as { message?: string } | null)?.message || 'No se pudo confirmar. Guardado local; reintenta.')
        setSending(false)
        return
      }

      setDelivered(true)
      setMessage(j.already_delivered ? 'Esta orden ya estaba entregada.' : '¡Entrega confirmada!')

      // si el backend devuelve la URL remota de la foto, úsala
      if (j.photo_url) {
        // libera blob previo si hubiese
        if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreviewUrl)
        }
        setPhotoPreviewUrl(j.photo_url)
      }

      // refresca estado local de la orden
      setOrder((o) => (o ? { ...o, status: j.status || 'delivered' } : o))

      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {}
    } catch {
      setMessage('Sin conexión. Guardado local; reintenta cuando vuelvas a tener internet.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="p-6">Cargando…</div>
  if (!order) return <div className="p-6">{message || 'No disponible'}</div>

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Confirmar entrega</h1>

      {delivered ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded space-y-2">
          <div>Orden marcada como entregada.</div>
          {photoPreviewUrl && (
            <div>
              <div className="text-sm font-medium mb-1">Comprobante de entrega</div>
              <a
                href={photoPreviewUrl}
                target="_blank"
                rel="noreferrer"
                title="Ver foto a tamaño completo"
                className="block"
              >
                <img
                  src={photoPreviewUrl}
                  alt={`Foto de entrega #${order.id}`}
                  className="w-full h-40 object-cover rounded border"
                />
              </a>
            </div>
          )}
        </div>
      ) : null}

      <div className="bg-white border rounded p-3">
        <div className="text-sm text-gray-600">Orden #{order.id}</div>
        <div className="mt-1">
          <div className="font-medium">Dirección</div>
          <div className="text-sm text-gray-800">
            {order.shipping.address}{' '}
            {order.shipping.address2 ? `, ${order.shipping.address2}` : ''}
            {order.shipping.city ? `, ${order.shipping.city}` : ''}
            {order.shipping.state ? `, ${order.shipping.state}` : ''}
            {order.shipping.zip ? ` ${order.shipping.zip}` : ''}
          </div>
          {order.shipping.contact && (
            <div className="text-sm text-gray-700 mt-1">
              Contacto: {order.shipping.contact}{' '}
              {order.shipping.phone ? `· ${order.shipping.phone}` : ''}
            </div>
          )}
        </div>
      </div>

      {!delivered && (
        <>
          <div className="bg-gray-50 border rounded p-3 space-y-2">
            <label className="block text-sm font-medium">Notas (opcional)</label>
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                persistDraft({ notes: e.target.value })
              }}
              placeholder="Ej: Portón verde, dejó el paquete con el vecino."
            />

            <div className="mt-2">
              <label className="block text-sm font-medium">Foto de evidencia (opcional)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => onSelectPhoto(e.target.files?.[0] || null)}
              />
              {photoPreviewUrl && (
                <div className="mt-2">
                  <img
                    src={photoPreviewUrl}
                    alt="Vista previa"
                    className="w-full h-40 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="mt-2 text-xs text-gray-700 underline underline-offset-2"
                  >
                    Quitar foto
                  </button>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Formatos: JPG/PNG/WEBP/HEIC, máx. {MAX_MB} MB.
              </div>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={sending}
            className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 disabled:opacity-60"
          >
            {sending ? 'Enviando…' : 'Confirmar entrega'}
          </button>

          {message && <div className="text-sm text-gray-700">{message}</div>}
        </>
      )}
    </div>
  )
}
