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
import type { Dict } from '@/types/Dict'
import { CUBA_PROVINCES, MUNICIPIOS_CUBA, normalizeCubaProvince, normalizeCubaMunicipality } from '@/lib/cuLocations'

type Mode = 'list' | 'create' | 'edit'
type CountryTab = 'CU' | 'US'

type RecipientsDict = {
  title: string
  new: string
  empty: string
  default_badge: string
  set_default: string
  edit: string
  delete: string
  confirm_delete: string
  notes_label: string
  label_placeholder: string
  select_state: string
  save: string
  update: string
  toasts: {
    created: string
    updated: string
    deleted: string
    made_default: string
    save_failed: string
    delete_failed: string
    default_failed: string
  }
}

// Recibimos un Dict que incluye la sección recipients
type Props = { dict: Dict & { recipients: RecipientsDict } }

// Form amplio (evita unión CU/US en el estado local)
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
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY'
] as const

export default function RecipientsBook({ dict }: Props) {
  const R = dict.recipients

  const [items, setItems] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('list')
  const [editing, setEditing] = useState<Recipient | null>(null)
  const [tab, setTab] = useState<CountryTab>('CU')

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
    province: '',
    municipality: '',
    address: '',
    ci: '',
  })

  // Confirmación de borrado (modal)
  const [confirmDel, setConfirmDel] = useState<{ id: number; name: string } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const requestDelete = (r: Recipient) => {
    const name = `${r.first_name} ${r.last_name}`.trim() || r.label || ''
    setConfirmDel({ id: r.id, name })
  }

  const confirmDelete = async () => {
    if (!confirmDel) return
    try {
      setDeletingId(confirmDel.id)
      await deleteRecipient(confirmDel.id)
      toast.success(R.toasts.deleted)
      await load()
    } catch {
      toast.error(R.toasts.delete_failed)
    } finally {
      setDeletingId(null)
      setConfirmDel(null)
    }
  }

  const muniOptions = useMemo(
    () => (form.province ? (MUNICIPIOS_CUBA[form.province] || []) : []),
    [form.province]
  )
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

  useEffect(() => { void load() }, [])

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
      const prov = normalizeCubaProvince(r.province) || r.province
      const mun = normalizeCubaMunicipality(prov, r.municipality) || r.municipality
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
        province: prov,
        municipality: mun,
        address: r.address,
        ci: r.ci,
      })
      setTab('CU')
      setMode('edit')
      return
    }
    else {
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

  const setField = <K extends keyof RecipientForm>(k: K, v: RecipientForm[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  // Validación mínima (backend revalida)
  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    const ce = dict.checkout.errors

    if (!form.first_name) e.first_name = ce.nombre
    if (!form.last_name) e.last_name = ce.apellidos

    if (tab === 'CU') {
      if (!form.province) e.province = ce.provincia
      if (!form.municipality) e.municipio = ce.municipio
      if (!form.address) e.address = ce.address
      if (!/^\d{11}$/.test(String(form.ci ?? ''))) e.ci = ce.ci
      if (!/^[0-9]{8,}$/.test(String(form.phone ?? '').replace(/\D/g, ''))) e.phone = ce.telefono
    } else {
      if (!form.address_line1) e.address_line1 = ce.address1eu
      if (!form.city) e.city = ce.cityeu
      if (!form.state) e.state = ce.stateeu
      if (!/^\d{5}(-\d{4})?$/.test(String(form.zip ?? ''))) e.zip = ce.zipeu
      if (!/^\d{10}$/.test(String(form.phone ?? '').replace(/\D/g, ''))) e.phone = ce.telefonoeu
    }
    return e
  }, [form, tab, dict.checkout.errors])

  const hasErrors = Object.keys(errors).length > 0

  const handleSubmit = async () => {
    if (hasErrors) {
      toast.error(dict.common.required_fields)
      return
    }
    try {
      if (mode === 'create') {
        if (form.country === 'CU') {
          const payload: CreateRecipientCUInput = {
            country: 'CU',
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            label: form.label || undefined,
            notes: form.notes || undefined,
            is_default: !!form.is_default,
            instructions: form.instructions || undefined,
            province: form.province!,           // validados arriba
            municipality: form.municipality!,
            address: form.address!,
            ci: form.ci!,
          }
          await createRecipient(payload)
        } else {
          const payload: CreateRecipientUSInput = {
            country: 'US',
            first_name: form.first_name,
            last_name: form.last_name,
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
        toast.success(R.toasts.created)
      } else if (mode === 'edit' && editing) {
        const patch: UpdateRecipientInput = { ...form }
        await updateRecipient(editing.id, patch)
        toast.success(R.toasts.updated)
      }
      await load()
      onCancel()
    } catch {
      toast.error(R.toasts.save_failed)
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultRecipient(id)
      toast.success(R.toasts.made_default)
      await load()
    } catch {
      toast.error(R.toasts.default_failed)
    }
  }

  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-gray-800">
          {R.title}
        </h2>
        {mode === 'list' && (
          <button
            onClick={onCreate}
            className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            {R.new}
          </button>
        )}
      </div>

      {/* LISTA */}
      {mode === 'list' && (
        <div className="p-4 sm:p-6">
          {loading && <div className="text-gray-500">{dict.common.loading}</div>}
          {!loading && items.length === 0 && (
            <div className="text-gray-500">{R.empty}</div>
          )}
          <div className="divide-y">
            {items.map((r) => (
              <div key={r.id} className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0 text-sm text-gray-800">
                  <div className="font-medium">
                    {r.first_name} {r.last_name}{' '}
                    {r.label ? <span className="text-gray-500">· {r.label}</span> : null}
                    {r.is_default ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-emerald-700">
                        {R.default_badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-gray-600">
                    {r.country === 'CU' ? (
                      <>
                        {dict.location_banner.country_cu} — {r.province} / {r.municipality}. {r.address}
                        {r.ci ? ` · CI: ${r.ci}` : ''}
                      </>
                    ) : (
                      <>
                        {dict.location_banner.country_us} — {r.address_line1}
                        {r.address_line2 ? `, ${r.address_line2}` : ''}, {r.city}, {r.state} {r.zip}
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
                      onClick={() => void handleSetDefault(r.id)}
                      className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
                    >
                      {R.set_default}
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(r)}
                    className="px-3 py-2 rounded  bg-green-600 text-white hover: bg-green-700"
                  >
                    {R.edit}
                  </button>
                  <button
                    onClick={() => requestDelete(r)}
                    className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    {R.delete}
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
              onClick={() => { setTab('CU'); setField('country', 'CU') }}
              className={`px-3 py-1 rounded border ${tab === 'CU' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              {dict.location_banner.country_cu}
            </button>
            <button
              type="button"
              onClick={() => { setTab('US'); setField('country', 'US') }}
              className={`px-3 py-1 rounded border ${tab === 'US' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              {dict.location_banner.country_us}
            </button>
          </div>

          {/* Comunes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.first_name}</label>
              <input className="input" value={form.first_name} onChange={e => setField('first_name', e.target.value)} />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.last_name}</label>
              <input className="input" value={form.last_name} onChange={e => setField('last_name', e.target.value)} />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {tab === 'US' ? dict.checkout.phoneeu : dict.checkout.phone}
              </label>
              <input
                className="input"
                value={form.phone ?? ''}
                onChange={e => setField('phone', e.target.value)}
                placeholder={tab === 'US' ? '10' : '8'}
                inputMode="tel"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.email}</label>
              <input className="input" value={form.email ?? ''} onChange={e => setField('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{dict.checkout.label ?? 'Etiqueta'}</label>
              <input className="input" value={form.label ?? ''} onChange={e => setField('label', e.target.value)} placeholder={R.label_placeholder} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_default"
                type="checkbox"
                checked={!!form.is_default}
                onChange={e => setField('is_default', e.target.checked)}
              />
              <label htmlFor="is_default" className="text-sm text-gray-700">{R.default_badge}</label>
            </div>
          </div>

          {/* CU */}
          {tab === 'CU' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.province}</label>
                <select
                  className="input"
                  value={form.province ?? ''}
                  onChange={e => { setField('province', e.target.value); setField('municipality', '') }}
                >
                  <option value="">{dict.location_banner.province_placeholder}</option>
                  {CUBA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}

              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.municipality}</label>
                <select
                  className="input"
                  value={form.municipality ?? ''}
                  onChange={e => setField('municipality', e.target.value)}
                  disabled={!form.province}
                >
                  <option value="">{dict.location_banner.municipality_placeholder}</option>
                  {muniOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {'municipio' in errors && <p className="text-red-500 text-xs mt-1">{errors.municipio}</p>}

              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.addressExact}</label>
                <input
                  className="input"
                  value={form.address ?? ''}
                  onChange={e => setField('address', e.target.value)}
                  placeholder={dict.checkout.addressExact_placeholder}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>
              <div className="md:max-w-xs">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.ci} (11)</label>
                <input className="input" value={form.ci ?? ''} onChange={e => setField('ci', e.target.value)} />
                {errors.ci && <p className="text-red-500 text-xs mt-1">{errors.ci}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.instructions_label}</label>
                <input className="input" value={form.instructions ?? ''} onChange={e => setField('instructions', e.target.value)} />
              </div>
            </div>
          )}

          {/* US */}
          {tab === 'US' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.address1eu}</label>
                <input className="input" value={form.address_line1 ?? ''} onChange={e => setField('address_line1', e.target.value)} />
                {errors.address_line1 && <p className="text-red-500 text-xs mt-1">{errors.address_line1}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.address2eu}</label>
                <input className="input" value={form.address_line2 ?? ''} onChange={e => setField('address_line2', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.cityeu}</label>
                <input className="input" value={form.city ?? ''} onChange={e => setField('city', e.target.value)} />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.stateeu}</label>
                <select className="input" value={form.state ?? ''} onChange={e => setField('state', e.target.value)}>
                  <option value="">{R.select_state}</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
              </div>
              <div className="md:max-w-xs">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.zipeu}</label>
                <input className="input" value={form.zip ?? ''} onChange={e => setField('zip', e.target.value)} />
                {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{dict.checkout.instructions_label}</label>
                <input className="input" value={form.instructions ?? ''} onChange={e => setField('instructions', e.target.value)} />
              </div>
            </div>
          )}

          {/* notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700">{R.notes_label}</label>
            <textarea className="input" rows={2} value={form.notes ?? ''} onChange={e => setField('notes', e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => void handleSubmit()}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            >
              {mode === 'create' ? R.save : R.update}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded bg-gray-200"
            >
              {dict.common.cancel}
            </button>
          </div>
        </div>
      )}

      {confirmDel && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-del-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg border">
            <div className="px-5 py-4 border-b">
              <h3 id="confirm-del-title" className="text-base font-semibold text-gray-900">
                {R.delete}
              </h3>
            </div>

            <div className="px-5 py-4 text-sm text-gray-700">
              <p className="mb-2">{R.confirm_delete}</p>
              {confirmDel.name ? (
                <p className="text-gray-500">
                  <span className="font-medium">{confirmDel.name}</span>
                </p>
              ) : null}
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
                onClick={() => (!deletingId ? setConfirmDel(null) : null)}
                disabled={deletingId !== null}
              >
                {dict.common.cancel}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={() => void confirmDelete()}
                disabled={deletingId !== null}
              >
                {deletingId === confirmDel.id ? dict.common.loading : R.delete}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}
