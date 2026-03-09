import { PortalLayout } from '@/components/portal/portal-layout'
import { ServicesContent } from '@/components/portal/services-content'

export const metadata = {
  title: 'Services - ClientZone',
}

export default function ServicesPage() {
  return (
    <PortalLayout>
      <ServicesContent />
    </PortalLayout>
  )
}
