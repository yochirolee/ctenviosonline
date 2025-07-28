'use client';

import { useEffect } from 'react';
import type { Dict } from '../../page';

export default function SuccessClient({
  dict,
  locale,
}: {
  dict: Dict;
  locale: string;
}) {
  useEffect(() => {
    const formData = JSON.parse(localStorage.getItem('formData') || '{}');
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    if (formData && cart.length > 0) {
      fetch('/api/checkout_success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, cartItems: cart }),
      }).catch(err => console.error('Error enviando correo:', err));
    }

    localStorage.removeItem('cart');
    localStorage.removeItem('formData');
  }, []);

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold">{dict.success.title}</h1>
      <p className="mt-4">{dict.success.message}</p>
      <a
        href={`/${locale}`}
        className="mt-6 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        {dict.success.continue}
      </a>
    </div>
  );
}
