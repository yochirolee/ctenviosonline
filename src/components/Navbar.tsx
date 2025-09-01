'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import CartIcon from '@/components/CartIcon'
import { useCustomer } from '@/context/CustomerContext'
import type { Dict } from '@/types/Dict'
import ConfirmLogoutButton from '@/components/ConfirmLogoutButton'
import { LogIn, LogOut } from 'lucide-react'

type Props = { dict: Dict }

export default function Navbar({ dict }: Props) {
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'es'
  const { customer, loading, logout } = useCustomer()

  const ordersLabel =
    dict.common?.orders ?? (locale === 'en' ? 'My orders' : 'Mis pedidos')

  const isOrders = pathname?.includes('/orders')
  const role = customer?.metadata?.role

  // mismo estilo base que LanguageSwitcher (unificado para todos los links)
  const navLinkBase =
    'block rounded-lg px-2 py-2 text-sm font-semibold text-gray-800 hover:bg-green-50 ' +
    'lg:px-0 lg:py-0 lg:rounded-none lg:bg-transparent lg:text-sm lg:text-gray-800 ' +
    'lg:hover:bg-transparent lg:hover:text-green-300'

  const navLinkActive =
    'font-bold text-gray-800 hover:bg-transparent lg:font-bold lg:text-gray-800 lg:hover:bg-transparent lg:hover:text-green-50'


  return (
    <header
      id="navbar"
      className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-16 lg:px-24 py-3 bg-white shadow"
    >
      {/* Logo + brand */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}`}
          aria-label="Ir al inicio"
          className="flex items-center gap-4"
        >
          <div className="relative w-12 h-12 lg:w-14 lg:h-14">
            <Image
              src="/ctelogo.png"
              alt="CTEnvios Logo"
              width={56}
              height={56}
              className="w-12 h-12 lg:w-14 lg:h-14 object-contain rounded cursor-pointer"
            />
          </div>
          <span className="hidden sm:inline text-lg font-bold text-gray-800 cursor-default">
            CTEnvios Online
          </span>
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 sm:gap-4">
        {!loading && customer && (
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* Mis pedidos */}
            <Link
              href={`/${locale}/orders`}
              className={`${navLinkBase} ${isOrders ? navLinkActive : ''}`}
              aria-current={isOrders ? 'page' : undefined}
            >
              {ordersLabel}
            </Link>

            {/* Admin */}
            {(role === 'owner' || role === 'admin') && (
              <Link href={`/${locale}/admin`} className={navLinkBase}>
                Admin
              </Link>
            )}

            {/* Partner Orders */}
            {(role === 'owner' || role === 'delivery') && (
              <Link href={`/${locale}/partner/orders`} className={navLinkBase}>
                Partner Orders
              </Link>
            )}
          </nav>
        )}

        <LanguageSwitcher />
        <CartIcon />

        {!loading && customer ? (
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <LogOut className="h-5 w-5 text-gray-700" aria-hidden="true" />
            </div>
            <div className="absolute inset-0 opacity-0">
              <ConfirmLogoutButton logout={logout} dict={dict} />
            </div>
          </div>
        ) : (
          <Link
            href={`/${locale}/login`}
            className="p-2 rounded hover:bg-gray-100 transition"
            aria-label={dict.common.login}
            title={dict.common.login}
          >
            <LogIn className="h-5 w-5 text-gray-700" />
          </Link>
        )}
      </div>
    </header>
  )
}
