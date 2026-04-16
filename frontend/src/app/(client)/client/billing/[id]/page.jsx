import { InvoiceDetailContent } from '@/components/portal/invoice-detail-content'

export const metadata = { title: 'Invoice - ClientZone' }

export default async function InvoiceDetailPage({ params }) {
  const { id } = await params
  return <InvoiceDetailContent invoiceId={id} />
}
