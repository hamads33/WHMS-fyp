import { ServiceDetailContent } from '@/components/portal/service-detail-content'

export const metadata = { title: 'Service - ClientZone' }

export default async function ServiceDetailPage({ params }) {
  const { id } = await params
  return <ServiceDetailContent serviceId={id} />
}
