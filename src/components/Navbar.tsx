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
    'block rounded-lg px-3 py-2 text-base font-semibold text-gray-800 hover:bg-green-50 ' +
    'lg:px-0 lg:py-0 lg:rounded-none lg:bg-transparent lg:text-sm lg:text-gray-800 ' +
    'lg:hover:bg-transparent lg:hover:text-green-300'

  const navLinkActive =
    'text-white bg-green-600 hover:bg-green-700 rounded-lg lg:rounded-none'

  return (
    <header
      id="navbar"
      className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-12 lg:px-20 py-3 bg-white shadow"
    >
      {/* Logo + brand */}
      <div className="flex items-center gap-2">
        <Link
          href={`/${locale}`}
          aria-label="Ir al inicio"
          className="flex items-center gap-2"
        >
          <div className="relative w-10 h-10">
            <Image
              src="/ctelogo.png"
              alt="CTEnvios Logo"
              fill
              sizes="(max-width: 640px) 32px, (max-width: 1024px) 40px, 48px"
              className="object-contain rounded cursor-pointer"
            />
          </div>
          <span className="hidden sm:inline text-lg font-bold text-gray-800 cursor-default">
            CTEnvios Online
          </span>
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {!loading && customer && (
          <>
            {/* Mis pedidos - ahora con el mismo estilo base; mantiene estado activo */}
            <Link
              href={`/${locale}/orders`}
              className={`${navLinkBase} ${isOrders ? navLinkActive : ''}`}
              aria-current={isOrders ? 'page' : undefined}
            >
              {ordersLabel}
            </Link>

            {/* Admin: owner o admin */}
            {(role === 'owner' || role === 'admin') && (
              <Link href={`/${locale}/admin`} className={navLinkBase}>
                Admin
              </Link>
            )}

            {/* Partner Orders: owner o delivery */}
            {(role === 'owner' || role === 'delivery') && (
              <Link href={`/${locale}/partner/orders`} className={navLinkBase}>
                Partner Orders
              </Link>
            )}
          </>
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
