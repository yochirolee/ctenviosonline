export async function checkCustomerAuth(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false

    const res = await fetch('http://localhost:4000/customers/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) return false

    const data = await res.json()
    return !!data.id
  } catch (err) {
    console.error('Error checking auth:', err)
    return false
  }
}