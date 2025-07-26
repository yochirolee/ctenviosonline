import { getDictionary } from '@/lib/dictionaries'
import { getProductsByCategory } from '@/lib/products'
import CategoryPageClient from './CategoryPageClient'

type Props = {
  params: Promise<{ locale: string; category: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  const dict = await getDictionary(locale);
  const products = getProductsByCategory(category);

  return <CategoryPageClient params={{ locale, category }} dict={dict} products={products} />
}
