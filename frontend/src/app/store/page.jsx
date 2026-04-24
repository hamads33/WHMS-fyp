import { Suspense } from 'react'
import { StoreCatalog } from './store-catalog'

export const metadata = { title: 'Browse Plans — WHMS Store' }

/**
 * Public storefront. Query params accepted:
 *   ?serviceId=xxx        — pre-filter to a specific service
 *   ?redirect_uri=https…  — where to send the user after successful payment
 *
 * External sites link here:
 *   <a href="https://your-whms.com/store?redirect_uri=https://yoursite.com/success">
 *     Get Started
 *   </a>
 */
export default function StorePage() {
  return <Suspense fallback={null}><StoreCatalog /></Suspense>
}
