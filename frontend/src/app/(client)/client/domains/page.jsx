import { PortalLayout } from '@/components/portal/portal-layout'
import { DomainsContent } from '@/components/portal/domains-content'

export const metadata = { title: 'Domains - ClientZone' }

export default function DomainsPage() {
  return (
    <PortalLayout>
      <DomainsContent />
    </PortalLayout>
  )
}
