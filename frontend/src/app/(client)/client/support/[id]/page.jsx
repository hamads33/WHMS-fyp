import { TicketDetailContent } from '@/components/portal/ticket-detail-content'

export const metadata = { title: 'Ticket - ClientZone' }

export default async function TicketDetailPage({ params }) {
  const { id } = await params
  return <TicketDetailContent ticketId={id} />
}
