import CheckoutClient from './CheckoutClient'
import { getDictionary } from '@/lib/dictionaries'
import type { Dict } from '@/types/Dict'

type Props = {
  params: { locale: string }
}

export default async function CheckoutPage({ params }: { params: Promise<Props['params']> }) {
  const { locale } = await params
  const dict: Dict = await getDictionary(locale)

  return <CheckoutClient dict={dict} />
}
