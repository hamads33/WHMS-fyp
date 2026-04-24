'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, Package, ChevronRight, Check, CreditCard,
  Shield, AlertCircle, CheckCircle2, ArrowLeft, Loader2,
  ReceiptText, Sparkles, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useCart } from '@/lib/context/CartContext'
import { ClientOrdersAPI } from '@/lib/api/orders'
import { ClientBillingAPI } from '@/lib/api/billing'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Step constants
const STEP_REVIEW  = 0
const STEP_PLACING = 1
const STEP_PAYMENT = 2
const STEP_DONE    = 3

const STEPS = [
  { label: 'Review',  icon: ShoppingCart },
  { label: 'Placing', icon: Loader2      },
  { label: 'Payment', icon: CreditCard   },
  { label: 'Done',    icon: Sparkles     },
]

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const done   = i < step
        const active = i === step
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-all
                ${done   ? 'bg-primary text-primary-foreground shadow-sm'   : ''}
                ${active ? 'bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20' : ''}
                ${!done && !active ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {done
                  ? <Check className="h-4 w-4" />
                  : <Icon className={`h-4 w-4 ${active && i === STEP_PLACING ? 'animate-spin' : ''}`} />
                }
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 sm:w-16 mx-1 mb-4 transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Order Review ──────────────────────────────────────────────────────────────

function ReviewStep({ items, subtotal, onPlaceOrders, loading, error }) {
  const { removeItem } = useCart()

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <ShoppingCart className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="font-medium">Your cart is empty</p>
        <Button asChild size="sm"><Link href="/client/services">Browse Services</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => {
          const price    = parseFloat(item.pricing?.price    || 0)
          const setupFee = parseFloat(item.pricing?.setupFee || 0)
          const cycles   = item.billingCycles || 1
          const lineTotal = (price * cycles + setupFee) * (item.qty || 1)

          return (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start gap-3 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{item.planName}</p>
                        <p className="text-xs text-muted-foreground">{item.serviceName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{fmt(lineTotal, item.pricing?.currency)}</p>
                        {cycles > 1 && (
                          <p className="text-[10px] text-muted-foreground">{cycles} cycles</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {item.pricing?.billingCycle || item.pricing?.cycle}
                      </Badge>
                      {setupFee > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                          +{fmt(setupFee, item.pricing?.currency)} setup
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Line item breakdown */}
                <div className="border-t bg-muted/30 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {fmt(price, item.pricing?.currency)} × {cycles} cycle{cycles > 1 ? 's' : ''}
                    {setupFee > 0 ? ` + ${fmt(setupFee, item.pricing?.currency)} setup` : ''}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-[11px] text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Promo placeholder */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo / coupon code"
              className="flex-1 h-9 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button variant="outline" size="sm" className="h-9 shrink-0">Apply</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary totals */}
      <Card>
        <CardContent className="p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
            <span className="font-semibold">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Applicable taxes</span>
            <span>Calculated at order</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-bold">Total due today</span>
            <span className="text-xl font-extrabold text-primary">{fmt(subtotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Trust signals */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: Shield,  label: '30-day guarantee' },
          { icon: Clock,   label: 'Instant activation' },
          { icon: Check,   label: 'Cancel anytime' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 py-2.5 rounded-lg border bg-muted/20 text-[11px] text-muted-foreground">
            <Icon className="h-4 w-4 text-primary" />
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/8 p-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button className="w-full h-12 text-sm font-semibold gap-2" onClick={onPlaceOrders} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
        {loading ? 'Placing orders…' : `Place ${items.length > 1 ? `${items.length} orders` : 'order'} →`}
      </Button>
    </div>
  )
}

// ── Payment Step ──────────────────────────────────────────────────────────────

function PaymentStep({ invoices, onPay, loading, error, payedIds }) {
  const [gateway, setGateway] = useState('manual')

  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid' && !payedIds.includes(inv.id))
  const paidInvoices   = invoices.filter(inv => inv.status === 'paid'  || payedIds.includes(inv.id))

  const totalDue = unpaidInvoices.reduce((s, inv) => s + parseFloat(inv.amountDue || 0), 0)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">Generated Invoices</p>
        <div className="space-y-2">
          {invoices.map((inv) => {
            const isPaid = inv.status === 'paid' || payedIds.includes(inv.id)
            return (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ReceiptText className={`h-4 w-4 shrink-0 ${isPaid ? 'text-green-500' : 'text-primary'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{inv.invoiceNumber}</p>
                    {inv.dueDate && <p className="text-[10px] text-muted-foreground">Due {fmtDate(inv.dueDate)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-bold ${isPaid ? 'text-green-600' : ''}`}>
                    {fmt(inv.amountDue, inv.currency)}
                  </span>
                  <Badge
                    variant={isPaid ? 'default' : 'outline'}
                    className={`text-[10px] h-4 px-1.5 ${isPaid ? 'bg-green-500 hover:bg-green-500 text-white' : ''}`}
                  >
                    {isPaid ? 'PAID' : inv.status?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invoice line items (expandable) */}
      {unpaidInvoices.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 space-y-2">
              <RadioGroup value={gateway} onValueChange={setGateway} className="space-y-2">
                <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${gateway === 'manual' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <RadioGroupItem value="manual" id="manual" className="mt-0.5" />
                  <div>
                    <Label htmlFor="manual" className="font-semibold text-sm cursor-pointer">
                      Manual / Bank Transfer
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Our team will confirm your payment and activate your services.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Total due */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="font-bold text-sm">Total due now</span>
              <span className="text-xl font-extrabold text-primary">{fmt(totalDue)}</span>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/8 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button className="w-full h-12 text-sm font-semibold gap-2" onClick={() => onPay(gateway)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {loading ? 'Processing payment…' : `Pay ${fmt(totalDue)} securely →`}
          </Button>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            {['🔒 SSL Encrypted', '✅ Secure Checkout', '🛡️ 30-day Guarantee'].map(b => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </>
      )}

      {unpaidInvoices.length === 0 && (
        <div className="text-center py-4">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-600">All invoices paid!</p>
        </div>
      )}
    </div>
  )
}

// ── Done Step ─────────────────────────────────────────────────────────────────

function DoneStep({ orders, invoices }) {
  const total = invoices.reduce((s, inv) => s + parseFloat(inv.totalAmount ?? inv.amountDue ?? 0), 0)
  const currency = invoices[0]?.currency || 'USD'

  return (
    <div className="text-center space-y-5 py-4">
      <div className="relative inline-block">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="absolute -top-1 -right-1 text-2xl animate-bounce">🎉</div>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-foreground">You&apos;re all set!</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
          Your {orders.length > 1 ? `${orders.length} orders have` : 'order has'} been placed
          and your hosting account{orders.length > 1 ? 's are' : ' is'} being provisioned.
          A confirmation email is on its way.
        </p>
      </div>

      {/* Summary card */}
      <Card className="text-left border-green-200 dark:border-green-800">
        <CardContent className="p-4 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Summary</p>
          {invoices.map((inv) => (
            <div key={inv.id} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-mono text-xs">{inv.invoiceNumber}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{fmt(inv.totalAmount ?? inv.amountDue ?? 0, inv.currency)}</span>
                <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] h-4 px-1.5">PAID</Badge>
              </div>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between items-center font-bold">
            <span>Total paid</span>
            <span className="text-primary">{fmt(total, currency)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Next steps */}
      <Card className="text-left">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What happens next</p>
          {[
            { icon: Loader2,       text: 'Your account is being provisioned automatically.' },
            { icon: ReceiptText,   text: 'Credentials will be emailed to you shortly.' },
            { icon: ShoppingCart,  text: 'Manage your services from the dashboard.' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" asChild>
          <Link href="/client/orders">View My Orders</Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/client/billing">View Invoices</Link>
        </Button>
      </div>

      <Button variant="ghost" size="sm" asChild>
        <Link href="/client/services">← Continue Shopping</Link>
      </Button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CheckoutContent() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()

  const [step,      setStep]      = useState(STEP_REVIEW)
  const [orders,    setOrders]    = useState([])    // placed orders
  const [invoices,  setInvoices]  = useState([])    // generated invoices
  const [payedIds,  setPayedIds]  = useState([])    // paid invoice ids
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  // ── Place all orders ────────────────────────────────────────────────────────

  async function handlePlaceOrders() {
    if (items.length === 0) return
    setLoading(true)
    setError(null)
    setStep(STEP_PLACING)

    const placedOrders   = []
    const placedInvoices = []

    try {
      for (const item of items) {
        const result = await ClientOrdersAPI.placeOrder({
          serviceId:     item.serviceId,
          planId:        item.planId,
          pricingId:     item.pricingId,
          billingCycles: item.billingCycles || 1,
          quantity:      item.qty || 1,
        })

        placedOrders.push(result.order || result)

        // Fetch the invoice for this order
        if (result.invoiceId || result.invoice?.id) {
          try {
            const inv = await ClientBillingAPI.getInvoice(result.invoiceId || result.invoice.id)
            placedInvoices.push(inv.invoice || inv)
          } catch {}
        }
      }

      setOrders(placedOrders)
      setInvoices(placedInvoices)
      setStep(STEP_PAYMENT)
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.')
      setStep(STEP_REVIEW)
    } finally {
      setLoading(false)
    }
  }

  // ── Pay all invoices ─────────────────────────────────────────────────────────

  async function handlePay(gateway) {
    setLoading(true)
    setError(null)

    const unpaid = invoices.filter(inv => inv.status !== 'paid' && !payedIds.includes(inv.id))
    const newPaid = []

    try {
      for (const inv of unpaid) {
        await ClientBillingAPI.payInvoice(inv.id, gateway)
        newPaid.push(inv.id)
      }
      setPayedIds(prev => [...prev, ...newPaid])
      clearCart()
      setStep(STEP_DONE)
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-2">
      {/* Back */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground -ml-2">
          <Link href="/client/services">
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Link>
        </Button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground mt-1">Review your order and complete your purchase</p>
      </div>

      <StepIndicator step={step} />

      {step === STEP_REVIEW && (
        <ReviewStep
          items={items}
          subtotal={subtotal}
          onPlaceOrders={handlePlaceOrders}
          loading={loading}
          error={error}
        />
      )}

      {step === STEP_PLACING && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <div>
            <p className="font-semibold">Placing your orders…</p>
            <p className="text-sm text-muted-foreground mt-1">This will only take a moment.</p>
          </div>
        </div>
      )}

      {step === STEP_PAYMENT && (
        <PaymentStep
          invoices={invoices}
          onPay={handlePay}
          loading={loading}
          error={error}
          payedIds={payedIds}
        />
      )}

      {step === STEP_DONE && (
        <DoneStep orders={orders} invoices={invoices} />
      )}
    </div>
  )
}
