import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE_URL!

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ ok: false, error: 'url_required' }, { status: 400 })

  // Proxy directo a tu backend genérico /encargos/resolve
  const r = await fetch(`${API}/encargos/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  const text = await r.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch {}

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: data?.error || text || 'upstream_error' }, { status: r.status })
  }
  return NextResponse.json(data)
}
