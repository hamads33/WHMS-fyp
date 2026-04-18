'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowLeft, Server, Package, ShoppingCart,
  CheckCircle2, Check, Plus, Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ClientServicesAPI } from '@/lib/api/services'
import { useCart } from '@/lib/context/CartContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, service, isPopular }) {
  const { addItem, items } = useCart()
  const [pricingId, setPricingId] = useState(plan.pricing?.[0]?.id ?? '')
  const [justAdded, setJustAdded] = useState(false)

  const pricing = plan.pricing?.find((p) => p.id === pricingId)
  const price    = parseFloat(pricing?.price    || 0)
  const setupFee = parseFloat(pricing?.setupFee || 0)

  // Check if this pricingId is already in cart
  const inCart = items.some((i) => i.pricingId === pricingId)

  function handleAddToCart() {
    if (!pricing) return
    addItem({
      id:              `${pricingId}-${Date.now()}`,
      serviceId:       service.id,
      serviceName:     service.name,
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
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2200)
  }

  return (
    <Card
      className={`flex flex-col transition-all hover:shadow-md ${
        isPopular ? 'border-accent/60 shadow-sm ring-1 ring-accent/20' : ''
      }`}
    >
      {isPopular && (
        <div className="flex justify-center -mt-3 mb-0">
          <Badge className="text-[11px] px-3 py-0.5 shadow-sm">
            <Zap className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{plan.name}</CardTitle>
            {plan.summary && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{plan.summary}</p>
            )}
          </div>
          {!plan.active && <Badge variant="secondary" className="shrink-0">Inactive</Badge>}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Pricing selector */}
        {plan.pricing?.length > 1 ? (
          <div className="space-y-2">
            <Select value={pricingId} onValueChange={setPricingId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select billing cycle" />
              </SelectTrigger>
              <SelectContent>
                {plan.pricing.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.billingCycle || p.cycle} — {fmt(p.price, p.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {/* Price display */}
        {pricing && (
          <div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-extrabold">{fmt(price, pricing.currency)}</span>
              <span className="text-xs text-muted-foreground pb-1">
                /{pricing.billingCycle || pricing.cycle}
              </span>
            </div>
            {setupFee > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                + {fmt(setupFee, pricing.currency)} one-time setup fee
              </p>
            )}
          </div>
        )}

        {/* Features / policies */}
        {plan.policies?.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t">
            {plan.policies.slice(0, 6).map((policy, i) => (
              <div key={policy.id ?? i} className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{policy.key}</span>
                  {policy.value ? `: ${policy.value}` : ''}
                </p>
              </div>
            ))}
            {plan.policies.length > 6 && (
              <p className="text-xs text-muted-foreground pl-5.5">
                +{plan.policies.length - 6} more features
              </p>
            )}
          </div>
        )}

        {plan.features?.length > 0 && !plan.policies?.length && (
          <div className="space-y-1.5 pt-1 border-t">
            {plan.features.slice(0, 6).map((f, i) => {
              const label = typeof f === 'string' ? f : f.name || f.label || f.value
              return (
                <div key={i} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex flex-col gap-2">
        <Button
          className={`w-full gap-2 transition-all ${
            justAdded
              ? 'bg-accent hover:bg-accent text-accent-foreground'
              : inCart
              ? 'variant-outline'
              : ''
          }`}
          variant={inCart && !justAdded ? 'outline' : 'default'}
          size="sm"
          onClick={handleAddToCart}
          disabled={!pricing || !plan.active}
        >
          {justAdded ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Added to Cart!
            </>
          ) : inCart ? (
            <>
              <Plus className="h-3.5 w-3.5" />
              Add Again
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </>
          )}
        </Button>
        {inCart && !justAdded && (
          <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-primary" asChild>
            <Link href="/client/checkout">View Cart & Checkout →</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ServiceDetailContent({ serviceId }) {
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!serviceId) return
    ClientServicesAPI.getService(serviceId)
      .then((data) => setService(data))
      .catch((err)  => setError(err.message))
      .finally(()   => setLoading(false))
  }, [serviceId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-3">
                <div className="h-4 bg-muted w-1/2 rounded" />
                <div className="h-3 bg-muted w-3/4 rounded" />
                <div className="h-8 bg-muted rounded mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/client/services">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-sm text-destructive font-medium">
            Error: {error || 'Service not found'}
          </p>
        </div>
      </div>
    )
  }

  const plans    = service.plans || []
  const popularIdx = plans.length >= 2 ? Math.floor(plans.length / 2) : -1

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 mt-0.5 shrink-0">
          <Link href="/client/services">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
            <Badge variant="outline">Active</Badge>
          </div>
          {service.description && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{service.description}</p>
          )}
        </div>
      </div>

      {/* Service meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            Service Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Code',   value: service.code  },
            { label: 'Plans',  value: plans.length  },
            { label: 'Status', value: 'Active'       },
            { label: 'Added',  value: service.createdAt ? new Date(service.createdAt).toLocaleDateString() : 'N/A' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium font-mono text-xs mt-0.5">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Plans */}
      {plans.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Available Plans</h2>
            <p className="text-xs text-muted-foreground">Select a plan and add it to your cart</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, idx) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                service={service}
                isPopular={idx === popularIdx && plans.length >= 2}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
            <p className="text-muted-foreground">No plans available for this service</p>
          </CardContent>
        </Card>
      )}

      {/* Cart CTA */}
      {plans.length > 0 && (
        <div className="rounded-xl border bg-accent/5 border-accent/20 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold">Ready to order?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add your plan to the cart and complete checkout in seconds.</p>
          </div>
          <Button asChild size="sm" className="gap-2 shrink-0">
            <Link href="/client/checkout">
              <ShoppingCart className="h-4 w-4" />
              Go to Checkout
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
