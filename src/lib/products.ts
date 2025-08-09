'use server'

type SimplifiedProduct = {
  id: string
  name: string
  price: number
  imageSrc: string
  variant_id: string
}

type ProductFromAPI = {
  id: number | string
  title: string
  price: string | number
  image_url?: string
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

  const data: ProductFromAPI[] = await res.json()

  return data.map((p) => ({
    id: String(p.id),
    name: p.title,
    price: Number(p.price) * 100,
    imageSrc: p.image_url || '/product.webp',
    variant_id: String(p.id),
  }))
}
