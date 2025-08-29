'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminTabs from '@/components/admin/AdminTabs'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, MapPin, Phone } from 'lucide-react'

// === API ===
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

const authHeaders = (): HeadersInit => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token')
    if (t) h.Authorization = `Bearer ${t}`
  }
  return h
}

type Customer = {
  id: number
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  address?: string | null
  metadata?: any
}

type Owner = { id: number; name: string }

async function listCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_URL}/customers`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('FETCH_ERROR')
  return res.json()
}

async function deleteCustomer(id: number) {
  const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error('FETCH_ERROR')
}

async function setCustomerRoleAndOwner(
  id: number,
  payload: { role?: 'admin'|'owner'|'delivery'|''|null; owner_id?: number|null }
) {
  const res = await fetch(`${API_URL}/admin/customers/${id}/role-owner`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('FETCH_ERROR')
  return res.json()
}

async function listOwners(): Promise<Owner[]> {
  const res = await fetch(`${API_URL}/admin/owners`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

// === UI ===
export default function AdminCustomersScreen() {
  const router = useRouter()
  const [items, setItems] = useState<Customer[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [q, setQ] = useState('')

  const load = async () => {
    try {
      const [cs, os] = await Promise.all([listCustomers(), listOwners()])
      setItems(cs)
      setOwners(os)
    } catch {
      // Silencioso para no filtrar existencia
      setItems([])
      setOwners([])
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(c => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase()
      return c.email.toLowerCase().includes(s) || name.includes(s)
    })
  }, [items, q])

  const roleOf = (c: Customer): string =>
    String(c.metadata?.role || '').trim()

  const ownerIdOf = (c: Customer): number | '' =>
    Number.isInteger(c.metadata?.owner_id) ? Number(c.metadata.owner_id) : ''

  const onChangeRole = async (c: Customer, next: string) => {
    try {
      if (next === '') {
        // ← limpiar permisos y vínculo al owner
        await setCustomerRoleAndOwner(c.id, { role: '', owner_id: null })
      } else {
        const currentOwnerId = ownerIdOf(c)
        await setCustomerRoleAndOwner(c.id, {
          role: next as 'admin'|'owner'|'delivery',
          owner_id: currentOwnerId === '' ? null : Number(currentOwnerId)
        })
      }
      await load()
      toast.success('Rol actualizado')
    } catch {
      toast.error('No se pudo actualizar el rol')
    }
  }

  const onChangeOwner = async (c: Customer, next: string) => {
    const role = roleOf(c)
    if (role !== 'owner' && role !== 'delivery') {
      toast.error('Asigna primero el rol owner o delivery')
      return
    }
    const owner_id = next === '' ? null : Number(next)
    try {
      await setCustomerRoleAndOwner(c.id, { role: role as any, owner_id })
      await load()
      toast.success('Owner asignado')
    } catch {
      toast.error('No se pudo asignar el owner')
    }
  }

  const onDelete = async (id: number) => {
    try {
      await deleteCustomer(id)
      await load()
      toast.success('Cliente eliminado')
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const ownerNameById = (id?: number | '' ) =>
    id && typeof id === 'number'
      ? (owners.find(o => o.id === id)?.name || `Owner #${id}`)
      : '(sin owner)'

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clientes</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center"
              aria-label="Atrás"
              title="Atrás"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.forward()}
              className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center"
              aria-label="Adelante"
              title="Adelante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AdminTabs />

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded shadow">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Buscar</label>
            <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="email o nombre..." />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded shadow divide-y">
          {filtered.map(c => {
            const role = roleOf(c)
            const ownerId = ownerIdOf(c)
            const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
            const phone = c.phone || ''
            const address = c.address || ''

            return (
              <div key={c.id} className="p-4 flex flex-col gap-3">
                {/* Cabecera */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{c.email}</div>
                    <div className="text-sm text-gray-700">
                      {fullName}
                      {phone && (
                        <span className="inline-flex items-center gap-1 ml-2 text-gray-600">
                          <Phone className="h-3 w-3" /> {phone}
                        </span>
                      )}
                    </div>
                    {address && (
                      <div className="text-sm text-gray-600 mt-1 inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {address}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                    <button
                      onClick={() => onDelete(c.id)}
                      className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Controles de rol/owner */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Rol</span>
                    <select
                      className="input"
                      value={role}
                      onChange={e => onChangeRole(c, e.target.value)}
                      title="Cambiar rol"
                    >
                      <option value="">sin rol</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                      <option value="delivery">delivery</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Owner</span>
                    <select
                      className="input"
                      value={ownerId === '' ? '' : String(ownerId)}
                      onChange={e => onChangeOwner(c, e.target.value)}
                      disabled={!(role === 'owner' || role === 'delivery')}
                      title={role === 'owner' || role === 'delivery'
                        ? 'Asignar owner'
                        : 'Asigna primero rol owner o delivery'}
                    >
                      <option value="">(sin owner)</option>
                      {owners.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-600">
                      {role === 'owner' || role === 'delivery' ? ownerNameById(ownerId) : '(no aplica)'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="p-4 text-gray-500">Sin clientes</div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
