import { PortalLayout } from '@/components/portal/portal-layout'
import { DomainDetailContent } from '@/components/portal/domain-detail-content'
import { domains } from '@/lib/data'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }) {
  const { id } = await params
  const domain = domains.find((d) => d.id === id)
  return { title: domain ? `${domain.name} - ClientZone` : 'Domain - ClientZone' }
}

export default async function DomainDetailPage({ params }) {
  const { id } = await params
  const domain = domains.find((d) => d.id === id)
  if (!domain) notFound()

  return (
    <PortalLayout>
      <DomainDetailContent domain={domain} />
    </PortalLayout>
  )
}
