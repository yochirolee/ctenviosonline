import SuccessClient from './SuccessClient'
import { getDictionary } from '@/lib/dictionaries'

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params // si tu setup entrega params como Promise, así está bien
  const dict = await getDictionary(locale) // tu función ya es async/promesa

  return <SuccessClient dict={dict} locale={locale} />
}
