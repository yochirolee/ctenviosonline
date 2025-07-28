'use client';

import React from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { usePathname } from 'next/navigation';

export default function CartDrawer() {
  const {
    cartItems,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  // Evita el scroll del body cuando el drawer está abierto
  React.useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isCartOpen]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'es';

  return (
    <Dialog open={isCartOpen} onClose={() => setIsCartOpen(false)} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
      <div className="fixed inset-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
          <DialogPanel className="pointer-events-auto w-screen max-w-md bg-white shadow-xl">
            <div className="h-full overflow-y-auto p-6 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                <DialogTitle className="text-lg font-medium text-gray-900">
                  Carrito de compras
                </DialogTitle>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                  aria-label="Cerrar panel"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Productos */}
              {cartItems.length === 0 ? (
                <p className="text-gray-500">Tu carrito está vacío.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <li key={item.id} className="flex py-6">
                      <div className="w-24 h-24 overflow-hidden rounded-md border border-gray-200">
                        <img
                          src={item.imageSrc ?? '/pasto.jpg'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-4 flex flex-1 flex-col">
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3>{item.name}</h3>
                          <p>${item.price.toFixed(2)}</p>
                        </div>
                        <div className="mt-1 text-sm text-gray-500 flex items-center space-x-4">
                          <span>Cantidad: {item.quantity}</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => decreaseQuantity(item.id)}
                              className="px-2 py-1 border rounded hover:bg-gray-200"
                            >
                              -
                            </button>
                            <button
                              onClick={() => increaseQuantity(item.id)}
                              className="px-2 py-1 border rounded hover:bg-gray-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-1 items-end justify-between text-sm mt-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Footer */}
              {cartItems.length > 0 && (
                <div className="border-t border-gray-200 pt-6 mt-auto">
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>${subtotal.toFixed(2)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Envío e impuestos calculados al pagar.
                  </p>
                  <div className="mt-6">
                    <Link
                      href={`/${locale}/checkout`}
                      onClick={() => setIsCartOpen(false)}
                      className="flex items-center justify-center rounded-md bg-green-600 px-6 py-3 text-base font-medium text-white hover:bg-green-700 w-full"
                    >
                      Checkout
                    </Link>
                  </div>
                  <div className="mt-6 flex justify-center text-sm text-gray-500">
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="font-medium text-green-600 hover:text-green-500"
                    >
                      Continuar comprando →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
