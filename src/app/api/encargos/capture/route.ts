// app/api/encargos/capture/route.ts
import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE_URL!

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-auth-token')
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  // Acepta ambos estilos
  const payload = await req.json()
  const source     = payload.source
  const externalId = payload.externalId ?? payload.external_id
  const sourceUrl  = payload.sourceUrl  ?? payload.source_url
  const title      = payload.title
  const image      = payload.image      ?? payload.image_url
  const price      = payload.price      ?? payload.price_estimate
  const currency   = payload.currency   ?? 'USD'
  const asin       = payload.asin       ?? null

  const r = await fetch(`${API}/encargos/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      source,
      external_id: externalId,
      source_url: sourceUrl,
      title,
      image_url: image,
      price_estimate: price,
      currency,
      asin, // compat Amazon; backend lo ignora si no aplica
    }),
  })

  const text = await r.text()
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: text || 'upstream_error' }, { status: r.status })
  }
  return NextResponse.json({ ok: true })
}
