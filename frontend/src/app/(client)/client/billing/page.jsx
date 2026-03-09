import { PortalLayout } from '@/components/portal/portal-layout'
import { BillingContent } from '@/components/portal/billing-content'

export const metadata = { title: 'Billing - ClientZone' }

export default function BillingPage() {
  return (
    <PortalLayout>
      <BillingContent />
    </PortalLayout>
  )
}
