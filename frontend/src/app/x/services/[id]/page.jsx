import { PortalLayout } from '@/components/portal/portal-layout'
import { ServiceDetailContent } from '@/components/portal/service-detail-content'
import { services } from '@/lib/data'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }) {
  const { id } = await params
  const svc = services.find((s) => s.id === id)
  return { title: svc ? `${svc.name} - ClientZone` : 'Service - ClientZone' }
}

export default async function ServiceDetailPage({ params }) {
  const { id } = await params
  const svc = services.find((s) => s.id === id)
  if (!svc) notFound()

  return (
    <PortalLayout>
      <ServiceDetailContent service={svc} />
    </PortalLayout>
  )
}
