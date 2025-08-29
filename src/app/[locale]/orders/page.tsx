import OrdersClient from './ui/OrdersClient'
import { getDictionary } from '@/lib/dictionaries'
import type { Dict } from '@/types/Dict'

type Props = {
  params: { locale: string }
}

export default async function OrdersPage({ params }: { params: Promise<Props['params']>}) {
  const { locale } = await params
  const dict: Dict = await getDictionary(locale)

  return (
    <OrdersClient
      locale={locale}
      // OrdersClient solo necesita `common` y `orders`
      dict={{ common: dict.common, orders: dict.orders }}
    />
  )
}
