// src/app/api/encargos/capture/route.ts
import { NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE_URL

// ===== Tipos =====
type CaptureIn = {
  source: 'amazon' | 'shein' | 'unknown' | string
  externalId?: string | null
  sourceUrl?: string | null
  title?: string | null
  image?: string | null
  price?: string | number | null
  currency?: string
}

type BackendCaptureIn = {
  source: string
  external_id: string | null
  source_url: string | null
  title: string | null
  image_url: string | null
  price_estimate: string | number | null
  currency: string
}

type BackendCaptureOut = {
  ok: boolean
  id?: number
  message?: string
  error?: string
}

type ApiResOk = { ok: true; id: number | null }
type ApiResErr = { ok: false; message: string }
type ApiRes = ApiResOk | ApiResErr

// mapea camelCase → snake_case para el backend
function toBackendPayload(p: Partial<CaptureIn>): BackendCaptureIn {
  return {
    source: p.source ?? 'unknown',
    external_id: p.externalId ?? null,
    source_url: p.sourceUrl ?? null,
    title: p.title ?? null,
    image_url: p.image ?? null,
    price_estimate: p.price ?? null,
    currency: p.currency ?? 'USD',
  }
}

export async function POST(req: Request) {
  if (!API) {
    const body: ApiResErr = { ok: false, message: 'API_base_missing' }
    return NextResponse.json(body, { status: 500 })
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as Partial<CaptureIn>
    // El cliente nos manda el token en 'x-auth-token'
    const token = req.headers.get('x-auth-token')

    const r = await fetch(`${API}/encargos/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(toBackendPayload(payload)),
      cache: 'no-store',
    })

    const txt = await r.text()
    let data: BackendCaptureOut | null = null
    try {
      data = txt ? (JSON.parse(txt) as BackendCaptureOut) : null
    } catch {
      data = null
    }

    if (!r.ok || !data?.ok) {
      const msg = data?.message || data?.error || txt || 'upstream_error'
      const body: ApiResErr = { ok: false, message: msg }
      return NextResponse.json(body, { status: r.status || 500 })
    }

    const body: ApiResOk = { ok: true, id: typeof data.id === 'number' ? data.id : null }
    return NextResponse.json(body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'capture_failed'
    const body: ApiResErr = { ok: false, message: msg }
    return NextResponse.json(body, { status: 500 })
  }
}
