// components/Navbar.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import CartIcon from '@/components/CartIcon'

export default function Navbar() {
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'es'

  return (
    <header
      id="navbar"
      className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-12 lg:px-20 py-4 bg-white shadow"
    >
      <div className="flex items-center gap-2">
        <Link href={`/${locale}`}>
          <Image
            src="/ctelogo.png"
            alt="CTEnvios Logo"
            width={40}
            height={40}
            className="rounded cursor-pointer"
          />
        </Link>
        <span className="text-xl font-bold text-gray-800 cursor-default">CTEnvios Online</span>
      </div>
      <div className="flex items-center gap-6">
        <LanguageSwitcher />
        <CartIcon />
      </div>
    </header>
  )
}
