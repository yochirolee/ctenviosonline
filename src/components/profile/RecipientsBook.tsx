'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  listRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
  setDefaultRecipient,
  type Recipient,
  type RecipientCountry,
  type CreateRecipientCUInput,
  type CreateRecipientUSInput,
  type UpdateRecipientInput,
} from '@/lib/recipients'

type Mode = 'list' | 'create' | 'edit'
type CountryTab = 'CU' | 'US'

// Tipo de formulario “amplio”: incluye TODOS los campos como opcionales.
// Así evitamos el error de la unión (US|CU).
type RecipientForm = {
  country: RecipientCountry
  first_name: string
  last_name: string
  email?: string
  phone?: string
  label?: string
  notes?: string
  is_default?: boolean
  instructions?: string
  // CU
  province?: string
  municipality?: string
  address?: string
  ci?: string
  // US
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zip?: string
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
]

export default function RecipientsBook() {
  const [items, setItems] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('list')
  const [editing, setEditing] = useState<Recipient | null>(null)
  const [tab, setTab] = useState<CountryTab>('CU')

  // ----- estado del form (sin uniones) -----
  const [form, setForm] = useState<RecipientForm>({
    country: 'CU',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    label: '',
    notes: '',
    is_default: false,
    instructions: '',
    // CU por defecto
    province: '',
    municipality: '',
    address: '',
    ci: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const rows = await listRecipients()
      setItems(rows)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resetForm = (country: CountryTab = 'CU') => {
    setForm({
      country,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      label: '',
      notes: '',
      is_default: false,
      instructions: '',
      ...(country === 'CU'
        ? { province: '', municipality: '', address: '', ci: '' }
        : { address_line1: '', address_line2: '', city: '', state: '', zip: '' }),
    })
  }

  const onCreate = () => {
    setEditing(null)
    setTab('CU')
    resetForm('CU')
    setMode('create')
  }

  const onEdit = (r: Recipient) => {
    setEditing(r)
    setTab(r.country)
    if (r.country === 'CU') {
      setForm({
        country: 'CU',
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email || '',
        phone: r.phone || '',
        label: r.label || '',
        notes: r.notes || '',
        is_default: !!r.is_default,
        instructions: r.instructions || '',
        province: r.province,
        municipality: r.municipality,
        address: r.address,
        ci: r.ci,
      })
    } else {
      setForm({
        country: 'US',
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email || '',
        phone: r.phone || '',
        label: r.label || '',
        notes: r.notes || '',
        is_default: !!r.is_default,
        instructions: r.instructions || '',
        address_line1: r.address_line1,
        address_line2: r.address_line2 || '',
        city: r.city,
        state: r.state,
        zip: r.zip,
      })
    }
    setMode('edit')
  }

  const onCancel = () => {
    setEditing(null)
    setMode('list')
  }

  const setField = (k: keyof RecipientForm, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v as any }))

  // ---- validación mínima (el backend valida otra vez) ----
  const errors = useMemo(() => {
    const e: Record<string,string> = {}
    if (!form.first_name) e.first_name = 'Requerido'
    if (!form.last_name)  e.last_name  = 'Requerido'

    if (tab === 'CU') {
      if (!form.province) e.province = 'Requerido'
      if (!form.municipality) e.municipality = 'Requerido'
      if (!form.address) e.address = 'Requerido'
      if (!/^\d{11}$/.test(String(form.ci || ''))) e.ci = 'CI inválido (11 dígitos)'
      if (!/^[0-9]{8,}$/.test(String(form.phone || '').replace(/\D/g,''))) e.phone = 'Teléfono inválido (8+ dígitos)'
    } else {
      if (!form.address_line1) e.address_line1 = 'Requerido'
      if (!form.city) e.city = 'Requerido'
      if (!form.state) e.state = 'Requerido'
      if (!/^\d{5}(-\d{4})?$/.test(String(form.zip || ''))) e.zip = 'ZIP inválido'
      if (!/^\d{10}$/.test(String(form.phone || '').replace(/\D/g,''))) e.phone = 'Teléfono US inválido (10 dígitos)'
    }
    return e
  }, [form, tab])

  const hasErrors = Object.keys(errors).length > 0

  const handleSubmit = async () => {
    if (hasErrors) {
      toast.error('Revisa los campos del formulario')
      return
    }
    try {
      if (mode === 'create') {
        // construir payload estrictamente tipado según country
        if (form.country === 'CU') {
          const payload: CreateRecipientCUInput = {
            country: 'CU',
            first_name: form.first_name,
            last_name:  form.last_name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            label: form.label || undefined,
            notes: form.notes || undefined,
            is_default: !!form.is_default,
            instructions: form.instructions || undefined,
            province: form.province!,           // seguros tras validación
            municipality: form.municipality!,
            address: form.address!,
            ci: form.ci!,
          }
          await createRecipient(payload)
        } else {
          const payload: CreateRecipientUSInput = {
            country: 'US',
            first_name: form.first_name,
            last_name:  form.last_name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            label: form.label || undefined,
            notes: form.notes || undefined,
            is_default: !!form.is_default,
            instructions: form.instructions || undefined,
            address_line1: form.address_line1!,
            address_line2: form.address_line2 || undefined,
            city: form.city!,
            state: form.state!,
            zip: form.zip!,
          }
          await createRecipient(payload)
        }
        toast.success('Destinatario creado')
      } else if (mode === 'edit' && editing) {
        // En update, puedes mandar PATCH parcial (usa el mismo form “ancho”)
        const patch: UpdateRecipientInput = { ...form }
        await updateRecipient(editing.id, patch)
        toast.success('Destinatario actualizado')
      }
      await load()
      onCancel()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar destinatario?')) return
    try {
      await deleteRecipient(id)
      toast.success('Eliminado')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo eliminar')
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultRecipient(id)
      toast.success('Marcado como predeterminado')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo marcar por defecto')
    }
  }

  // ---- UI ----
  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-gray-800">
          Destinatarios de envío
        </h2>
        {mode === 'list' && (
          <button
            onClick={onCreate}
            className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Nuevo destinatario
          </button>
        )}
      </div>

      {/* LISTA */}
      {mode === 'list' && (
        <div className="p-4 sm:p-6">
          {loading && <div className="text-gray-500">Cargando…</div>}
          {!loading && items.length === 0 && (
            <div className="text-gray-500">Aún no tienes destinatarios guardados.</div>
          )}
          <div className="divide-y">
            {items.map(r => (
              <div key={r.id} className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0 text-sm text-gray-800">
                  <div className="font-medium">
                    {r.first_name} {r.last_name}{' '}
                    {r.label ? <span className="text-gray-500">· {r.label}</span> : null}
                    {r.is_default ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        Predeterminado
                      </span>
                    ) : null}
                  </div>
                  <div className="text-gray-600">
                    {r.country === 'CU' ? (
                      <>
                        Cuba — {r.province} / {r.municipality}. {r.address}
                        {r.ci ? ` · CI: ${r.ci}` : ''}
                      </>
                    ) : (
                      <>
                        EE. UU. — {r.address_line1}{r.address_line2 ? `, ${r.address_line2}` : ''}, {r.city}, {r.state} {r.zip}
                      </>
                    )}
                  </div>
                  <div className="text-gray-600">
                    {r.phone || '—'} {r.email ? `· ${r.email}` : ''}
                  </div>
                  {r.notes && <div className="text-gray-500 italic">{r.notes}</div>}
                </div>

                <div className="flex gap-2 sm:ml-4">
                  {!r.is_default && (
                    <button
                      onClick={() => handleSetDefault(r.id)}
                      className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
                    >
                      Predeterminar
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(r)}
                    className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORM */}
      {mode !== 'list' && (
        <div className="p-4 sm:p-6 space-y-4">
          {/* Tabs país */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setTab('CU'); setField('country','CU') }}
              className={`px-3 py-1 rounded border ${tab==='CU' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              Cuba
            </button>
            <button
              type="button"
              onClick={() => { setTab('US'); setField('country','US') }}
              className={`px-3 py-1 rounded border ${tab==='US' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              Estados Unidos
            </button>
          </div>

          {/* Comunes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input className="input" value={form.first_name} onChange={e => setField('first_name', e.target.value)} />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Apellidos</label>
              <input className="input" value={form.last_name} onChange={e => setField('last_name', e.target.value)} />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input className="input" value={form.phone || ''} onChange={e => setField('phone', e.target.value)} placeholder={tab==='US'?'10 dígitos':'8+ dígitos'} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email (opcional)</label>
              <input className="input" value={form.email || ''} onChange={e => setField('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Etiqueta (opcional)</label>
              <input className="input" value={form.label || ''} onChange={e => setField('label', e.target.value)} placeholder="Ej: Mamá Habana" />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_default"
                type="checkbox"
                checked={!!form.is_default}
                onChange={e => setField('is_default', e.target.checked)}
              />
              <label htmlFor="is_default" className="text-sm text-gray-700">Marcar como predeterminado</label>
            </div>
          </div>

          {/* CU */}
          {tab === 'CU' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Provincia</label>
                <input className="input" value={form.province || ''} onChange={e => setField('province', e.target.value)} />
                {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Municipio</label>
                <input className="input" value={form.municipality || ''} onChange={e => setField('municipality', e.target.value)} />
                {errors.municipality && <p className="text-red-500 text-xs mt-1">{errors.municipality}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Dirección exacta</label>
                <input className="input" value={form.address || ''} onChange={e => setField('address', e.target.value)} />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>
              <div className="md:max-w-xs">
                <label className="block text-sm font-medium text-gray-700">CI (11 dígitos)</label>
                <input className="input" value={form.ci || ''} onChange={e => setField('ci', e.target.value)} />
                {errors.ci && <p className="text-red-500 text-xs mt-1">{errors.ci}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Instrucciones (opcional)</label>
                <input className="input" value={form.instructions || ''} onChange={e => setField('instructions', e.target.value)} />
              </div>
            </div>
          )}

          {/* US */}
          {tab === 'US' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Dirección (línea 1)</label>
                <input className="input" value={form.address_line1 || ''} onChange={e => setField('address_line1', e.target.value)} />
                {errors.address_line1 && <p className="text-red-500 text-xs mt-1">{errors.address_line1}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Dirección (línea 2) — opcional</label>
                <input className="input" value={form.address_line2 || ''} onChange={e => setField('address_line2', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                <input className="input" value={form.city || ''} onChange={e => setField('city', e.target.value)} />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <select className="input" value={form.state || ''} onChange={e => setField('state', e.target.value)}>
                  <option value="">Seleccione</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
              </div>
              <div className="md:max-w-xs">
                <label className="block text-sm font-medium text-gray-700">ZIP</label>
                <input className="input" value={form.zip || ''} onChange={e => setField('zip', e.target.value)} />
                {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Instrucciones (opcional)</label>
                <input className="input" value={form.instructions || ''} onChange={e => setField('instructions', e.target.value)} />
              </div>
            </div>
          )}

          {/* notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea className="input" rows={2} value={form.notes || ''} onChange={e => setField('notes', e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {mode === 'create' ? 'Guardar destinatario' : 'Actualizar'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
