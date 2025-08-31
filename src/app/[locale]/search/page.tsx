// app/[locale]/search/page.tsx
import { getDictionary } from '@/lib/dictionaries'
import type { Dict } from '@/types/Dict'
import SearchResultsClient from './SearchResultsClient'

type Params = { locale: string }
type SP = { q?: string | string[]; page?: string | string[] }

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams?: Promise<SP>
}) {
  const { locale } = await params
  const sp = (await (searchParams ?? Promise.resolve({} as SP))) as SP

  const qRaw = sp.q
  const pageRaw = sp.page

  const q = Array.isArray(qRaw) ? qRaw[0] ?? '' : qRaw ?? ''
  const pageStr = Array.isArray(pageRaw) ? pageRaw[0] ?? '1' : pageRaw ?? '1'
  const page = Math.max(1, Number(pageStr) || 1)

  const dict = (await getDictionary(locale)) as Dict

  return (
    <div className="px-4 md:px-12 lg:px-20 py-6">
      <h1 className="text-2xl font-bold">
        {locale === 'en' ? 'Search results' : 'Resultados de búsqueda'}
      </h1>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        {q ? `“${q}”` : locale === 'en' ? 'Type to search' : 'Escribe para buscar'}
      </p>

      <SearchResultsClient
        locale={locale}
        dict={dict}
        initialQuery={q}
        initialPage={page}
      />
    </div>
  )
}
