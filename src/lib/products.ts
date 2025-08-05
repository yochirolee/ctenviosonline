'use server'

type Variant = {
  id: string
  calculated_price?: {
    calculated_amount: number
  }
}

type ProductResponse = {
  id: string
  title: string
  thumbnail?: string
  variants?: Variant[]
}

type SimplifiedProduct = {
  id: string
  name: string
  price: number
  imageSrc: string
  variant_id: string
}

export async function getProductsByCategory(category: string): Promise<SimplifiedProduct[]> {
  const collectionMap: Record<string, string> = {
    food: 'pcol_01K1BKFHYAGSD8SZT6J3ZRJ7EH',
    clothing: 'pcol_01K1BKEVX8V52QJM7HX4PSEHA0',
  }

  const collectionId = collectionMap[category]
  if (!collectionId) return []

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/products?collection_id=${collectionId}&region_id=reg_01K1BHAFZTHFHPNZ2YZJ5501H7`,
    {
      headers: {
        'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY!,
      },
      cache: 'no-store',
    }
  )

  const data = await res.json()

  const products = Array.isArray(data.products)
    ? data.products
        .filter((p: ProductResponse) => p.variants?.[0])
        .map((p: ProductResponse) => {
          const variant = p.variants![0]
          const price = variant.calculated_price?.calculated_amount ?? 0

          return {
            id: p.id,
            name: p.title,
            price,
            imageSrc: p.thumbnail ?? '/product.webp',
            variant_id: variant.id,
          }
        })
    : []

  return products
}
