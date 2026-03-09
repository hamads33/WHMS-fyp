import { PortalLayout } from '@/components/portal/portal-layout'
import { SupportContent } from '@/components/portal/support-content'

export const metadata = { title: 'Support - ClientZone' }

export default function SupportPage() {
  return (
    <PortalLayout>
      <SupportContent />
    </PortalLayout>
  )
}
