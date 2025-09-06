import { NextRequest, NextResponse } from 'next/server'
const API = process.env.NEXT_PUBLIC_API_BASE_URL!

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-auth-token')
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const payload = await req.json().catch(() => ({}))
  const r = await fetch(`${API}/encargos/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await r.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch {}

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: data?.message || text || 'upstream_error' }, { status: r.status })
  }
  return NextResponse.json(data)
}
