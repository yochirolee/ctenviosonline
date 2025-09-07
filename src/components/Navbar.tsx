'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import CartIcon from '@/components/CartIcon'
import { useCustomer } from '@/context/CustomerContext'
import type { Dict } from '@/types/Dict'
import ConfirmLogoutButton from '@/components/ConfirmLogoutButton'
import { useEffect, useRef, useState } from 'react'
import EncargosIcon from '@/components/EncargosIcon'
import { LogIn, LogOut, Menu, X, ClipboardList } from 'lucide-react'


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
  const isAccount = pathname?.startsWith(`/${locale}/account`)
  const role = customer?.metadata?.role

  const navLinkBase =
    'inline-flex items-center whitespace-nowrap leading-none px-1 py-1 text-sm font-medium text-gray-800 hover:text-green-300 lg:px-2 lg:py-1'
  const navLinkActive = '!font-bold !text-gray-900'

  const [mobileOpen, setMobileOpen] = useState(false)

  // fuerza re-render cuando lleguen señales globales
  const [navTick, setNavTick] = useState(0)
  useEffect(() => {
    const bump = () => setNavTick((t) => t + 1)
    window.addEventListener('navbar:refresh', bump)
    window.addEventListener('cart:updated', bump)
    window.addEventListener('encargos:completed', bump)
    // si tienes otros eventos internos, agrégalos aquí

    return () => {
      window.removeEventListener('navbar:refresh', bump)
      window.removeEventListener('cart:updated', bump)
      window.removeEventListener('encargos:completed', bump)
    }
  }, [])

  // Para enfoque inicial en el primer link del drawer
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

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

  // 1) Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  // 2) Cerrar drawer si cambia la ruta
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // 3) Cerrar con tecla Esc
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  // 4) Enfocar primer link al abrir
  useEffect(() => {
    if (mobileOpen) firstLinkRef.current?.focus()
  }, [mobileOpen])

  const openEncargosDrawer = () => {
    setMobileOpen(false)
    try { window.dispatchEvent(new CustomEvent('encargos:open')) } catch { }
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
          <Link
            href={`/${locale}/account`}
            className={`${navLinkBase} ${isAccount ? navLinkActive : ''}`}
            aria-current={isAccount ? 'page' : undefined}
          >
            {locale === 'en' ? 'My profile' : 'Mi perfil'}
          </Link>
        )}

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
              <Link
                href={`/${locale}/admin`}
                className={`${navLinkBase} ${isAdmin ? navLinkActive : ''}`}
                aria-current={isAdmin ? 'page' : undefined}
              >
                Admin
              </Link>
            )}
            {(role === 'owner' || role === 'delivery') && (
              <Link
                href={`/${locale}/partner/orders`}
                className={`${navLinkBase} ${isPartner ? navLinkActive : ''}`}
                aria-current={isPartner ? 'page' : undefined}
              >
                Partner Orders
              </Link>
            )}
          </>
        )}

        {/* Secciones ancla */}
        <Link href={`/${locale}#hero`} className={navLinkBase}>
          {locale === 'en' ? 'See Products' : 'Ver Productos'}
        </Link>
        <Link href={`/${locale}#about`} className={navLinkBase}>
          {locale === 'en' ? 'About us' : 'Acerca de nosotros'}
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

      {/* Derecha: idioma + carrito + (login/logout) + menú móvil */}
      <div className="ml-auto lg:ml-0 flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        <EncargosIcon />
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
          aria-controls="mobile-drawer"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Menú móvil (overlay) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          role="presentation"
          onClick={(e) => { if (e.currentTarget === e.target) setMobileOpen(false) }}
        >
          <div
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            className="absolute right-0 top-0 w-72 h-full bg-white shadow-lg flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <Image
                src="/ctelogo.png"
                alt="CTEnvios Logo"
                width={40}
                height={40}
                className="object-contain w-10 h-10 lg:w-14 lg:h-14"
                style={{ height: 'auto', width: 'auto' }}
              />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!loading && (
              customer ? (
                <div className="px-3 py-3 border-b bg-green-50/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white text-sm font-semibold">
                      {(customer.first_name?.[0] || customer.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {customer.first_name ? `Hola, ${customer.first_name}` : 'Cuenta activa'}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{customer.email}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-3 border-b">
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex w-full items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 active:bg-green-800 transition"
                  >
                    {dict.common.login}
                  </Link>
                </div>
              )
            )}

            <ul
              className="flex-1 overflow-y-auto p-2 text-gray-700 font-medium active:transition-none
              [&>li>a]:block [&>li>a]:px-3 [&>li>a]:py-2 [&>li>a]:rounded [&>li>a]:transition-colors
              [&>li>button]:block [&>li>button]:w-full [&>li>button]:text-left [&>li>button]:px-3 [&>li>button]:py-2 [&>li>button]:rounded [&>li>button]:transition-colors
              [&_a]:text-gray-700 [&_button]:text-gray-700
              [&_a:active]:bg-green-600 [&_a:active]:!text-white
              [&_button:active]:bg-green-600 [&_button:active]:!text-white
              [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-green-500/30
              [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-green-500/30"
            >
              <li>
                <button
                  onClick={openEncargosDrawer}
                  className="!flex items-center gap-2 w-full text-left rounded px-3 py-2 hover:bg-gray-100"
                >
                  <ClipboardList className="h-4 w-4" />
                  {locale === 'en' ? 'Special Orders' : 'Encargos'}
                </button>
              </li>

              {customer && (
                <li>
                  <Link
                    ref={firstLinkRef}
                    href={`/${locale}/account`}
                    onClick={() => setMobileOpen(false)}
                    className={`block w-full text-left rounded ${isAccount ? 'bg-green-50 text-green-700 font-semibold' : ''}`}
                    aria-current={isAccount ? 'page' : undefined}
                  >
                    {locale === 'en' ? 'My profile' : 'Mi perfil'}
                  </Link>
                </li>
              )}

              {customer && (
                <li>
                  <Link
                    href={`/${locale}/orders`}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded ${isOrders ? 'bg-green-50 text-green-700 font-semibold' : ''}`}
                    aria-current={isOrders ? 'page' : undefined}
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
                    className={`block rounded ${isAdmin ? 'bg-green-50 text-green-700 font-semibold' : ''}`}
                    aria-current={isAdmin ? 'page' : undefined}
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
                    className={`block rounded ${isPartner ? 'bg-green-50 text-green-700 font-semibold' : ''}`}
                    aria-current={isPartner ? 'page' : undefined}
                  >
                    Partner Orders
                  </Link>
                </li>
              )}

              {/* Secciones */}
              <li>
                <button
                  onClick={() => goToSection('#hero')}
                  className="block w-full text-left rounded"
                >
                  {locale === 'en' ? 'Products' : 'Productos'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => goToSection('#about')}
                  className="block w-full text-left rounded"
                >
                  {locale === 'en' ? 'About us' : 'Acerca de nosotros'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => goToSection('#faq')}
                  className="block w-full text-left rounded"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  onClick={() => goToSection('#contact')}
                  className="block w-full text-left rounded"
                >
                  {locale === 'en' ? 'Contact' : 'Contacto'}
                </button>
              </li>

              {/* Terms */}
              <li className="mt-3 border-t pt-3">
                <Link
                  href={`/${locale}/terms`}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded"
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
                      logout().catch(() => { })
                    }}
                    className="block w-full text-left rounded"
                  >
                    {dict.common.logout ?? 'Salir'}
                  </button>
                ) : (
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded"
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
