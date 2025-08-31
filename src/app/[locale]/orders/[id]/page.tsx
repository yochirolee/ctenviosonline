import OrderDetailClient from './OrderDetailClient'
import { getDictionary } from '@/lib/dictionaries'
import type { Dict } from '@/types/Dict'

type Params = { locale: string; id: string }

export default async function OrderDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params
  const dict: Dict = await getDictionary(locale)
  return <OrderDetailClient locale={locale} id={id} dict={dict} />
}
