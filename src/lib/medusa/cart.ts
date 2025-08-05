export async function getOrCreateCart(customerId?: string, forceNew = false): Promise<{ id: string }> {
  const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_API_KEY
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const key = customerId ? `medusa_cart_id_${customerId}` : 'medusa_cart_id_guest'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': API_KEY || '',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let cartId = typeof window !== 'undefined' ? localStorage.getItem(key) : null

  if (!forceNew && cartId) {
    const res = await fetch(`${API_URL}/store/carts/${cartId}`, { headers })
    if (res.ok) {
      const data = await res.json()
      return { id: data.cart.id }
    } else {
      localStorage.removeItem(key)
    }
  }

  const res = await fetch(`${API_URL}/store/carts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error('No se pudo crear el carrito: ' + error)
  }

  const data = await res.json()
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, data.cart.id)
  }

  return { id: data.cart.id }
}
