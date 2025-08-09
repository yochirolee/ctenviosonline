'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import CartIcon from '@/components/CartIcon'
import { useCustomer } from '@/context/CustomerContext'
import type { Dict } from '@/types/Dict'
import ConfirmLogoutButton from '@/components/ConfirmLogoutButton'

type Props = {
  dict: Dict
}

export default function Navbar({ dict }: Props) {
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'es'
  const { customer, loading, logout } = useCustomer()

  return (
    <header
      id="navbar"
      className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-12 lg:px-20 py-4 bg-white shadow"
    >
      <div className="flex items-center gap-2">
        <Link href={`/${locale}`} aria-label="Ir al inicio">
          <Image
            src="/ctelogo.png"
            alt="CTEnvios Logo"
            className="h-10 w-auto rounded cursor-pointer"
            width={0}
            height={0}
            sizes="40px"
          />
        </Link>
        <span className="text-xl font-bold text-gray-800 cursor-default">
          CTEnvios Online
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-4 max-sm:gap-x-2 max-sm:gap-y-1 justify-end">
        <LanguageSwitcher />
        <CartIcon />

        {!loading && customer ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-green-700">
              {dict.common.greeting} {customer.first_name || customer.email}
            </span>
           <ConfirmLogoutButton logout={logout} dict={dict} />
          </div>
        ) : (
          <Link
            href={`/${locale}/login`}
            className="text-sm font-medium text-gray-700 hover:text-green-600 transition"
          >
            {dict.common.login}
          </Link>
        )}
      </div>
    </header>
  )
}
