import { DomainDetailContent } from '@/components/portal/domain-detail-content'

export const metadata = { title: 'Domain - ClientZone' }

export default async function DomainDetailPage({ params }) {
  const { id } = await params
  return <DomainDetailContent domainId={id} />
}
