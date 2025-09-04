'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { useCustomer } from '@/context/CustomerContext'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

type Dict = {
  common?: { back?: string }
}

type Props = {
  locale: string
  dict: Dict
}

// Extiende el tipo del customer para campos opcionales que tu backend podría devolver
type CustomerExtras = {
  phone?: string
  address?: string
}

export default function AccountPageClient({ locale, dict }: Props) {
  const router = useRouter()
  const { customer, loading, refreshCustomer } = useCustomer()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const firstErrorKeyRef = useRef<string | null>(null)

  // ====== iOS viewport fix (altura estable con teclado) ======
  useEffect(() => {
    const apply = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--svh', `${h}px`)
    }
    apply()
    const vv: VisualViewport | null = window.visualViewport ?? null
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('orientationchange', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('orientationchange', apply)
    }
  }, [])

  // Precarga desde el contexto
  useEffect(() => {
    if (!loading && customer) {
      const c = customer as unknown as CustomerExtras
      setForm({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: c.phone || '',
        address: c.address || '',
      })
    }
  }, [loading, customer])

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.first_name.trim()) errs.first_name = locale === 'en' ? 'First name is required' : 'El nombre es obligatorio'
    if (!form.last_name.trim()) errs.last_name = locale === 'en' ? 'Last name is required' : 'Los apellidos son obligatorios'
    if (form.phone && !/^[0-9+\-\s()]{7,}$/.test(form.phone)) {
      errs.phone = locale === 'en' ? 'Enter a valid phone' : 'Introduce un teléfono válido'
    }
    setErrors(errs)
    firstErrorKeyRef.current = Object.keys(errs)[0] || null
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    const ok = validate()
    if (!ok) {
      requestAnimationFrame(() => {
        const first = firstErrorKeyRef.current
        if (first) {
          const el = document.getElementById(first)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
      return
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      toast.error(locale === 'en' ? 'Please log in again.' : 'Inicia sesión de nuevo.', { position: 'bottom-center' })
      router.push(`/${locale}/login`)
      return
    }

    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/customers/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      if (!r.ok) {
        const msg = locale === 'en' ? 'Could not update your profile.' : 'No se pudo actualizar tu perfil.'
        toast.error(msg, { position: 'bottom-center' })
        return
      }
      await refreshCustomer()
      toast.success(locale === 'en' ? 'Profile updated.' : 'Perfil actualizado.', { position: 'bottom-center' })
    } catch {
      toast.error(locale === 'en' ? 'Error updating profile.' : 'Error actualizando el perfil.', { position: 'bottom-center' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto p-4 text-gray-500">Cargando…</div>
  }
  if (!customer) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <p className="text-gray-700">
          {locale === 'en'
            ? 'You must be logged in to edit your profile.'
            : 'Debes iniciar sesión para editar tu perfil.'}
        </p>
        <button
          className="mt-3 px-4 py-2 rounded bg-emerald-600 text-white"
          onClick={() => router.push(`/${locale}/login`)}
        >
          {locale === 'en' ? 'Log in' : 'Iniciar sesión'}
        </button>
      </div>
    )
  }

  const wrapperStyle: React.CSSProperties = { minHeight: 'calc(var(--svh, 100svh))' }

  return (
    <div
      className="max-w-3xl mx-auto p-4 space-y-6 [overscroll-behavior-y:contain]"
      style={wrapperStyle}
    >
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 transition"
      >
        <ArrowLeft size={18} />
        <span className="underline underline-offset-2">
          {dict?.common?.back || (locale === 'en' ? 'Back' : 'Volver')}
        </span>
      </button>

      <h1 className="text-2xl font-bold">
        {locale === 'en' ? 'My profile' : 'Mi perfil'}
      </h1>

      {/* Email solo lectura */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold text-gray-800">
            {locale === 'en' ? 'Account' : 'Cuenta'}
          </h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="no-anchor">
            <label className="block text-sm font-medium text-gray-700">
              Email (login)
            </label>
            <input
              className="input bg-gray-100 cursor-not-allowed text-base"
              value={customer.email}
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1 min-h-[18px]">
              {locale === 'en'
                ? 'Email is used to sign in and cannot be changed here.'
                : 'El email se usa para iniciar sesión y no puede cambiarse aquí.'}
            </p>
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold text-gray-800">
            {locale === 'en' ? 'Personal information' : 'Datos personales'}
          </h2>
        </div>
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="no-anchor">
            <label className="block text-sm font-medium text-gray-700">
              {locale === 'en' ? 'First name' : 'Nombre'}
            </label>
            <input
              id="first_name"
              name="first_name"
              className="input text-base"
              value={form.first_name}
              onChange={onChange}
            />
            <p className="text-red-500 text-xs mt-1 min-h-[18px]">
              {errors.first_name || ''}
            </p>
          </div>

          <div className="no-anchor">
            <label className="block text-sm font-medium text-gray-700">
              {locale === 'en' ? 'Last name' : 'Apellidos'}
            </label>
            <input
              id="last_name"
              name="last_name"
              className="input text-base"
              value={form.last_name}
              onChange={onChange}
            />
            <p className="text-red-500 text-xs mt-1 min-h-[18px]">
              {errors.last_name || ''}
            </p>
          </div>

          <div className="md:col-span-2 no-anchor">
            <label className="block text-sm font-medium text-gray-700">
              {locale === 'en' ? 'Phone' : 'Teléfono'}
            </label>
            <input
              id="phone"
              name="phone"
              className="input text-base"
              value={form.phone}
              onChange={onChange}
              placeholder={locale === 'en' ? 'e.g. +1 305 555 1234' : 'ej: +53 5 123 4567'}
              inputMode="tel"
            />
            <p className="text-red-500 text-xs mt-1 min-h-[18px]">
              {errors.phone || ''}
            </p>
          </div>

          <div className="md:col-span-2 no-anchor">
            <label className="block text-sm font-medium text-gray-700">
              {locale === 'en' ? 'Address' : 'Dirección'}
            </label>
            <textarea
              name="address"
              className="input min-h-[84px] text-base"
              value={form.address}
              onChange={onChange}
            />
            <div className="min-h-[1px]" />
          </div>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Save size={16} />
            <span>
              {saving ? (locale === 'en' ? 'Saving…' : 'Guardando…') : (locale === 'en' ? 'Save changes' : 'Guardar cambios')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
