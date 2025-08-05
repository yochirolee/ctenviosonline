export async function checkCustomerAuth(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false

    const res = await fetch('http://localhost:9000/store/customers/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY || '',
      },
    })

    if (!res.ok) return false

    const data = await res.json()
    console.log('userdata:', res)
    // Soporta respuestas con o sin "customer"
    return !!(data?.customer || data?.id)
  } catch (error) {
    console.error('Error in checkCustomerAuth:', error)
    return false
  }
}
