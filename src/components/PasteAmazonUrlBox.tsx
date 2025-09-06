'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Clipboard } from 'lucide-react'

function extractASIN(raw: string) {
  if (!raw) return null
  const s = raw.trim()
  try {
    const u = new URL(s)
    const host = u.hostname.toLowerCase()

    // Enlaces cortos a.co → no intentamos ASIN, se resuelve luego en confirm
    if (host.endsWith('a.co')) return null

    // /dp/ASIN, /gp/product/ASIN, /gp/aw/d/ASIN, /-/dp/ASIN
    const m1 = u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|-\s*\/dp)\/([A-Z0-9]{10})(?:[/?]|$)/i)
    if (m1?.[1]) return m1[1].toUpperCase()

    // ?asin=XXXXXXXXXX
    const asinParam = u.searchParams.get('asin')
    if (asinParam && /^[A-Z0-9]{10}$/i.test(asinParam)) return asinParam.toUpperCase()

    return null
  } catch {
    return null
  }
}

export default function PasteAmazonUrlBox() {
  const [val, setVal] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()
  const { locale } = useParams() as { locale: string }

  const go = (text: string) => {
    setErr(null)
    const asin = extractASIN(text)
    // 🔁 Mantiene tu redirect original que ya funcionaba:
    router.push(    `/${locale}/capture/confirm?${asin ? `asin=${asin}&` : ''}back=${encodeURIComponent(text)}`)
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (val) go(val) }}
      className="flex flex-col gap-2"
      aria-label="Pegar enlace de Amazon"
    >
      {/* Grupo input estilo Amazon */}
      <div className="flex w-full overflow-hidden rounded-xl ring-1 ring-gray-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-amber-400">
        {/* Badge Amazon (desktop) */}
        <div className="hidden sm:flex items-center gap-2 px-3 bg-[#232F3E] text-white">
          <Image
            src="https://res.cloudinary.com/dz6nhejdd/image/upload/v1757163390/amazon_PNG13_eyld8b.png"
            alt="Amazon"
            width={20}
            height={20}
            className="h-5 w-auto"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide">Amazon</span>
        </div>

        {/* Campo (sin icono dentro del input) */}
        <input
          value={val}
          onChange={(e)=>setVal(e.target.value)}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text')
            if (t) {
              setVal(t)
              setTimeout(() => go(t), 0) // auto-continuar tras pegar
              e.preventDefault()
            }
          }}
          placeholder="Pega aquí el enlace del producto de Amazon"
          className="flex-1 px-3 py-3 text-sm outline-none placeholder:text-gray-400"
          inputMode="url"
          aria-invalid={!!err}
        />

        {/* Botón ámbar */}
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold px-4 sm:px-5"
          aria-label="Continuar"
        >
          <span className="hidden sm:inline">Continuar</span>
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      {/* Ayuda corta */}
      <p className="text-xs text-gray-600 flex items-center gap-1">
        <Clipboard className="h-3.5 w-3.5 text-gray-500" />
        Funciona con enlaces normales y cortos (por ejemplo, <code className="bg-gray-50 px-1 rounded">a.co/…</code>).
      </p>

      {err && <p className="text-xs text-red-600">{err}</p>}
    </form>
  )
}
