"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function CartIcon() {
  const { cartItems, setIsCartOpen } = useCart();
  const total = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <button
      onClick={() => setIsCartOpen(true)}
      className="relative ml-4"
      aria-label="Abrir carrito"
    >
      <ShoppingCart className="w-6 h-6  text-gray-800 sm: text-gray-800 hover:text-green-300" />
      {total > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {total}
        </span>
      )}
    </button>
  );
}
