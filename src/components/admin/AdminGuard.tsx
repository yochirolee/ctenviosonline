'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMe } from '@/lib/adminApi' // debe devolver 200 con { metadata: { role } } o lanzar/retornar null

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const didNav = useRef(false)

  useEffect(() => {
    let cancelled = false

    const goHomeSilently = () => {
      if (!didNav.current) {
        didNav.current = true
        router.replace(locale ? `/${locale}` : '/')
      }
    }

    const check = async () => {
      try {
        // 1) Si no hay token, fuera sin pistas
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          if (!cancelled) setAllowed(false)
          return goHomeSilently()
        }

        // 2) Verifica rol
        const me = await getMe().catch(() => null)
        const role = me?.metadata?.role
        const isAdmin = role === 'admin'

        if (cancelled) return
        if (!isAdmin) {
          setAllowed(false)
          return goHomeSilently()
        }

        setAllowed(true)
      } catch {
        if (!cancelled) {
          setAllowed(false)
          goHomeSilently()
        }
      }
    }

    check()
    return () => { cancelled = true }
  }, [router, locale])

  // Mientras valida o si no es admin: no renderiza nada (sin loaders ni textos)
  if (allowed !== true) return null

  // Solo admin ve el contenido
  return <>{children}</>
}
