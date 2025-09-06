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

export default function Capture({ searchParams }: { searchParams: { url?: string } }) {
  const target = searchParams?.url
  if (!target) redirect('../encargos')

  const source = detectSource(target)
  const externalId = extractExternalId(target, source)
  const back = encodeURIComponent(target)

  redirect(`./capture/confirm?source=${source}&id=${externalId ?? ''}&back=${back}`)
}
