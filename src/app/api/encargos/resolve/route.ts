import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE_URL!

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json().catch(() => ({} as any))
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ ok: false, error: 'url_required' }, { status: 400 })
    }

    // Reenvía al backend
    const r = await fetch(`${API}/encargos/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      // no-store para evitar cachear resoluciones
      cache: 'no-store',
    })

    const text = await r.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = null }

    if (!r.ok || !data) {
      return NextResponse.json(
        { ok: false, error: (data?.error || text || 'upstream_error') },
        { status: r.status || 502 }
      )
    }

    // Normaliza campos de salida
    // - finalUrl: URL final tras redirecciones (ej: a.co → amazon.com/dp/ASIN)
    // - external_id: ASIN u otro ID (si el backend devuelve 'asin', lo mapeamos)
    // - title, image, price, currency (si existe)
    const payload = {
      ok: true,
      finalUrl: data.finalUrl || url,
      external_id: data.external_id || data.asin || null,
      asin: data.asin ?? null, // compat si quieres usarlo en Amazon
      title: data.title ?? null,
      image: data.image ?? data.image_url ?? null,
      price: data.price ?? data.price_estimate ?? null,
      currency: data.currency ?? 'USD',
      compare_at_price: data.compare_at_price ?? null,  // <-- añade
      // opcional: fuente detectada si tu backend la envía
      source: data.source || null,
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'resolve_proxy_failed' }, { status: 500 })
  }
}
