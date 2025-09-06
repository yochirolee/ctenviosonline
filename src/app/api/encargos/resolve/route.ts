// src/app/api/encargos/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE_URL!

// ===== Tipos mínimos =====
type ResolveIn = { url: string }

type BackendResolveOut = {
  ok: boolean
  finalUrl?: string
  external_id?: string | null
  asin?: string | null
  title?: string | null
  image?: string | null
  image_url?: string | null
  price?: string | number | null
  price_estimate?: string | number | null
  currency?: string
  compare_at_price?: string | number | null
  source?: string | null
  error?: string
  message?: string
}

type ApiOut =
  | {
      ok: true
      finalUrl: string
      external_id: string | null
      asin: string | null
      title: string | null
      image: string | null
      price: string | number | null
      currency: string
      compare_at_price: string | number | null
      source: string | null
    }
  | { ok: false; error: string }

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ResolveIn>
    const url = typeof body.url === 'string' ? body.url : undefined
    if (!url) {
      const out: ApiOut = { ok: false, error: 'url_required' }
      return NextResponse.json(out, { status: 400 })
    }

    // Reenvía al backend
    const r = await fetch(`${API}/encargos/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      cache: 'no-store',
    })

    const text = await r.text()
    let data: BackendResolveOut | null = null
    try {
      data = text ? (JSON.parse(text) as BackendResolveOut) : null
    } catch {
      data = null
    }

    if (!r.ok || !data) {
      const out: ApiOut = { ok: false, error: (data?.error || text || 'upstream_error') }
      return NextResponse.json(out, { status: r.status || 502 })
    }

    // Normaliza campos de salida
    const payload: ApiOut = {
      ok: true,
      finalUrl: data.finalUrl || url,
      external_id: data.external_id ?? data.asin ?? null,
      asin: data.asin ?? null,
      title: data.title ?? null,
      image: (data.image as string | null) ?? (data.image_url as string | null) ?? null,
      price: (data.price as string | number | null) ?? (data.price_estimate as string | number | null) ?? null,
      currency: data.currency ?? 'USD',
      compare_at_price: (data.compare_at_price as string | number | null) ?? null,
      source: (data.source as string | null) ?? null,
    }

    return NextResponse.json(payload, { status: 200 })
  } catch {
    const out: ApiOut = { ok: false, error: 'resolve_proxy_failed' }
    return NextResponse.json(out, { status: 500 })
  }
}
