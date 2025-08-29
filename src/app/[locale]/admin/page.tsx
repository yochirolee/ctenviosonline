import AdminGuard from '@/components/admin/AdminGuard'
import AdminTabs from '@/components/admin/AdminTabs'

export default function AdminHome() {
  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin</h1>
          {/* espacio para flechas u otro control si quieres */}
        </div>

        <AdminTabs />

        {/* Aquí a futuro: tarjetas con KPIs, últimos pedidos, etc. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="p-6 bg-white rounded shadow">
            <div className="font-semibold">Resumen</div>
            <div className="text-sm text-gray-600">Agrega KPIs aquí (ventas de hoy, pendientes…).</div>
          </div>
          <div className="p-6 bg-white rounded shadow">
            <div className="font-semibold">Últimos pedidos</div>
            <div className="text-sm text-gray-600">Un widget con los más recientes.</div>
          </div>
          <div className="p-6 bg-white rounded shadow">
            <div className="font-semibold">Atajos</div>
            <div className="text-sm text-gray-600">Links rápidos a acciones comunes.</div>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
