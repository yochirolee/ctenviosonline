export async function getLatestCustomerCart(token: string) {
  const cartId = localStorage.getItem('cart_id')
  if (!cartId) return null

  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const res = await fetch(`${API_URL}/carts/${cartId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    console.warn('[getLatestCustomerCart] No se pudo obtener el carrito:', res.status)
    return null
  }

  const data = await res.json()
  return data
}
