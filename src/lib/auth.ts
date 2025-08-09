// src/lib/auth.ts
export async function checkCustomerAuth(): Promise<boolean> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return false

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

    const res = await fetch(`${API_URL}/customers/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      // si el token expiró o es inválido, limpialo
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token')
      }
      return false
    }

    const data = await res.json().catch(() => null)
    // tu /customers/me devuelve el objeto plano del customer
    return Boolean(data?.id)
  } catch (error) {
    console.error('Error in checkCustomerAuth:', error)
    return false
  }
}
