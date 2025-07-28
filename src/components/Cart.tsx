'use client';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { usePathname } from 'next/navigation';

export default function CartDrawer() {
  const { cartItems, removeFromCart, increaseQuantity, decreaseQuantity, isCartOpen, setIsCartOpen } = useCart();
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'es';

  return (
    <Dialog open={isCartOpen} onClose={() => setIsCartOpen(false)} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />

      {/* Contenedor scrollable general */}
      <div className="fixed inset-0 w-screen overflow-y-auto p-4">
        <div className="flex min-h-full justify-end">
          <DialogPanel className="pointer-events-auto w-full max-w-md bg-white shadow-xl mx-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Contenido principal */}
            <div className="px-4 py-6 sm:px-6">
              <div className="flex items-start justify-between mb-6">
                <DialogTitle className="text-lg font-medium text-gray-900">Carrito de compras</DialogTitle>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-500" aria-label="Cerrar panel">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <p className="text-gray-500">Tu carrito está vacío.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {cartItems.map(item => (
                    <li key={item.id} className="flex py-6">
                      {/* ... tu render de producto ... */}
                    </li>
                  ))}
                </ul>
              )}

              {cartItems.length > 0 && (
                <>
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <div className="flex justify-between font-medium text-gray-900">
                      <p>Subtotal</p>
                      <p>${subtotal.toFixed(2)}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">Envío e impuestos calculados al pagar.</p>
                    <div className="mt-6">
                      <Link href={`/${locale}/checkout`} onClick={() => setIsCartOpen(false)} className="w-full flex items-center justify-center bg-green-600 px-6 py-3 text-white font-medium rounded hover:bg-green-700">
                        Checkout
                      </Link>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-center text-sm text-gray-500">
                    <button onClick={() => setIsCartOpen(false)} className="font-medium text-green-600 hover:text-green-500">
                      Continuar comprando →
                    </button>
                  </div>
                </>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
