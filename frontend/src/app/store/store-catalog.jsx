'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import {
  ShoppingCart, Check, Plus, Zap, Star, Package,
  Search, SlidersHorizontal, ChevronRight, Shield, Clock, RefreshCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { StoreAPI } from '@/lib/api/store'
import { useStoreCart } from '@/lib/context/StoreCartContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount ?? 0)
}

function createCartItemId(prefix) {
  return `${prefix}-${uuidv4().slice(0, 8)}`
}

function cycleGroup(cycle = '') {
  const c = cycle.toLowerCase()
  if (c.includes('year') || c.includes('annual')) return 'annual'
  if (c.includes('month')) return 'monthly'
  return c
}

function annualSavingsPct(pricing = []) {
  const monthly = pricing.find(p => cycleGroup(p.billingCycle) === 'monthly')
  const annual  = pricing.find(p => cycleGroup(p.billingCycle) === 'annual')
  if (!monthly || !annual) return 0
  const diff = parseFloat(monthly.price) * 12 - parseFloat(annual.price)
  return Math.round((diff / (parseFloat(monthly.price) * 12)) * 100)
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, service, isPopular, billingPeriod, checkoutHref }) {
  const { addItem, items } = useStoreCart()
  const [pricingId, setPricingId] = useState(() => {
    const match = plan.pricing?.find(p => cycleGroup(p.billingCycle) === billingPeriod)
    return match?.id ?? plan.pricing?.[0]?.id ?? ''
  })
  const [justAdded, setJustAdded] = useState(false)

  useEffect(() => {
    const match = plan.pricing?.find(p => cycleGroup(p.billingCycle) === billingPeriod)
    if (!match) return undefined
    const timeoutId = setTimeout(() => setPricingId(match.id), 0)
    return () => clearTimeout(timeoutId)
  }, [billingPeriod, plan.pricing])

  const pricing  = plan.pricing?.find(p => p.id === pricingId)
  const price    = parseFloat(pricing?.price    || 0)
  const setupFee = parseFloat(pricing?.setupFee || 0)
  const inCart   = items.some(i => i.pricingId === pricingId)
  const savings  = annualSavingsPct(plan.pricing)

  function handleAdd() {
    if (!pricing) return
    addItem({
      id:          createCartItemId(pricingId),
      serviceId:   service.id,
      serviceName: service.name,
      planId:      plan.id,
      planName:    plan.name,
      pricingId:   pricing.id,
      pricing: {
        price:        pricing.price,
        setupFee:     pricing.setupFee || 0,
        currency:     pricing.currency || 'USD',
        billingCycle: pricing.billingCycle,
      },
      availablePricing: plan.pricing,
      billingCycles: 1,
    })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2200)
  }

  const features = [
    ...(plan.features || []),
    ...(plan.policies || []).map(p => ({ name: `${p.key}${p.value ? `: ${p.value}` : ''}` })),
  ]

  return (
    <Card className={`flex flex-col relative transition-all hover:shadow-lg hover:-translate-y-0.5 ${
      isPopular ? 'border-primary shadow-md ring-1 ring-primary/20' : ''
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="gap-1 px-3 shadow-sm">
            <Zap className="h-3 w-3" /> Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className={`pb-3 ${isPopular ? 'pt-6' : 'pt-5'}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
            {plan.summary && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{plan.summary}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Pricing display */}
        {pricing ? (
          <div>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight">{fmt(price, pricing.currency)}</span>
              <span className="text-xs text-muted-foreground pb-1.5">/{pricing.billingCycle}</span>
            </div>
            {setupFee > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                + {fmt(setupFee, pricing.currency)} one-time setup fee
              </p>
            )}
            {cycleGroup(pricing.billingCycle) === 'annual' && savings > 0 && (
              <p className="text-xs text-green-600 font-semibold mt-0.5">Save {savings}% vs monthly</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Contact us for pricing</p>
        )}

        {/* Cycle selector */}
        {plan.pricing?.length > 1 && (
          <Select value={pricingId} onValueChange={setPricingId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plan.pricing.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.billingCycle} — {fmt(p.price, p.currency)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-1.5">
            {features.slice(0, 6).map((f, i) => {
              const label = typeof f === 'string' ? f : f.name || f.label || f.value
              return (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground leading-relaxed">{label}</span>
                </li>
              )
            })}
            {features.length > 6 && (
              <li className="text-xs text-muted-foreground pl-5">+{features.length - 6} more included</li>
            )}
          </ul>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-0">
        <Button
          className={`w-full gap-2 transition-all ${justAdded ? 'bg-green-600 hover:bg-green-600' : ''}`}
          variant={inCart && !justAdded ? 'outline' : 'default'}
          onClick={handleAdd}
          disabled={!pricing || !plan.active}
        >
          {justAdded ? (
            <><Check className="h-4 w-4" /> Added!</>
          ) : inCart ? (
            <><Plus className="h-4 w-4" /> Add again</>
          ) : (
            <><ShoppingCart className="h-4 w-4" /> Add to cart</>
          )}
        </Button>
        {inCart && !justAdded && (
          <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-primary" asChild>
            <Link href={checkoutHref}>View cart & checkout →</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// ── Service Section ────────────────────────────────────────────────────────────

function ServiceSection({ service, billingPeriod, popularPlanIdx, checkoutHref }) {
  if (!service.plans?.length) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{service.name}</h2>
          {service.description && (
            <p className="text-sm text-muted-foreground">{service.description}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {service.plans.map((plan, idx) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            service={service}
            billingPeriod={billingPeriod}
            isPopular={service.plans.length >= 2 && idx === Math.floor(service.plans.length / 2)}
            checkoutHref={checkoutHref}
          />
        ))}
      </div>
    </section>
  )
}

// ── Main Catalog ───────────────────────────────────────────────────────────────

export function StoreCatalog() {
  const searchParams  = useSearchParams()
  const filterService = searchParams.get('serviceId')
  const redirectUri   = searchParams.get('redirect_uri')
  const checkoutHref  = redirectUri
    ? `/store/checkout?redirect_uri=${encodeURIComponent(redirectUri)}`
    : '/store/checkout'

  const [services,     setServices]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [billingPeriod,setBillingPeriod]= useState('monthly')
  const { itemCount }                   = useStoreCart()

  useEffect(() => {
    StoreAPI.listServices()
      .then(d => setServices(d.services ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = services
    .filter(s => !filterService || s.id === filterService)
    .filter(s =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.plans?.some(p => p.name.toLowerCase().includes(search.toLowerCase()))
    )

  // Check if any plan has both monthly and annual pricing
  const hasAnnual  = services.some(s => s.plans?.some(p => p.pricing?.some(pr => cycleGroup(pr.billingCycle) === 'annual')))
  const hasMonthly = services.some(s => s.plans?.some(p => p.pricing?.some(pr => cycleGroup(pr.billingCycle) === 'monthly')))
  const showToggle = hasAnnual && hasMonthly

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3 pb-2">
        <Badge variant="outline" className="gap-1.5">
          <Shield className="h-3 w-3 text-green-500" />
          30-day money-back guarantee
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {filterService ? 'Choose your plan' : 'Find the perfect plan'}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
          All plans include instant activation, 24/7 support, and a full refund if you are not satisfied within 30 days.
        </p>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 pt-1 flex-wrap">
          {[
            { icon: Shield,      text: '30-day guarantee' },
            { icon: Clock,       text: 'Instant setup'    },
            { icon: RefreshCcw,  text: 'Cancel anytime'   },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-primary" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plans…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Billing period toggle */}
        {showToggle && (
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {['monthly', 'annual'].map(period => (
              <button
                key={period}
                onClick={() => setBillingPeriod(period)}
                className={`px-4 py-2 font-medium transition-colors capitalize ${
                  billingPeriod === period
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {period}
                {period === 'annual' && (
                  <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-bold dark:bg-green-900 dark:text-green-300">
                    Save up to 20%
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart summary bar */}
      {itemCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border bg-primary/5 border-primary/20 px-5 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {itemCount} item{itemCount !== 1 ? 's' : ''} in your cart
            </span>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <Link href={checkoutHref}>
              Checkout <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="space-y-2">
                  {[90, 75, 85].map(w => (
                    <div key={w} className="h-3 bg-muted rounded" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="h-10 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive font-medium">Failed to load plans: {error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <p className="font-medium text-muted-foreground">No plans found</p>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear search</Button>
          )}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-14">
          {filtered.map(service => (
            <ServiceSection
              key={service.id}
              service={service}
              billingPeriod={billingPeriod}
              checkoutHref={checkoutHref}
            />
          ))}
        </div>
      )}
    </div>
  )
}
