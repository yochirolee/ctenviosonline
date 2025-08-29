// app/[locale]/search/page.tsx
import { getDictionary } from '@/lib/dictionaries'
import type { Dict } from '@/types/Dict'
import SearchResultsClient from './SearchResultsClient' // 👈 importa el cliente

type Params = { locale: string }
type SP = { q?: string; page?: string }

async function resolve<T>(p: T | Promise<T>): Promise<T> {
  return (p as any)?.then ? await (p as Promise<T>) : (p as T)
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Params | Promise<Params>
  searchParams: SP | Promise<SP>
}) {
  const { locale } = await resolve(params)
  const sp = await resolve(searchParams)

  const q = (sp.q ?? '').toString()
  const page = Math.max(1, Number(sp.page ?? '1') || 1)

  const dict = (await getDictionary(locale)) as Dict

  return (
    <div className="px-4 md:px-12 lg:px-20 py-6">
      <h1 className="text-2xl font-bold">
        {locale === 'en' ? 'Search results' : 'Resultados de búsqueda'}
      </h1>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        {q ? `“${q}”` : locale === 'en' ? 'Type to search' : 'Escribe para buscar'}
      </p>

      {/* 👇 ahora sí renderiza el cliente */}
      <SearchResultsClient
        locale={locale}
        dict={dict}
        initialQuery={q}
        initialPage={page}
      />
    </div>
  )
}
