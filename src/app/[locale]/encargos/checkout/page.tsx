// app/[locale]/encargos/checkout/page.tsx
import { getDictionary } from '@/lib/dictionaries'
import EncargosCheckoutClient from './../EncargosCheckoutClient'
import type { Dict } from '@/types/Dict'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function EncargosCheckoutPage({ params }: Props) {
  const { locale } = await params
  const dict: Dict = await getDictionary(locale)

  return <EncargosCheckoutClient dict={dict} params={{ locale }} />
}
