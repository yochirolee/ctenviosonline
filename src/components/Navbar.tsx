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

  const ordersFull =
    dict.common?.orders ?? (locale === 'en' ? 'My orders' : 'Mis pedidos')
  // etiqueta corta para móvil (evita salto de línea)
  const ordersShort = locale === 'en' ? 'Orders' : 'Pedidos'

  const isOrders = pathname?.includes('/orders')
  const role = customer?.metadata?.role

  // Links compactos + no wrap
  const navLinkBase =
    'inline-flex items-center whitespace-nowrap leading-none px-1 py-1 text-sm font-medium text-gray-800 hover:text-green-600 ' +
    'lg:px-2 lg:py-1'
  // Activo solo en negrita (sin color de fondo)
  const navLinkActive = 'font-bold text-gray-900 hover:text-gray-900'

  return (
    <header
      id="navbar"
      className="sticky top-0 z-50 flex items-center px-6 md:px-16 lg:px-24 py-3 bg-white shadow"
    >
      {/* Izquierda: Logo */}
      <Link
        href={`/${locale}`}
        aria-label="Ir al inicio"
        className="flex items-center gap-3"
      >
        <Image
          src="/ctelogo.png"
          alt="CTEnvios Logo"
          width={56}
          height={56}
          className="w-12 h-12 lg:w-14 lg:h-14 object-contain rounded cursor-pointer"
        />
        <span className="hidden lg:inline text-lg font-bold text-gray-800 cursor-default">
          CTEnvios Online
        </span>
      </Link>

      {/* Derecha: empujado con ml-auto */}
      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        {!loading && customer && (
          // Cluster de links MUY compacto
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href={`/${locale}/orders`}
              className={`${navLinkBase} ${isOrders ? navLinkActive : ''}`}
              aria-current={isOrders ? 'page' : undefined}
            >
              {/* corto en móvil, completo en sm+ */}
              <span className="sm:hidden">{ordersShort}</span>
              <span className="hidden sm:inline">{ordersFull}</span>
            </Link>

            {(role === 'owner' || role === 'admin') && (
              <Link href={`/${locale}/admin`} className={navLinkBase}>
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            {(role === 'owner' || role === 'delivery') && (
              <Link href={`/${locale}/partner/orders`} className={navLinkBase}>
                {/* etiqueta corta en móvil para ahorrar espacio */}
                <span className="sm:hidden">{locale === 'en' ? 'Partner' : 'Partner'}</span>
                <span className="hidden sm:inline">Partner Orders</span>
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
