'use client';
import SuccessClient from './SuccessClient';
import type { Dict } from '../../page';

export default function SuccessWrapper({
  dict,
  locale,
}: {
  dict: Dict;
  locale: string;
}) {
  return <SuccessClient dict={dict} locale={locale} />;
}
