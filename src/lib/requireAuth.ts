// src/lib/requireAuth.ts
import { checkCustomerAuth } from '@/lib/auth'
import { type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export async function requireCustomerAuth(router: AppRouterInstance, locale: string) {
  const isLoggedIn = await checkCustomerAuth()
  if (isLoggedIn) return true

  // Si no está logueado, redirige al login con `next` para volver luego
  const currentUrl = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : `/${locale}`

  router.push(`/${locale}/login?next=${encodeURIComponent(currentUrl)}`)
  return false
}
