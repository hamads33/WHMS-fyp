import { Suspense } from 'react'

export const dynamic = 'force-dynamic'
import { StoreCheckout } from './store-checkout'
import { Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Checkout — WHMS Store' }

export default function StoreCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <CardTitle>Loading checkout...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <StoreCheckout />
    </Suspense>
  )
}
