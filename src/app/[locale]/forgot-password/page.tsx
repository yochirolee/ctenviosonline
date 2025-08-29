'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const t = (key: string) => {
    const es: Record<string,string> = {
      title: 'Recuperar contraseña',
      desc: 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.',
      email: 'Correo electrónico',
      send: 'Enviar enlace',
      sending: 'Enviando…',
      ok: 'Si el email existe, te enviamos un enlace.',
      err: 'No se pudo procesar la solicitud',
      back: 'Volver al inicio'
    }
    const en: Record<string,string> = {
      title: 'Recover password',
      desc: 'Enter your email and we will send you a reset link.',
      email: 'Email',
      send: 'Send link',
      sending: 'Sending…',
      ok: 'If the email exists, we sent you a link.',
      err: 'Request failed',
      back: 'Back to home'
    }
    return (locale === 'es' ? es : en)[key]
  }

  const onSubmit = async () => {
    if (!email.trim()) {
      toast.error(locale === 'es' ? 'Escribe tu email' : 'Type your email')
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      // Siempre respondemos ok (para no filtrar usuarios)
      if (!res.ok) throw new Error()
      toast.success(t('ok'))
      router.push(`/${locale}/login`)
    } catch {
      toast.error(t('err'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow rounded-lg">
      <h1 className="text-xl font-semibold mb-2">{t('title')}</h1>
      <p className="text-sm text-gray-600 mb-4">{t('desc')}</p>

      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={t('email')}
        className="w-full border rounded px-3 py-2 mb-3"
      />

      <button
        onClick={onSubmit}
        disabled={loading}
        className={`w-full py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-green-700 hover:bg-green-800'}`}
      >
        {loading ? t('sending') : t('send')}
      </button>

      <button
        onClick={() => router.push(`/${locale}`)}
        className="block mt-4 text-sm text-green-700 hover:text-green-800 underline underline-offset-2 mx-auto"
      >
        {t('back')}
      </button>
    </div>
  )
}
