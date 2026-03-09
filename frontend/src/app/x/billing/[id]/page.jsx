import { PortalLayout } from '@/components/portal/portal-layout'
import { InvoiceDetailContent } from '@/components/portal/invoice-detail-content'
import { invoices } from '@/lib/data'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }) {
  const { id } = await params
  return { title: `Invoice ${id} - ClientZone` }
}

export default async function InvoiceDetailPage({ params }) {
  const { id } = await params
  const invoice = invoices.find((inv) => inv.id === id)
  if (!invoice) notFound()

  return (
    <PortalLayout>
      <InvoiceDetailContent invoice={invoice} />
    </PortalLayout>
  )
}
