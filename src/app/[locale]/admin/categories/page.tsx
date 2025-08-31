'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminTabs from '@/components/admin/AdminTabs'
import {
  listCategories, createCategory, updateCategory, deleteCategory,
  type Category
} from '@/lib/adminApi'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function AdminCategoriesPage() {
  const router = useRouter()

  const [items, setItems] = useState<Category[]>([])
  const [form, setForm] = useState<Partial<Category>>({ slug: '', name: '', image_url: '' })
  const [editing, setEditing] = useState<Category | null>(null)

  const load = async () => setItems(await listCategories())
  useEffect(() => { load() }, [])

  const onSubmit = async () => {
    if (!form.slug || !form.name) return toast.error('Slug y nombre')
    try {
      if (editing) {
        const r = await updateCategory(editing.id, {
          slug: form.slug!,
          name: form.name!,
          image_url: (form.image_url || '') as string,
        })
        setItems(prev => prev.map(x => x.id === r.id ? r : x))
        setEditing(null)
        toast.success('Categoría actualizada')
      } else {
        const r = await createCategory({
          slug: form.slug!,
          name: form.name!,
          image_url: (form.image_url || '') as string,
        })
        setItems(prev => [r, ...prev])
        toast.success('Categoría creada')
      }
      setForm({ slug: '', name: '', image_url: '' })
    } catch {
      toast.error('No se pudo guardar la categoría')
    }
  }

  const onEdit = (c: Category) => {
    setEditing(c)
    setForm({ slug: c.slug, name: c.name, image_url: c.image_url || '' })
  }

  const onDelete = async (id: number) => {
    await deleteCategory(id)
    setItems(prev => prev.filter(x => x.id !== id))
    setEditing(null)
    toast.success('Eliminada')
  }

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Categorías</h1>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded shadow p-4 space-y-3">
            <h2 className="font-semibold">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>

            <form
              onSubmit={(e) => { e.preventDefault(); onSubmit() }}
              className="space-y-3"
              noValidate
            >
              <div>
                <label htmlFor="cat-slug" className="block text-sm font-medium text-gray-700">Slug</label>
                <input
                  id="cat-slug"
                  name="slug"
                  className="input"
                  placeholder="slug"
                  value={form.slug ?? ""}
                  onChange={e => setForm(s => ({ ...s, slug: e.target.value }))}
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  id="cat-name"
                  name="name"
                  className="input"
                  placeholder="nombre"
                  value={form.name ?? ""}
                  onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <label htmlFor="cat-image-url" className="block text-sm font-medium text-gray-700">URL de imagen</label>
                <input
                  id="cat-image-url"
                  name="image_url"
                  className="input"
                  placeholder="https://res.cloudinary.com/.../img.jpg"
                  value={form.image_url ?? ""}
                  onChange={e => setForm(s => ({ ...s, image_url: e.target.value }))}
                  autoComplete="off"
                  inputMode="url"
                />
              </div>

              {form.image_url ? (
                <img
                  src={form.image_url as string}
                  alt="preview categoría"
                  className="w-full h-36 object-cover rounded border"
                />
              ) : (
                <div className="text-xs text-gray-500">Pega aquí una URL de imagen (por ejemplo, de Cloudinary).</div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" className="px-3 py-2 rounded bg-green-600 text-white">
                  {editing ? 'Guardar' : 'Crear'}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => { setEditing(null); setForm({ slug: '', name: '', image_url: '' }) }}
                    className="px-3 py-2 rounded bg-gray-200"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="md:col-span-2 bg-white rounded shadow divide-y">
            {items.map(c => (
              <div key={c.id} className="p-4 flex items-center gap-4">
                <img
                  src={c.image_url || '/category.webp'}
                  alt={c.name}
                  className="w-16 h-16 rounded object-cover flex-shrink-0 border"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-gray-600 truncate">/{c.slug}</div>
                  {c.image_url && <div className="text-xs text-gray-500 truncate">{c.image_url}</div>}
                </div>
                <button onClick={() => onEdit(c)} className="px-2 py-1 rounded bg-blue-600 text-white">Editar</button>
                <button onClick={() => onDelete(c.id)} className="px-2 py-1 rounded bg-red-600 text-white">Borrar</button>
              </div>
            ))}
            {items.length === 0 && <div className="p-4 text-gray-500">Sin categorías</div>}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
