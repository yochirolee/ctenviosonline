'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import CartIcon from '@/components/CartIcon'
import { useCustomer } from '@/context/CustomerContext'
import type { Dict } from '@/types/Dict'
import ConfirmLogoutButton from '@/components/ConfirmLogoutButton'
import { LogIn, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

type Props = { dict: Dict }

export default function Navbar({ dict }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname?.split('/')[1] || 'es'
  const { customer, loading, logout } = useCustomer()

  const ordersFull =
    dict.common?.orders ?? (locale === 'en' ? 'My orders' : 'Mis pedidos')
  const ordersShort = locale === 'en' ? 'Orders' : 'Pedidos'

  const isOrders = pathname?.startsWith(`/${locale}/orders`)
  const isAdmin = pathname?.startsWith(`/${locale}/admin`)
  const isPartner = pathname?.startsWith(`/${locale}/partner/orders`)
  const role = customer?.metadata?.role

  // Desktop link styles
  const navLinkBase =
    'inline-flex items-center whitespace-nowrap leading-none px-1 py-1 text-sm font-medium text-gray-800 hover:text-green-600 lg:px-2 lg:py-1'
  const navLinkActive = '!font-bold !text-gray-900'

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false)

  // Ir al hero de productos
  const goToProducts = () => {
    const homePath = `/${locale}`
    const target = 'hero'
    setMobileOpen(false)
    if (pathname === homePath || pathname === `${homePath}/`) {
      const el = document.getElementById(target)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      router.push(`${homePath}#${target}`)
    }
  }

  return (
    <header
      id="navbar"
      className="sticky top-0 z-50 flex items-center px-6 md:px-16 lg:px-24 py-3 bg-white shadow"
    >
      {/* Logo */}
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

      {/* Acciones SIEMPRE visibles (móvil y desktop) */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        <CartIcon />

        {/* Botón menú móvil (solo <lg) */}
        <button
          className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Menú lateral móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
          <div className="absolute right-0 top-0 w-72 h-full bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <Image
                src="/ctelogo.png"
                alt="CTEnvios Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto p-2 text-gray-800 font-medium">
              {customer && (
                <li>
                  <Link
                    href={`/${locale}/orders`}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-2 py-2 rounded hover:bg-gray-50 ${isOrders ? 'font-bold text-gray-900' : ''}`}
                  >
                    {ordersFull}
                  </Link>
                </li>
              )}

              {customer && (role === 'owner' || role === 'admin') && (
                <li>
                  <Link
                    href={`/${locale}/admin`}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-2 py-2 rounded hover:bg-gray-50 ${isAdmin ? 'font-bold text-gray-900' : ''}`}
                  >
                    Admin
                  </Link>
                </li>
              )}

              {customer && (role === 'owner' || role === 'delivery') && (
                <li>
                  <Link
                    href={`/${locale}/partner/orders`}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-2 py-2 rounded hover:bg-gray-50 ${isPartner ? 'font-bold text-gray-900' : ''}`}
                  >
                    Partner Orders
                  </Link>
                </li>
              )}

              {/* Productos (Hero) — alineado como los demás */}
              <li>
                <button
                  onClick={goToProducts}
                  className="block w-full text-left px-2 py-2 rounded hover:bg-gray-50"
                >
                  {locale === 'en' ? 'Products' : 'Productos'}
                </button>
              </li>

              {/* Login / Logout dentro del menú (opcional) */}
              <li className="mt-2 border-t pt-2">
                {!loading && customer ? (
                  <button
                    onClick={() => {
                      setMobileOpen(false)
                      // ConfirmLogoutButton tiene su UI propia; si prefieres mantener solo ese flujo, puedes
                      // quitar este botón y dejar el logout SOLO en desktop o mover ConfirmLogoutButton aquí.
                      logout().catch(() => {})
                    }}
                    className="block w-full text-left px-2 py-2 rounded hover:bg-gray-50"
                  >
                    {dict.common.logout ?? 'Salir'}
                  </button>
                ) : (
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setMobileOpen(false)}
                    className="block px-2 py-2 rounded hover:bg-gray-50"
                  >
                    {dict.common.login}
                  </Link>
                )}
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Links Desktop (>=lg) */}
      <div className="hidden lg:flex items-center gap-3 sm:gap-4 ml-6">
        {!loading && customer && (
          <nav className="flex items-center gap-2">
            <Link
              href={`/${locale}/orders`}
              className={`${navLinkBase} ${isOrders ? navLinkActive : ''}`}
              aria-current={isOrders ? 'page' : undefined}
            >
              {ordersFull}
            </Link>

            {(role === 'owner' || role === 'admin') && (
              <Link
                href={`/${locale}/admin`}
                className={`${navLinkBase} ${isAdmin ? navLinkActive : ''}`}
              >
                Admin
              </Link>
            )}

            {(role === 'owner' || role === 'delivery') && (
              <Link
                href={`/${locale}/partner/orders`}
                className={`${navLinkBase} ${isPartner ? navLinkActive : ''}`}
              >
                Partner Orders
              </Link>
            )}

            {/* Productos directo a hero */}
            <Link href={`/${locale}#hero`} className={navLinkBase}>
              {locale === 'en' ? 'Products' : 'Productos'}
            </Link>
          </nav>
        )}

        {/* En desktop ya están fuera del menú (arriba a la derecha) */}
        {!loading && customer ? (
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <LogOut className="h-5 w-5 text-gray-700" />
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
