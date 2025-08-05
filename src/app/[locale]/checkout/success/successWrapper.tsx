'use client';
import SuccessClient from './SuccessClient';
import type { Dict } from '@/types/Dict'

export default function SuccessWrapper({
  dict,
  locale,
}: {
  dict: Dict;
  locale: string;
}) {
  return <SuccessClient dict={dict} locale={locale} />;
}
