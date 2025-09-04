import { getDictionary } from '@/lib/dictionaries'
import AccountPageClient from './AccountPageClient'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params
  const dict = await getDictionary(locale)
  return <AccountPageClient locale={locale} dict={dict} />
}
