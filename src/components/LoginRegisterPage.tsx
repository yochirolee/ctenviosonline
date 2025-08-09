'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/context/CustomerContext'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

type Dict = {
  login: { title: string; email: string; password: string; submit: string; success: string; error: string }
  register: { title: string; first_name: string; last_name: string; submit: string; error: string }
  common: { loading: string; required_fields?: string }
}

export default function LoginRegisterPage({ dict, locale }: { dict: Dict; locale: string }) {
  const router = useRouter()
  const { refreshCustomer } = useCustomer()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleLogin = async () => {
    setLoading(true)
    if (!form.email || !form.password) {
      toast.error(dict.common.required_fields || 'Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })

      const text = await res.text()
      const data = text ? JSON.parse(text) : {}

      if (!res.ok || !data?.token) throw new Error(data?.message || 'Login failed')

      localStorage.setItem('token', data.token)
      await refreshCustomer()
      toast.success(dict.login.success)
      router.push(`/${locale}`)
    } catch (err: any) {
      toast.error(err?.message || dict.login.error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    if (!form.email || !form.password) {
      toast.error(dict.common.required_fields || 'Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      // Tu backend /register acepta { email, password, address? }
      const regRes = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          address: '',                // si lo dejaste obligatorio
          first_name: form.first_name,
          last_name: form.last_name,
        }),
      })
      const regText = await regRes.text()
      const regData = regText ? JSON.parse(regText) : {}
      if (!regRes.ok) throw new Error(regData?.error || 'Register failed')

      // Luego login directo
      const loginRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const loginText = await loginRes.text()
      const loginData = loginText ? JSON.parse(loginText) : {}
      if (!loginRes.ok || !loginData?.token) throw new Error(loginData?.message || 'Login failed after register')

      localStorage.setItem('token', loginData.token)
      await refreshCustomer()
      toast.success(dict.login.success)
      router.push(`/${locale}`)
    } catch (err: any) {
      toast.error(err?.message || dict.register.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow rounded-lg">
      <div className="flex justify-center mb-4">
        <button
          className={`px-4 py-2 text-sm font-semibold ${tab === 'login' ? 'border-b-2 border-green-700' : 'text-gray-500'}`}
          onClick={() => setTab('login')}
        >
          {dict.login.title}
        </button>
        <button
          className={`ml-4 px-4 py-2 text-sm font-semibold ${tab === 'register' ? 'border-b-2 border-green-700' : 'text-gray-500'}`}
          onClick={() => setTab('register')}
        >
          {dict.register.title}
        </button>
      </div>

      <div className="space-y-4">
        {tab === 'register' && (
          <>
            <input type="text" name="first_name" value={form.first_name} onChange={handleChange} placeholder={dict.register.first_name} className="w-full border rounded px-3 py-2" />
            <input type="text" name="last_name" value={form.last_name} onChange={handleChange} placeholder={dict.register.last_name} className="w-full border rounded px-3 py-2" />
          </>
        )}
        <input type="email" name="email" value={form.email} onChange={handleChange} placeholder={dict.login.email} className="w-full border rounded px-3 py-2" />
        <input type="password" name="password" value={form.password} onChange={handleChange} placeholder={dict.login.password} className="w-full border rounded px-3 py-2" />
        <button
          onClick={tab === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          className={`w-full py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-green-700 hover:bg-green-800'}`}
        >
          {loading ? dict.common.loading : tab === 'login' ? dict.login.submit : dict.register.submit}
        </button>
      </div>
    </div>
  )
}
