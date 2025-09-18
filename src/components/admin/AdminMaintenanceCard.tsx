'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Wrench, ShieldAlert } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

type MaintMode = 'off' | 'admin_only' | 'full'
type MaintState = { mode: MaintMode; message?: string | null }

function useMaintenanceState() {
  const [state, setState] = useState<MaintState>({ mode: 'off', message: '' })
  const [loading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save(next: MaintState) {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const r = await fetch(`${API_URL}/admin/maintenance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode: next.mode, message: next.message ?? '' }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) {
        toast.error(data?.error || data?.message || 'No se pudo guardar el estado de mantenimiento')
        return
      }
      setState(next)
      toast.success('Configuración de mantenimiento guardada')
    } catch (e: any) {
      toast.error(e?.message || 'Error guardando mantenimiento')
    } finally {
      setSaving(false)
    }
  }

  return { state, setState, loading, saving, save }
}

export default function AdminMaintenanceCard() {
  const { state, setState, loading, saving, save } = useMaintenanceState()

  const confirmAndSave = async () => {
    if (state.mode === 'full') {
      const ok = window.confirm(
        'Vas a activar Mantenimiento TOTAL.\n• Los endpoints públicos se desactivarán.\n• Sólo este panel seguirá accesible.\n\n¿Confirmas?'
      )
      if (!ok) return
    }
    await save(state)
  }

  return (
    <div className="p-6 bg-white rounded shadow space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="text-emerald-600" />
          <h2 className="text-lg font-semibold">Mantenimiento</h2>
        </div>
        
      </div>

      <p className="text-sm text-gray-600">
        Controla el modo de mantenimiento del sitio. En <strong>admin_only</strong> sólo podrán usar la API los
        administradores autenticados. En <strong>full</strong> se bloquean los endpoints públicos (quedan abiertos
        <code className="px-1">/admin/maintenance</code>, <code className="px-1">/health</code> y los webhooks que
        configuraste).
      </p>

      <fieldset className="grid sm:grid-cols-3 gap-3">
        {[
          { value: 'off', label: 'Normal (off)', desc: 'Sitio operativo.' },
          { value: 'admin_only', label: 'Mantenimiento (admin puede usar)', desc: 'Sólo admins pueden usar la API.' },
          { value: 'full', label: 'Mantenimiento total', desc: 'Sólo este panel / health / webhooks.' },
        ].map((opt) => (
          <label
            key={opt.value}
            className={[
              'rounded-xl border p-3 cursor-pointer transition',
              state.mode === (opt.value as MaintMode)
                ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50'
                : 'border-gray-200 hover:border-emerald-300',
            ].join(' ')}
          >
            <input
              type="radio"
              name="maint_mode"
              className="sr-only"
              checked={state.mode === (opt.value as MaintMode)}
              onChange={() => setState((s) => ({ ...s, mode: opt.value as MaintMode }))}
            />
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs text-gray-600">{opt.desc}</div>
          </label>
        ))}
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Mensaje para visitantes (opcional)
        </label>
        <textarea
          className="mt-1 w-full rounded border p-2 text-sm"
          rows={3}
          placeholder="Ej: Estamos haciendo mantenimiento programado. Volvemos pronto."
          value={state.message ?? ''}
          onChange={(e) => setState((s) => ({ ...s, message: e.target.value }))}
        />
       
      </div>

      <div className="flex items-center justify-between">
        {state.mode !== 'off' ? (
          <div className="inline-flex items-center gap-2 text-amber-700">
            <ShieldAlert size={16} />
            <span className="text-sm">
              Modo activo: <strong>{state.mode}</strong>
            </span>
          </div>
        ) : <span />}

        <button
          onClick={confirmAndSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
