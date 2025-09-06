import { NextRequest, NextResponse } from 'next/server'
const API = process.env.NEXT_PUBLIC_API_BASE_URL!

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-auth-token')
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const r = await fetch(`${API}/encargos/mine`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  const text = await r.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch {}

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: data?.message || text || 'upstream_error' }, { status: r.status })
  }
  return NextResponse.json(data)
}
