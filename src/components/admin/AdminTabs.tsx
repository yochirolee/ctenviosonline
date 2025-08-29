'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminTabs() {
  const pathname = usePathname()
  const parts = pathname?.split('/') ?? []
  const locale = parts[1] || 'es'
  const base = `/${locale}/admin`

  const tabs = [
    
    { href: `${base}/products`, label: 'Productos' },
    { href: `${base}/categories`, label: 'Categorías' },
    { href: `${base}/orders`, label: 'Órdenes' },
    { href: `${base}/settings/shipping`, label: 'Owners y Envios' },
    { href: `${base}/customers`, label: 'Clientes' },
  ]

  return (
    <div className="flex gap-2 mb-4">
      {tabs.map(t => {
        const active = pathname?.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-1 rounded ${active ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
