// app/[locale]/checkout/cancel/page.tsx
import { getDictionary } from '@/lib/dictionaries'
import CancelClient from './CancelClient'  

type Props = {
  params: Promise<{ locale: string }>
}

export default async function CancelPage({ params }: Props) {
  const { locale } = await params;
  const dict = await getDictionary(locale)
  return <CancelClient dict={dict} locale={locale} />
}
