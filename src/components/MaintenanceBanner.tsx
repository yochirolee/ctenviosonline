'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!
type Mode = 'off' | 'admin_only' | 'full'

export default function MaintenanceBanner() {
  const { locale } = useParams() as { locale: 'es' | 'en' }
  const [mode, setMode] = useState<Mode>('off')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const r = await fetch(`${API_URL}/health`, { cache: 'no-store' })
          const j = await r.json().catch(() => ({}))
          const m = (j?.maintenance?.mode as Mode) || 'off'
          if (!cancelled) setMode(m)

          // Si hay mantenimiento y el usuario está logueado, preguntamos si es admin
          if (m !== 'off') {
            const token = localStorage.getItem('token')
            if (!token) return
            const r2 = await fetch(`${API_URL}/customers/me`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            const me = await r2.json().catch(() => null)
            const role = me?.metadata?.role || me?.role
            if (!cancelled) setIsAdmin(role === 'admin')
          }
        } catch { /* noop */ }
      })()
    return () => { cancelled = true }
  }, [])

  if (mode === 'off') return null

  const msg =
    mode === 'full'
      ? (locale === 'en'
        ? 'We’re performing maintenance. Some features are temporarily unavailable.'
        : 'Estamos en mantenimiento. Algunas funciones no están disponibles.')
      : (isAdmin
        ? (locale === 'en'
          ? 'Maintenance: you can keep working.'
          : 'Mantenimiento: puedes seguir trabajando.')
        : (locale === 'en'
          ? 'Maintenance: the store is temporarily closed to the public.'
          : 'Mantenimiento: la tienda está temporalmente cerrada al público.'))

  return (
    <div className="mt-3 mx-1 sm:mx-0 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 via-orange-50 to-orange-100/50 px-4 py-3 sm:px-6 shadow-md">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 ring-1 ring-amber-200">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <div className="text-sm text-amber-900 leading-relaxed">{msg}</div>
      </div>
    </div>
  )
}
