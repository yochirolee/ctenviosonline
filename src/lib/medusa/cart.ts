export async function getOrCreateCart(
  customerId?: string,
  forceNew = false
): Promise<{ id: string }> {
  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const key = customerId ? `cart_id_${customerId}` : 'cart_id_guest';
  const storedId = typeof window !== 'undefined' ? localStorage.getItem(key) : null;

  // Headers básicos (Bearer solo si hay token)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // 1) Reusar carrito existente (si no se fuerza uno nuevo)
  if (!forceNew) {
    // a) Si está autenticado, intenta obtener el carrito abierto del usuario
    if (token && customerId) {
      try {
        const res = await fetch(`${API_URL}/cart`, { headers });
        if (res.ok) {
          const data = await res.json(); // { cart, items }
          if (data?.cart?.id) {
            localStorage.setItem(key, String(data.cart.id));
            return { id: String(data.cart.id) };
          }
        }
      } catch {
        /* ignora y sigue */
      }
    }

    // b) Si hay un id guardado, valida que exista
    if (storedId) {
      try {
        const res = await fetch(`${API_URL}/cart/${storedId}/items`, { headers });
        if (res.ok) return { id: storedId };
        localStorage.removeItem(key);
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  // 2) Crear un carrito nuevo
  const body = { customer_id: customerId || null };
  const createRes = await fetch(`${API_URL}/cart`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text().catch(() => '');
    throw new Error('No se pudo crear el carrito. ' + errorText);
  }

  const created = await createRes.json(); // devuelve el row de carts
  const newId = String(created.id);

  if (typeof window !== 'undefined') {
    localStorage.setItem(key, newId);
  }

  return { id: newId };
}
