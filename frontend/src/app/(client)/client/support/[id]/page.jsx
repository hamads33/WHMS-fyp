import { PortalLayout } from '@/components/portal/portal-layout'
import { TicketDetailContent } from '@/components/portal/ticket-detail-content'
import { tickets } from '@/lib/data'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }) {
  const { id } = await params
  const ticket = tickets.find((t) => t.id === id)
  return { title: ticket ? `${ticket.id} - ClientZone` : 'Ticket - ClientZone' }
}

export default async function TicketDetailPage({ params }) {
  const { id } = await params
  const ticket = tickets.find((t) => t.id === id)
  if (!ticket) notFound()

  return (
    <PortalLayout>
      <TicketDetailContent ticket={ticket} />
    </PortalLayout>
  )
}
