'use client'
import PartnerGuard from '@/components/admin/PartnerGuard'
import PartnerOrdersScreen from './screen'

export default function PartnerOrdersPage() {
  return (
    <PartnerGuard>
      <PartnerOrdersScreen />
    </PartnerGuard>
  )
}
