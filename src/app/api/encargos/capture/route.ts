import { NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE_URL

// mapea camelCase → snake_case para el backend
function toBackendPayload(p: any) {
  return {
    source: p.source,
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
    return NextResponse.json({ ok: false, message: 'API_base_missing' }, { status: 500 })
  }

  try {
    const payload = await req.json().catch(() => ({}))
    const token = req.headers.get('x-auth-token') // viene del cliente

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
    let data: any = null
    try { data = txt ? JSON.parse(txt) : null } catch {}

    if (!r.ok || !data?.ok) {
      const msg = data?.message || data?.error || txt || 'upstream_error'
      return NextResponse.json({ ok: false, message: msg }, { status: r.status || 500 })
    }

    return NextResponse.json({ ok: true, id: data.id ?? null })
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'capture_failed' },
      { status: 500 },
    )
  }
}
