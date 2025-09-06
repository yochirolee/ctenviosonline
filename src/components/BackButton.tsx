// src/components/BackButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

type Props = {
  label: string
  /** A dónde ir si no hay historial para volver */
  fallbackHref?: string
  className?: string
}

export default function BackButton({ label, fallbackHref = '/', className }: Props) {
  const router = useRouter()

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      onClick={goBack}
      className={
        className ??
        'inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 transition mb-4'
      }
      aria-label={label}
    >
      <ArrowLeft size={18} />
      <span className="underline underline-offset-2">{label}</span>
    </button>
  )
}
