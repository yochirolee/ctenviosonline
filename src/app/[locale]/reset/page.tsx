'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

export default function ResetPasswordPage() {
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const sp = useSearchParams()

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setEmail(sp.get('email') || '')
    setToken(sp.get('token') || '')
  }, [sp])

  const t = (key: string) => {
    const es: Record<string, string> = {
      title: 'Crear nueva contraseña',
      desc: 'Crea una nueva contraseña para tu cuenta.',
      pass: 'Nueva contraseña',
      confirm: 'Confirmar contraseña',
      save: 'Guardar',
      saving: 'Guardando…',
      mismatch: 'Las contraseñas no coinciden',
      missing: 'Faltan datos del enlace. Vuelve a solicitarlo.',
      ok: 'Contraseña actualizada. Inicia sesión.',
      err: 'No se pudo restablecer la contraseña',
      back: 'Volver a iniciar sesión',
    }
    const en: Record<string, string> = {
      title: 'Create new password',
      desc: 'Create a new password for your account.',
      pass: 'New password',
      confirm: 'Confirm password',
      save: 'Save',
      saving: 'Saving…',
      mismatch: 'Passwords do not match',
      missing: 'Missing link data. Request it again.',
      ok: 'Password updated. Please sign in.',
      err: 'Could not reset password',
      back: 'Back to sign in',
    }
    return (locale === 'es' ? es : en)[key]
  }

  const onSubmit = async () => {
    if (!email || !token) {
      toast.error(t('missing'))
      return
    }
    if (!password || password.length < 6) {
      toast.error(locale === 'es' ? 'Mínimo 6 caracteres' : 'Min 6 characters')
      return
    }
    if (password !== confirm) {
      toast.error(t('mismatch'))
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, new_password: password }),
      })
      const text = await res.text()
      if (!res.ok) {
        let msg = t('err')
        try {
          const data = text ? (JSON.parse(text) as { error?: string }) : null
          if (data?.error) msg = data.error
        } catch {
          // ignore parse errors, keep generic msg
        }
        throw new Error(msg)
      }
      toast.success(t('ok'))
      router.push(`/${locale}/login`)
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : t('err')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow rounded-lg">
      <h1 className="text-xl font-semibold mb-2">{t('title')}</h1>
      <p className="text-sm text-gray-600 mb-4">{t('desc')}</p>

      {/* Email (solo lectura si vino en el link; editable por si el cliente cambia) */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full border rounded px-3 py-2 mb-3"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('pass')}
        className="w-full border rounded px-3 py-2 mb-3"
      />

      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={t('confirm')}
        className="w-full border rounded px-3 py-2 mb-3"
      />

      <button
        onClick={onSubmit}
        disabled={loading}
        className={`w-full py-2 rounded text-white ${
          loading ? 'bg-gray-400' : 'bg-green-700 hover:bg-green-800'
        }`}
      >
        {loading ? t('saving') : t('save')}
      </button>

      <button
        onClick={() => router.push(`/${locale}/login`)}
        className="block mt-4 text-sm text-green-700 hover:text-green-800 underline underline-offset-2 mx-auto"
      >
        {t('back')}
      </button>
    </div>
  )
}
