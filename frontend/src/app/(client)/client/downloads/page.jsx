import { PortalLayout } from '@/components/portal/portal-layout'
import { DownloadsContent } from '@/components/portal/downloads-content'

export const metadata = { title: 'Downloads - ClientZone' }

export default function DownloadsPage() {
  return (
    <PortalLayout>
      <DownloadsContent />
    </PortalLayout>
  )
}
