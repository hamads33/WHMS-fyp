'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Server, ArrowRight, Package, ShoppingCart, CheckCircle2, Star } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClientServicesAPI } from '@/lib/api/services'
import { useCart } from '@/lib/context/CartContext'

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

// ── Service Card ───────────────────────────────────────────────────────────────

function ServiceCard({ svc }) {
  const { addItem, items } = useCart()
  const [justAdded, setJustAdded] = useState(null) // planId that was just added

  // Quick-add: use first plan's first pricing
  function handleQuickAdd(plan, e) {
    e.preventDefault()
    e.stopPropagation()
    const pricing = plan.pricing?.[0]
    if (!pricing) return

    addItem({
      id:              `${pricing.id}-${Date.now()}`,
      serviceId:       svc.id,
      serviceName:     svc.name,
      planId:          plan.id,
      planName:        plan.name,
      pricingId:       pricing.id,
      pricing: {
        price:        pricing.price,
        setupFee:     pricing.setupFee || 0,
        currency:     pricing.currency || 'USD',
        billingCycle: pricing.billingCycle || pricing.cycle,
      },
      availablePricing: plan.pricing,
      billingCycles:   1,
      qty:             1,
    })

    setJustAdded(plan.id)
    setTimeout(() => setJustAdded(null), 2000)
  }

  const plans = svc.plans || []

  return (
    <Card className="flex flex-col hover:border-accent/40 hover:shadow-md transition-all group">
      <CardContent className="flex-1 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted shrink-0 group-hover:bg-muted transition-colors">
              <Server className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{svc.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{svc.code}</p>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">Active</Badge>
        </div>

        {/* Description */}
        {svc.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {svc.description}
          </p>
        )}

        {/* Plans with quick-add */}
        {plans.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {plans.length} plan{plans.length !== 1 ? 's' : ''} available
            </p>
            {plans.slice(0, 3).map((plan, idx) => {
              const firstPricing = plan.pricing?.[0]
              const inCart = items.some((i) => i.planId === plan.id)
              const added  = justAdded === plan.id

              return (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between rounded-md px-2.5 py-2 text-xs border transition-colors ${
                    inCart
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-border/60 bg-muted/30 hover:border-accent/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {idx === Math.floor(plans.length / 2) && plans.length >= 2 && (
                      <Star className="h-3 w-3 text-accent shrink-0 fill-accent" />
                    )}
                    <span className="font-medium truncate">{plan.name}</span>
                    {firstPricing && (
                      <span className="text-muted-foreground shrink-0">
                        {fmt(firstPricing.price, firstPricing.currency)}
                        /{firstPricing.billingCycle || firstPricing.cycle}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleQuickAdd(plan, e)}
                    disabled={!firstPricing}
                    className={`ml-2 shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                      added
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : inCart
                        ? 'border-accent/40 bg-accent/5 text-accent'
                        : 'border-border hover:border-accent hover:bg-accent/5 hover:text-accent text-muted-foreground'
                    }`}
                  >
                    {added ? (
                      <><CheckCircle2 className="h-3 w-3" /> Added</>
                    ) : (
                      <><ShoppingCart className="h-3 w-3" /> {inCart ? 'In Cart' : 'Add'}</>
                    )}
                  </button>
                </div>
              )
            })}
            {plans.length > 3 && (
              <p className="text-xs text-muted-foreground">+{plans.length - 3} more plans</p>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">No plans configured yet</div>
        )}
      </CardContent>

      <CardFooter className="px-5 pb-4 pt-0 flex gap-2">
        <Button size="sm" variant="outline" asChild className="flex-1">
          <Link href={`/client/services/${svc.id}`}>
            View Plans
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
        <Button size="sm" asChild className="flex-1 gap-1.5">
          <Link href="/client/checkout">
            <ShoppingCart className="h-3.5 w-3.5" />
            Checkout
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function ServicesContent() {
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    ClientServicesAPI.listServices()
      .then((data) => {
        const list = data?.services ?? data ?? []
        setServices(Array.isArray(list) ? list : [])
      })
      .catch((err)  => setError(err.message))
      .finally(()   => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and add hosting plans to your cart, then checkout in one go.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2 shrink-0">
          <Link href="/client/checkout">
            <ShoppingCart className="h-4 w-4" />
            Go to Checkout
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">Error: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-muted" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-muted w-3/4 rounded" />
                    <div className="h-2.5 bg-muted w-1/2 rounded" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[80, 65, 72].map((w) => (
                    <div key={w} className="h-8 bg-muted rounded" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3 opacity-40" />
            <p className="font-medium text-muted-foreground">No services available</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later or contact support.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((svc) => (
            <ServiceCard key={svc.id} svc={svc} />
          ))}
        </div>
      )}
    </div>
  )
}
