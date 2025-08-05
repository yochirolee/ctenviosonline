export async function getLatestCustomerCart(token: string) {
    const cartId = localStorage.getItem('medusa_cart_id')
    if (!cartId) return null
  
    const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
    const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_API_KEY
  
    const res = await fetch(`${API_URL}/store/carts/${cartId}`, {
      headers: {
        'x-publishable-api-key': API_KEY || '',
        Authorization: `Bearer ${token}`,
      },
    })
  
    if (!res.ok) {
      console.warn('[getLatestCustomerCart] No se pudo obtener el carrito:', res.status)
      return null
    }
  
    const data = await res.json()
    return data.cart
  }
  