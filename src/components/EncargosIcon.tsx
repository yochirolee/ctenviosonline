'use client'

import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { encargosListMine } from '@/lib/api'
import type { EncargosChangedDetail } from '@/types/encargos-events.d'

export default function EncargosIcon() {
  const [count, setCount] = useState<number | null>(null) // null para evitar flicker

  // Abre el drawer
  const openDrawer = () => {
    try { window.dispatchEvent(new CustomEvent('encargos:open')) } catch {}
  }

  // Carga/recarga el conteo
  const refreshCount = async () => {
    try {
      const items = await encargosListMine()
      setCount(Array.isArray(items) ? items.length : 0)
    } catch {
      setCount(0)
    }
  }

  useEffect(() => {
    // carga inicial
    refreshCount()

    // escucha cambios globales
    const onChanged = (ev: Event) => {
      const e = ev as CustomEvent<EncargosChangedDetail>
      const t = e.detail?.type
      if (t === 'removed') {
        setCount((prev) => Math.max(0, (prev ?? 0) - 1))
      } else if (t === 'cleared') {
        setCount(0)
      } else {
        // 'updated' u otros -> recargar
        void refreshCount()
      }
    }

    window.addEventListener('encargos:changed', onChanged as EventListener)
    return () => {
      window.removeEventListener('encargos:changed', onChanged as EventListener)
    }
  }, [])

  const showBadge = (count ?? 0) > 0

  return (
    <button
      onClick={openDrawer}
      className="relative p-2 rounded hover:bg-gray-100 transition"
      aria-label="Encargos"
      title="Encargos"
    >
      <ClipboardList className="h-5 w-5 text-gray-700" />

      {/* Badge solo si count > 0 */}
      {showBadge && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[11px] leading-[18px] text-center"
          aria-label={`${count} encargos`}
        >
          {count}
        </span>
      )}
      <span className="sr-only">Encargos</span>
    </button>
  )
}
