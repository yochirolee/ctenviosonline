'use client'

import AdminGuard from '@/components/admin/AdminGuard'
import CustomersScreen from './screen'

export default function AdminCustomersPage() {
  // OJO: aquí NO pongas useEffect ni llamadas a APIs.
  return (
    <AdminGuard>
      <CustomersScreen /> {/* Solo se monta si el guard autoriza */}
    </AdminGuard>
  )
}
