import OrderDetailClient from './OrderDetailClient'
import { getDictionary } from '@/lib/dictionaries'

type Params = { locale: string; id: string }

export default async function OrderDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params
  const dict = await getDictionary(locale)
  return <OrderDetailClient locale={locale} id={id} dict={dict as any} />
}
