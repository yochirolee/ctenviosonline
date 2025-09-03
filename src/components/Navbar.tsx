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

  const ordersFull = dict.common?.orders ?? (locale === 'en' ? 'My orders' : 'Mis pedidos')
  const isOrders = pathname?.startsWith(`/${locale}/orders`)
  const isAdmin = pathname?.startsWith(`/${locale}/admin`)
  const isPartner = pathname?.startsWith(`/${locale}/partner/orders`)
  const role = customer?.metadata?.role

  const navLinkBase =
    'inline-flex items-center whitespace-nowrap leading-none px-1 py-1 text-sm font-medium text-gray-800 hover:text-green-300 lg:px-2 lg:py-1'
  const navLinkActive = '!font-bold !text-gray-900'

  const [mobileOpen, setMobileOpen] = useState(false)

  const goToSection = (hash: string) => {
    const homePath = `/${locale}`
    setMobileOpen(false)
    if (pathname === homePath || pathname === `${homePath}/`) {
      const el = document.getElementById(hash.replace('#', ''))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      router.push(`${homePath}${hash}`)
    }
  }

  return (
    <header
      id="navbar"
      className="sticky top-0 z-50 flex items-center px-6 md:px-16 lg:px-24 py-3 bg-white shadow"
    >
      {/* Izquierda: logo */}
      <Link href={`/${locale}`} aria-label="Ir al inicio" className="flex items-center gap-3">
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

      {/* Links desktop (centrales) */}
      <nav className="hidden lg:flex items-center gap-2 ml-auto mr-4">
        {!loading && customer && (
          <>
            <Link
              href={`/${locale}/orders`}
              className={`${navLinkBase} ${isOrders ? navLinkActive : ''}`}
              aria-current={isOrders ? 'page' : undefined}
            >
              {ordersFull}
            </Link>
            {(role === 'owner' || role === 'admin') && (
              <Link href={`/${locale}/admin`} className={`${navLinkBase} ${isAdmin ? navLinkActive : ''}`}>
                Admin
              </Link>
            )}
            {(role === 'owner' || role === 'delivery') && (
              <Link href={`/${locale}/partner/orders`} className={`${navLinkBase} ${isPartner ? navLinkActive : ''}`}>
                Partner Orders
              </Link>
            )}
          </>
        )}

        {/* Secciones ancla */}
        <Link href={`/${locale}#hero`} className={navLinkBase}>
          {locale === 'en' ? 'Products' : 'Productos'}
        </Link>
        <Link href={`/${locale}#about`} className={navLinkBase}>
          {locale === 'en' ? 'About' : 'Acerca de'}
        </Link>
        <Link href={`/${locale}#faq`} className={navLinkBase}>
          FAQ
        </Link>
        <Link href={`/${locale}#contact`} className={navLinkBase}>
          {locale === 'en' ? 'Contact' : 'Contacto'}
        </Link>
        <Link href={`/${locale}/terms`} className={navLinkBase}>
          {locale === 'es' ? 'Términos y Condiciones' : 'Terms'}
        </Link>
      </nav>

      {/* Derecha SIEMPRE: idioma + carrito + (login/logout) + menú móvil */}
      <div className="ml-auto lg:ml-0 flex items-center gap-2 sm:gap-3">
        
        <LanguageSwitcher />
        <CartIcon />

        {/* Login/Logout (desktop) */}
        <div className="hidden lg:block">
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

        {/* Botón menú móvil */}
        <button
          className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Menú móvil (overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
          <div className="absolute right-0 top-0 w-72 h-full bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <Image src="/ctelogo.png" alt="CTEnvios Logo" width={40} height={40} className="object-contain" />
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

              {/* Secciones */}
              <li>
                <button
                  onClick={() => goToSection('#hero')}
                  className="block w-full text-left px-2 py-2 rounded hover:bg-gray-50"
                >
                  {locale === 'en' ? 'Products' : 'Productos'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => goToSection('#about')}
                  className="block w-full text-left px-2 py-2 rounded hover:bg-gray-50"
                >
                  {locale === 'en' ? 'About' : 'Acerca de'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => goToSection('#faq')}
                  className="block w-full text-left px-2 py-2 rounded hover:bg-gray-50"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  onClick={() => goToSection('#contact')}
                  className="block w-full text-left px-2 py-2 rounded hover:bg-gray-50"
                >
                  {locale === 'en' ? 'Contact' : 'Contacto'}
                </button>
              </li>

              {/* Terms */}
              <li className="mt-3 border-t pt-3">
                <Link
                  href={`/${locale}/terms`}
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 hover:text-green-600 transition"
                >
                  {locale === 'es' ? 'Términos y Condiciones' : 'Terms and Conditions'}
                </Link>
              </li>

              {/* Login/Logout (móvil) */}
              <li className="mt-2 border-t pt-2">
                {!loading && customer ? (
                  <button
                    onClick={() => {
                      setMobileOpen(false)
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
    </header>
  )
}
