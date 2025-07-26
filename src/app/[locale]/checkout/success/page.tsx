// app/[locale]/checkout/success/page.tsx
import { getDictionary } from '@/lib/dictionaries'
import SuccessClient from './SuccessClient'  

type Props = {
  params: Promise<{ locale: string }>
}

export default async function SuccessPage({ params }: Props) {
  const { locale } = await params;
  const dict = await getDictionary(locale)
  return <SuccessClient dict={dict} locale={locale} />
}
