'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  // Segmento inicial si existe (p.ej. /en/..., /es/...)
  const segments = pathname.split('/').filter(Boolean)
  const isLocale = (s: string | undefined) => s === 'en' || s === 'es'
  const currentLocale = isLocale(segments[0]) ? (segments[0] as 'en' | 'es') : 'en'
  const otherLocale = currentLocale === 'en' ? 'es' : 'en'

  // Base path sin el prefijo de locale para reconstruir la URL
  const basePath = isLocale(segments[0]) ? `/${segments.slice(1).join('/')}` : pathname

  const handleChange = () => {
    const tail = basePath === '/' ? '' : basePath
    router.push(`/${otherLocale}${tail}`)
  }

  return (
    <button
      onClick={handleChange}
      title={otherLocale.toUpperCase()}
      aria-label={`Switch language to ${otherLocale.toUpperCase()}`}
      className="inline-flex items-center gap-1.5 rounded-lg px-0 py-1 text-sm font-semibold text-white hover:bg-green-50 lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0 lg:text-sm lg:hover:bg-transparent lg:hover:text-green-600"
    >
      <Globe className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      <span className="tracking-wide">{otherLocale.toUpperCase()}</span>
    </button>
  )
}
