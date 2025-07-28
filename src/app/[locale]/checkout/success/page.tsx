import { getDictionary } from '@/lib/dictionaries';
import SuccessWrapper from './successWrapper';

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return <SuccessWrapper dict={dict} locale={locale} />;
}
