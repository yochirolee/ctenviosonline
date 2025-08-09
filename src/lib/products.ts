'use server'

type Variant = {
  id: string
  calculated_price?: {
    calculated_amount: number
  }
}

type SimplifiedProduct = {
  id: string
  name: string
  price: number
  imageSrc: string
  variant_id: string
}

export async function getProductsByCategory(category: string): Promise<SimplifiedProduct[]> {
  const categoryMap: Record<string, number> = {
    food: 1,
    clothing: 2,
    medicine: 3,
    appliances: 4,
    hygiene: 5,
    technology: 6,
  }

  const categoryId = categoryMap[category]
  if (!categoryId) return []

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/products?category_id=${categoryId}`, {
    cache: 'no-store',
  })

  if (!res.ok) return []

  const data = await res.json()

  return data.map((p: any) => ({
    id: p.id,
    name: p.title,
    price: parseFloat(p.price) * 100, // como tenías en el front
    imageSrc: p.image_url || '/product.webp',
    variant_id: p.id.toString(), // simulando variant_id con id
  }))
}



