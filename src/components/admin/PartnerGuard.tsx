'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMe } from '@/lib/adminApi'

export default function PartnerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const didNav = useRef(false)

  useEffect(() => {
    let cancelled = false
    const goHome = () => {
      if (!didNav.current) { didNav.current = true; router.replace(locale ? `/${locale}` : '/') }
    }

    const check = async () => {
      try {
        const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!t) { setAllowed(false); return goHome() }
        const me = await getMe().catch(() => null)
        const role = me?.metadata?.role
        const ok = role === 'owner' || role === 'delivery' || role === 'admin'
        if (!cancelled) ok ? setAllowed(true) : (setAllowed(false), goHome())
      } catch { if (!cancelled) { setAllowed(false); goHome() } }
    }
    check()
    return () => { cancelled = true }
  }, [router, locale])

  if (allowed !== true) return null
  return <>{children}</>
}
