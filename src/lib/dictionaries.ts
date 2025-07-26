// lib/dictionaries.ts
import 'server-only'
import type { Dict } from '@/app/[locale]/page'  // Importa el tipo Dict desde donde lo defines

const dictionaries = {
  en: () => import('@/locales/en/common.json').then((mod) => mod.default as unknown as Dict),
  es: () => import('@/locales/es/common.json').then((mod) => mod.default as unknown as Dict),
}

export const getDictionary = async (locale: string): Promise<Dict> => {
  if (!(locale in dictionaries)) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  return dictionaries[locale as keyof typeof dictionaries]()
}