'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminTabs() {
  const pathname = usePathname()
  const parts = pathname?.split('/') ?? []
  const locale = parts[1] || 'es'
  const base = `/${locale}/admin`
  const basepartner = `/${locale}`

  const tabs = [
    { href: `${base}/categories`, label: 'Categorías' },
    { href: `${base}/settings/shipping`, label: 'Owners y Envios' },
    { href: `${base}/products`, label: 'Productos' },
    { href: `${base}/orders`, label: 'Órdenes' },
    { href: `${basepartner}/partner/orders`, label: 'Partners' },
    { href: `${base}/customers`, label: 'Clientes' },
  ]

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
      {tabs.map(t => {
        const active = pathname?.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${active ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
