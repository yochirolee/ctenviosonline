'use client'

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

export default function CartDrawer({ dict }: { dict: Dict }) {
  const {
    items,
    removeItem,
    addItem,
    isCartOpen,
    setIsCartOpen,
    refreshCartNow, // 👈 para forzar sync visual tras errores de stock
  } = useCart()

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
  function priceWithMarginCentsFromMeta(item: any): number | undefined {
    const base = typeof item?.metadata?.base_cents === 'number' && item.metadata.base_cents >= 0
      ? item.metadata.base_cents
      : undefined
    const marginPct = typeof item?.metadata?.margin_pct === 'number' && isFinite(item.metadata.margin_pct)
      ? Number(item.metadata.margin_pct)
      : 0
    if (base == null) return undefined
    return Math.round(base * (100 + marginPct) / 100)
  }

  function normalizeUnitPriceToCents(item: any): number {
    const up = Number(item?.unit_price ?? 0)
    if (!isFinite(up)) return 0
    if (Number.isInteger(up) && up >= 1000) return up // ya está en cents
    return Math.round(up * 100) // venía en USD
  }

  function itemUnitCents(item: any): number {
    return priceWithMarginCentsFromMeta(item) ?? normalizeUnitPriceToCents(item)
  }

  // Subtotal (centavos)
  const subtotalCents = items.reduce(
    (sum, item) => sum + itemUnitCents(item) * item.quantity,
    0
  )

  // Tax general (centavos): suma de tax_cents por ítem * cantidad
  const taxCents = items.reduce((sum, item: any) => {
    const perItemTax = Number.isFinite(item?.metadata?.tax_cents) ? Number(item.metadata.tax_cents) : 0
    return sum + perItemTax * item.quantity
  }, 0)

  const totalCents = subtotalCents + taxCents

  const anyOverStock = React.useMemo(
    () => items.some(it => Number.isFinite(it?.available) && it.available !== null && it.quantity > (it.available as number)),
    [items]
  )

  return (
    <Dialog open={isCartOpen} onClose={() => setIsCartOpen(false)} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
      <div className="fixed inset-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
          <DialogPanel className="pointer-events-auto w-screen max-w-md bg-white shadow-xl">
            <div className="h-full overflow-y-auto p-6 flex flex-col gap-6">
              <div className="flex items-start justify-between border-b border-gray-200 pb-4">
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

              {items.length === 0 ? (
                <p className="text-gray-500">{dict.cart.empty}</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {items.map((item: any) => {
                    const unitCents = itemUnitCents(item)
                    const lineCents = unitCents * item.quantity

                    const available: number | null =
                      Number.isFinite(item?.available) && item.available !== null
                        ? Number(item.available)
                        : null

                    const over = available !== null && item.quantity > available
                    const reached = available !== null && item.quantity >= available

                    const qtyClass = over
                      ? 'text-red-600 font-semibold'
                      : 'text-gray-700'

                    return (
                      <li
                        key={item.id}
                        className={`flex py-6 ${over ? 'bg-red-50/60' : ''}`}
                      >
                        <div className={`w-24 h-24 overflow-hidden rounded-md border ${over ? 'border-red-300' : 'border-gray-200'}`}>
                          <img
                            src={item.thumbnail ?? '/pasto.jpg'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="ml-4 flex flex-1 flex-col">
                          <div className="flex justify-between text-base font-medium text-gray-900">
                            <h3 className={`pr-2 ${over ? 'text-red-700' : ''}`}>{item.title}</h3>
                            <p className={`${over ? 'text-red-700' : ''}`}>${(lineCents / 100).toFixed(2)}</p>
                          </div>

                          {(item?.owner_name || item?.metadata?.owner) && (
                            <div className="mt-0.5 text-xs text-gray-500">
                              {dict.checkout.provider}{item.owner_name || item.metadata.owner}
                            </div>
                          )}

                          <div className="mt-1 text-sm text-gray-500">
                            <span>
                              {dict.checkout.quantity}: <span className={qtyClass}>{item.quantity}</span> · ${(unitCents / 100).toFixed(2)} c/u
                            </span>
                          </div>

                          {/* Disponibilidad visual */}
                          {available !== null && (
                            <div
                              className={`mt-1 text-xs ${over ? 'text-red-600 font-semibold' : 'text-gray-500'}`}
                            >
                              {over ? (
                                <>
                                  {dict.checkout.available_message}{available}. {dict.checkout.available_message2}
                                </>
                              ) : (
                                <>
                                  {dict.checkout.available}{available}
                                </>
                              )}
                            </div>
                          )}

                          {Number(item?.weight) > 0 && (
                            <div className="mt-1 text-xs text-gray-500">
                              {dict.checkout.weight}{Number(item.weight).toFixed(2)}{dict.checkout.weight_unit}
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-3">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                              aria-label="Disminuir"
                            >
                              −
                            </button>

                            <span className={`text-sm ${qtyClass}`}>{item.quantity}</span>

                            <button
                              onClick={async () => {
                                // Bloqueo soft en el front cuando ya alcanzó el disponible
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
                                } catch (e: any) {
                                  if (e?.code === 'OUT_OF_STOCK') {
                                    toast.error(
                                      Number(e?.available) === 0
                                        ? `Sin stock disponible para ${e?.title ?? 'este producto'}.`
                                        : `Solo quedan ${e?.available} de ${e?.title ?? 'este producto'}.`
                                    )
                                    // fuerza refresco para ver el stock/qty real
                                    refreshCartNow()
                                  } else if (e?.message === 'AUTH_MISSING' || e?.message === 'AUTH_FORBIDDEN') {
                                    toast.error('Tu sesión expiró. Inicia sesión para continuar.')
                                    router.push(`/${locale}/login`)
                                  } else {
                                    toast.error('No se pudo agregar al carrito')
                                  }
                                }
                              }}
                              className={`px-3 py-1 rounded border ${reached ? 'cursor-not-allowed' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'} focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1`}
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
              )}

              {items.length > 0 && (
                <div className="border-t border-gray-200 pt-6 mt-auto space-y-2">
                  <div className="flex justify-between text-base text-gray-900">
                    <p>{dict.cart.subtotal}</p>
                    <p>${(subtotalCents / 100).toFixed(2)}</p>
                  </div>

                  <div className="flex justify-between text-sm text-gray-700">
                    <p>{dict.checkout.tax ?? 'Tax'}</p>
                    <p>${(taxCents / 100).toFixed(2)}</p>
                  </div>

                  <p className="mt-0.5 text-xs text-gray-500">
                    {dict.cart.subtotaldetails}
                  </p>

                  <div className="flex justify-between text-base font-semibold text-gray-900 pt-2">
                    <p>{dict.checkout.total ?? 'Total'}</p>
                    <p>${((subtotalCents + taxCents) / 100).toFixed(2)}</p>
                  </div>

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
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="font-medium text-green-600 hover:text-green-500"
                    >
                      {dict.cart.continue} →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
