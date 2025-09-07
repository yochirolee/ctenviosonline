'use client'
/* eslint-disable @next/next/no-img-element */

import React from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCart } from '../context/CartContext'
import { usePathname, useRouter } from 'next/navigation'
import type { Dict } from '@/types/Dict'
import { toast } from 'sonner'

type CartItemMeta = {
  base_cents?: number
  margin_pct?: number
  tax_cents?: number
  owner?: string
  [k: string]: unknown
}

type CartItem = {
  id: number | string
  product_id: number
  title: string
  unit_price?: number
  quantity: number
  thumbnail?: string
  available?: number | null
  weight?: number | string | null
  owner_name?: string
  metadata?: CartItemMeta
}

export default function CartDrawer({ dict }: { dict: Dict }) {
  const cart = useCart()
  const items = cart.items as CartItem[]
  const { removeItem, addItem, isCartOpen, setIsCartOpen, refreshCartNow } = cart

  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'es'

  React.useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = '0'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [isCartOpen])

  // --- Helpers de precio ---
  function priceWithMarginCentsFromMeta(item: CartItem): number | undefined {
    const base =
      typeof item?.metadata?.base_cents === 'number' && item.metadata.base_cents >= 0
        ? item.metadata.base_cents
        : undefined
    const marginPct =
      typeof item?.metadata?.margin_pct === 'number' && isFinite(item.metadata.margin_pct)
        ? Number(item.metadata.margin_pct)
        : 0
    if (base == null) return undefined
    return Math.round((base * (100 + marginPct)) / 100)
  }

  function normalizeUnitPriceToCents(item: CartItem): number {
    const up = Number(item?.unit_price ?? 0)
    if (!isFinite(up)) return 0
    if (Number.isInteger(up) && up >= 1000) return up // ya está en cents
    return Math.round(up * 100) // venía en USD
  }

  function itemUnitCents(item: CartItem): number {
    return priceWithMarginCentsFromMeta(item) ?? normalizeUnitPriceToCents(item)
  }

  // Subtotal (centavos)
  const subtotalCents = items.reduce((sum, item) => sum + itemUnitCents(item) * item.quantity, 0)

  // Tax general (centavos): suma de tax_cents por ítem * cantidad
  const taxCents = items.reduce((sum, item: CartItem) => {
    const perItemTax =
      Number.isFinite(item?.metadata?.tax_cents) && typeof item?.metadata?.tax_cents === 'number'
        ? item.metadata!.tax_cents!
        : 0
    return sum + perItemTax * item.quantity
  }, 0)

  return (
    <Dialog open={isCartOpen} onClose={() => setIsCartOpen(false)} className="fixed inset-0 z-50 overscroll-contain touch-pan-y">
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
      <div className="fixed inset-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-full justify-end pl-0 sm:pl-16">
          <DialogPanel
            className="
              pointer-events-auto
              w-[100vw] sm:w-full
              max-w-[100vw] sm:max-w-md
              h-full
              bg-white shadow-xl pr-[env(safe-area-inset-right)]
              box-border
              overflow-x-hidden
            "
          >
            <div className="flex h-full max-h-screen flex-col">
              {/* HEADER sticky */}
              <div className="sticky top-0 z-20 bg-white pr-[env(safe-area-inset-right)]">
                <div className="p-6 flex items-start justify-between border-b border-gray-200">
                  <DialogTitle className="text-lg font-medium text-gray-900">
                    {dict.cart.title}
                  </DialogTitle>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                    aria-label="Cerrar panel"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* CONTENIDO con scroll */}
              <div className="flex-1 overflow-y-auto p-6">
                {items.length === 0 ? (
                  <p className="text-gray-500">{dict.cart.empty}</p>
                ) : (
                  <>
                    <ul className="divide-y divide-gray-200">
                      {items.map((item: CartItem) => {
                        const unitCents = itemUnitCents(item)
                        const lineCents = unitCents * item.quantity
                        const available: number | null =
                          Number.isFinite(item?.available) && item.available !== null
                            ? Number(item.available)
                            : null
                        const over = available !== null && item.quantity > available
                        const reached = available !== null && item.quantity >= available
                        const qtyClass = over ? 'text-red-600 font-semibold' : 'text-gray-700'

                        return (
                          <li key={item.id} className={`flex py-6 ${over ? 'bg-red-50/60' : ''}`}>
                            {/* Thumb */}
                            <div
                              className={`w-24 h-24 overflow-hidden rounded-md border ${over ? 'border-red-300' : 'border-gray-200'
                                }`}
                            >
                              <img
                                src={item.thumbnail ?? '/pasto.jpg'}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Texto + controles */}
                            <div className="ml-4 flex flex-1 min-w-0 flex-col">
                              <div className="flex items-start justify-between gap-3">
                                <h3
                                  className={`pr-2 text-base font-medium leading-snug break-words line-clamp-2 ${over ? 'text-red-700' : 'text-gray-900'
                                    }`}
                                >
                                  {item.title}
                                </h3>
                                <p
                                  className={`shrink-0 whitespace-nowrap text-base font-medium ${over ? 'text-red-700' : 'text-gray-900'
                                    }`}
                                >
                                  ${(lineCents / 100).toFixed(2)}
                                </p>
                              </div>

                              <div className="mt-1 text-sm text-gray-500">
                                <span>
                                  {dict.checkout.quantity}:{' '}
                                  <span className={qtyClass}>{item.quantity}</span> · $
                                  {(unitCents / 100).toFixed(2)} c/u
                                </span>
                              </div>

                              {Number(item?.weight) > 0 && (
                                <div className="mt-1 text-sm text-gray-500">
                                  {dict.checkout.weight}
                                  {Number(item.weight).toFixed(2)}
                                  {dict.checkout.weight_unit}
                                </div>
                              )}

                              {(item?.owner_name || item?.metadata?.owner) && (
                                <div className="mt-0.5 text-sm text-gray-500">
                                  {dict.checkout.provider}
                                  {item.owner_name || item.metadata?.owner}
                                </div>
                              )}

                              {available !== null && (
                                <div
                                  className={`mt-1 text-sm ${over ? 'text-red-600 font-semibold' : 'text-gray-500'
                                    }`}
                                >
                                  {over ? (
                                    <>
                                      {dict.checkout.available_message}
                                      {available}. {dict.checkout.available_message2}
                                    </>
                                  ) : (
                                    <>
                                      {dict.checkout.available}
                                      {available}
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Controles cantidad */}
                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  onClick={() =>
                                    removeItem(typeof item.id === 'number' ? item.id : Number(item.id))
                                  }
                                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                                  aria-label="Disminuir"
                                >
                                  −
                                </button>

                                <span className={`text-sm ${qtyClass}`}>{item.quantity}</span>

                                <button
                                  onClick={async () => {
                                    if (reached) {
                                      toast.error(
                                        available === 0
                                          ? `Sin stock disponible para ${item.title}.`
                                          : `Solo quedan ${available} de ${item.title}.`
                                      )
                                      return
                                    }
                                    try {
                                      await addItem(item.product_id, 1)
                                    } catch (e: unknown) {
                                      const err = (e ?? {}) as {
                                        code?: string
                                        available?: number
                                        title?: string
                                        message?: string
                                      }
                                      if (err?.code === 'OUT_OF_STOCK') {
                                        toast.error(
                                          Number(err?.available) === 0
                                            ? `Sin stock disponible para ${err?.title ?? 'este producto'}.`
                                            : `Solo quedan ${err?.available} de ${err?.title ?? 'este producto'}.`
                                        )
                                        refreshCartNow()
                                      } else if (
                                        err?.message === 'AUTH_MISSING' ||
                                        err?.message === 'AUTH_FORBIDDEN'
                                      ) {
                                        toast.error('Tu sesión expiró. Inicia sesión para continuar.')
                                        router.push(`/${locale}/login`)
                                      } else {
                                        toast.error('No se pudo agregar al carrito')
                                      }
                                    }
                                  }}
                                  className={`px-3 py-1 rounded border ${reached
                                    ? 'cursor-not-allowed'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                                    } focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1`}
                                  aria-label="Aumentar"
                                  disabled={reached}
                                  title={reached ? 'No hay más stock disponible' : undefined}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>

                    {/* Totales al final */}
                    <div className="border-t border-gray-200 mt-6 pt-6 space-y-2">
                      <div className="flex justify-between text-base text-gray-900">
                        <p>{dict.cart.subtotal}</p>
                        <p>${(subtotalCents / 100).toFixed(2)}</p>
                      </div>

                      <div className="flex justify-between text-sm text-gray-700">
                        <p>{dict.checkout.tax ?? 'Tax'}</p>
                        <p>${(taxCents / 100).toFixed(2)}</p>
                      </div>

                      <p className="mt-0.5 text-xs text-gray-500">{dict.cart.subtotaldetails}</p>

                      <div className="mt-4">
                        <Link
                          href={`/${locale}/checkout`}
                          onClick={() => setIsCartOpen(false)}
                          className="flex items-center justify-center rounded-md bg-green-600 px-6 py-3 text-base font-medium text-white hover:bg-green-700 w-full"
                        >
                          {dict.cart.checkout}
                        </Link>
                      </div>

                      <div className="mt-4 flex justify-center text-sm text-gray-500">
                        <Link
                          href={`/${locale}`}
                          onClick={() => setIsCartOpen(false)}
                          className="font-medium text-green-600 hover:text-green-500"
                        >
                          {dict.cart.continue} →
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
