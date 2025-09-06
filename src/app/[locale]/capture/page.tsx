// app/[locale]/encargos/capture/page.tsx
import { redirect } from 'next/navigation'

function detectSource(u: string): 'amazon' | 'shein' | 'unknown' {
  try {
    const host = new URL(u).hostname.toLowerCase()
    if (host.includes('amazon.')) return 'amazon'
    if (host.includes('shein.')) return 'shein'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

function extractExternalId(u: string, source: string) {
  try {
    const url = new URL(u)
    if (source === 'amazon') {
      const m = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)
      return m?.[1]?.toUpperCase() ?? null
    }
    if (source === 'shein') {
      const m = url.pathname.match(/-p-(\d+)\.html/i)
      return m?.[1] ?? null
    }
    return null
  } catch {
    return null
  }
}

type Params = { locale: string }
type Search = { url?: string }

export default async function CapturePage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) {
  const { locale } = await params
  const { url } = await searchParams

  if (!url) redirect(`/${locale}/encargos`)

  const source = detectSource(url)
  const externalId = extractExternalId(url, source)
  const back = encodeURIComponent(url)

  redirect(`/${locale}/encargos/capture/confirm?source=${source}&id=${externalId ?? ''}&back=${back}`)
}
