import { PortalLayout } from '@/components/portal/portal-layout'
import { ProfileContent } from '@/components/portal/profile-content'

export const metadata = { title: 'Profile - ClientZone' }

export default function ProfilePage() {
  return (
    <PortalLayout>
      <ProfileContent />
    </PortalLayout>
  )
}
