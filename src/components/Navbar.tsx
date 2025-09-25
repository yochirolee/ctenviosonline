'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import CartIcon from '@/components/CartIcon'
import { useCustomer } from '@/context/CustomerContext'
import type { Dict } from '@/types/Dict'
import ConfirmLogoutButton from '@/components/ConfirmLogoutButton'
import { useEffect, useRef, useState, useReducer } from 'react'
import { LogIn, LogOut, Menu, X, ChevronDown } from 'lucide-react'
import { getCategories } from '@/lib/products'

type Props = { dict: Dict }

const LOGO_SRC = '/ctelogo.png'
const LOGO_ALT = 'CTEnvios Online Logo'

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

  // ---- Nueva identidad visual (verde CTEnvios) ----
  const navLinkBase =
    'inline-flex items-center whitespace-nowrap leading-none px-1 py-1 text-sm font-medium text-white/90 hover:text-white lg:px-2 lg:py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded'
  const navLinkActive = '!font-semibold !text-white'

  const [mobileOpen, setMobileOpen] = useState(false)

  type RawCategory = { slug: string; image_url?: string | null }
  type Cat = { slug: string }

  const [cats, setCats] = useState<Cat[]>([])
  const [catsOpen, setCatsOpen] = useState(false)
  const [catsLoading, setCatsLoading] = useState(false)
  const [catsLoaded, setCatsLoaded] = useState(false)

  const [, forceRerender] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const bump = () => forceRerender()
    window.addEventListener('navbar:refresh', bump)
    window.addEventListener('cart:updated', bump)
    window.addEventListener('encargos:completed', bump)
    return () => {
      window.removeEventListener('navbar:refresh', bump)
      window.removeEventListener('cart:updated', bump)
      window.removeEventListener('encargos:completed', bump)
    }
  }, [])

  useEffect(() => {
    if (!mobileOpen || catsLoaded) return
    let alive = true
      ; (async () => {
        try {
          setCatsLoading(true)
          const rows = (await getCategories()) as RawCategory[]
          const normalized: Cat[] = (rows ?? [])
            .filter((c): c is RawCategory => !!c && typeof c.slug === 'string' && c.slug in dict.categories.list)
            .map((c) => ({ slug: c.slug }))
          if (alive) {
            setCats(normalized)
            setCatsLoaded(true)
          }
        } catch {
          if (alive) {
            setCats([])
            setCatsLoaded(true)
          }
        } finally {
          if (alive) setCatsLoading(false)
        }
      })()
    return () => { alive = false }
  }, [mobileOpen, catsLoaded, dict.categories.list])

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

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  useEffect(() => { if (mobileOpen) firstLinkRef.current?.focus() }, [mobileOpen])

  return (
    <header id="navbar" className="sticky top-0 z-50 relative flex items-center h-14 md:h-16 pl-3 pr-6 md:pl-6 md:pr-16 lg:pl-8 lg:pr-24 bg-emerald-800 text-white shadow-md shadow-green-900/10 border-b border-green-700/40">

      {/* Izquierda: logo (cuadrado) */}
      <Link href={`/${locale}`} aria-label="Ir al inicio" className="flex items-center gap-3">
        <div className="relative h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 shrink-0">
          <Image
            src={LOGO_SRC}
            alt={LOGO_ALT}
            fill
            sizes="(max-width: 850px) 64px, (max-width: 1024px) 56px, 64px"
            className="relative z-10 object-contain cursor-pointer               
               brightness-[1.18] contrast-[1.15]"
            priority
          />
        </div>

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
            {role === 'admin' && (
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
                {locale === 'en' ? 'Deliveries' : 'Entregas'}
              </Link>
            )}
          </>
        )}

        <Link href={`/${locale}#hero`} className={navLinkBase}>
          {locale === 'en' ? 'See Products' : 'Ver Productos'}
        </Link>
        <Link href={`/${locale}#about`} className={navLinkBase}>
          {locale === 'en' ? 'About us' : 'Acerca de nosotros'}
        </Link>
        <Link href={`/${locale}#faq`} className={navLinkBase}>FAQ</Link>
        <Link href={`/${locale}#contact`} className={navLinkBase}>
          {locale === 'en' ? 'Contact' : 'Contacto'}
        </Link>
        <Link href={`/${locale}/terms`} className={navLinkBase}>
          {locale === 'es' ? 'Términos y Condiciones' : 'Terms'}
        </Link>
      </nav>

      {/* Derecha: idioma + carrito + (login/logout) + menú móvil */}
      <div className="ml-auto lg:ml-0 flex items-center gap-2 sm:gap-3">
        {/* Forzamos blanco en iconos hijxs (CartIcon usa currentColor) */}
        <div className="text-white">
          <LanguageSwitcher />
        </div>
        <div className="text-white">
          <CartIcon />
        </div>

        {/* Login/Logout (desktop) */}
        <div className="hidden lg:block">
          {!loading && customer ? (
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <LogOut className="h-5 w-5 text-white" />
              </div>
              <div className="absolute inset-0 opacity-0">
                <ConfirmLogoutButton logout={logout} dict={dict} />
              </div>
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              aria-label={dict.common.login}
              title={dict.common.login}
              className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-white/10 transition"
            >
              <LogIn className="h-5 w-5 text-white" />
            </Link>
          )}
        </div>

        {/* Botón menú móvil */}
        <button
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded"
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
             className="absolute right-0 top-0 w-72 h-full bg-white shadow-lg flex flex-col text-gray-800"
          >
            {/* Encabezado del drawer en verde */}
            <div className="flex items-center justify-between p-4 border-b">      

              <div className="relative h-10 w-10 shrink-0">
                <Image
                  src={LOGO_SRC}
                  alt={LOGO_ALT}
                  fill
                  sizes="36px"
                  className="object-contain cursor-pointer brightness-[1.18] contrast-[1.15]"
                  priority
                />
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded hover:bg-white/10"
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
              className="flex-1 overflow-y-auto p-2 font-medium
              [&>li>a]:block [&>li>a]:px-3 [&>li>a]:py-2 [&>li>a]:rounded [&>li>a]:transition-colors
              [&>li>button]:block [&>li>button]:w-full [&>li>button]:text-left [&>li>button]:px-3 [&>li>button]:py-2 [&>li>button]:rounded [&>li>button]:transition-colors
              [&_a:active]:bg-green-600 [&_a:active]:!text-white
              [&_button:active]:bg-green-600 [&_button:active]:!text-white
              [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-green-500/30
              [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-green-500/30"
            >
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

              {customer && role === 'admin' && (
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
                    {locale === 'en' ? 'Admin Deliveries' : 'Administrar Entregas'}
                  </Link>
                </li>
              )}

              <li>
                <button onClick={() => goToSection('#hero')} className="block w-full text-left rounded">
                  {locale === 'en' ? 'All Products' : 'Todos los Productos'}
                </button>
              </li>

              {/* Categorías (solo móvil) */}
              <li className="mt-2">
                <button
                  onClick={() => setCatsOpen(v => !v)}
                  aria-expanded={catsOpen}
                  aria-controls="mobile-categories-panel"
                  className="!flex w-full items-center justify-between px-3 py-2 rounded
                  hover:bg-gray-100 transition text-gray-700 font-medium
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/30"
                >
                  <span className="min-w-0 truncate">
                    {locale === 'en' ? 'Categories' : 'Categorías'}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${catsOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>

                <div
                  id="mobile-categories-panel"
                  hidden={!catsOpen}
                  className="mx-2 mt-1 rounded-md border border-green-100 bg-green-50/60"
                >
                  {catsLoading ? (
                    <div className="px-3 py-2 space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-4 w-40 bg-green-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : cats.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-600">
                      {locale === 'en' ? 'No categories yet.' : 'Aún no hay categorías.'}
                    </div>
                  ) : (
                    <ul className="max-h-[50vh] overflow-y-auto py-1">
                      {cats.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={`/${locale}/categories/${c.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="block px-5 py-2 text-sm rounded hover:bg-green-100/80 transition
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/30"
                          >
                            {dict.categories.list[c.slug as keyof typeof dict.categories.list] ?? c.slug}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>

              <li>
                <button onClick={() => goToSection('#about')} className="block w-full text-left rounded">
                  {locale === 'en' ? 'About us' : 'Acerca de nosotros'}
                </button>
              </li>
              <li>
                <button onClick={() => goToSection('#faq')} className="block w-full text-left rounded">
                  FAQ
                </button>
              </li>
              <li>
                <button onClick={() => goToSection('#contact')} className="block w-full text-left rounded">
                  {locale === 'en' ? 'Contact' : 'Contacto'}
                </button>
              </li>

              <li className="mt-3 border-t pt-3">
                <Link href={`/${locale}/terms`} onClick={() => setMobileOpen(false)} className="block rounded">
                  {locale === 'es' ? 'Términos y Condiciones' : 'Terms and Conditions'}
                </Link>
              </li>

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
