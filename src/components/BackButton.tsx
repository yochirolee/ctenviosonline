// src/components/BackButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ label }: { label: string }) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition mb-4"
    >
      <ArrowLeft size={18} />
      <span className="underline underline-offset-2">{label}</span>
    </button>
  )
}
