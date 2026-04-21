'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ShoppingCart, User, CreditCard, CheckCircle2, Check,
  ArrowLeft, Loader2, Trash2, Minus, Plus, Shield,
  ReceiptText, Package, Sparkles, AlertCircle, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useStoreCart } from '@/lib/context/StoreCartContext'
import { StoreAPI } from '@/lib/api/store'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount ?? 0)
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
function pwStrength(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8)          s++
  if (pw.length >= 12)         s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}
const PW_COLOR = ['#e2e8f0', '#ef4444', '#f97316', '#eab308', '#22c55e']
const PW_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']

// Steps
const STEP_CART    = 0
const STEP_ACCOUNT = 1
const STEP_PAYMENT = 2
const STEP_DONE    = 3

const STEPS = [
  { label: 'Cart',    icon: ShoppingCart },
  { label: 'Account', icon: User         },
  { label: 'Payment', icon: CreditCard   },
  { label: 'Done',    icon: Sparkles     },
]

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepBar({ step }) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const done   = i < step
        const active = i === step
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold ${
                done   ? 'bg-primary text-primary-foreground' :
                active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                         'bg-muted text-muted-foreground'
              }`}>
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[11px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-12 sm:w-20 mx-1 mb-4 rounded transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Order Summary Sidebar ─────────────────────────────────────────────────────

function OrderSummary({ items = [], subtotal, compact = false }) {
  if (compact) {
    return (
      <div className="rounded-xl border bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
        <span className="font-bold text-primary">{fmt(subtotal)}</span>
      </div>
    )
  }

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {(items || []).map(item => {
          if (!item) return null
          const price  = parseFloat(item.pricing?.price    || 0)
          const setup  = parseFloat(item.pricing?.setupFee || 0)
          const cycles = item.billingCycles || 1
          return (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{item.planName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.serviceName}</p>
                </div>
                <span className="text-xs font-bold shrink-0">{fmt((price * cycles + setup), item.pricing?.currency)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground pl-0">
                {fmt(price, item.pricing?.currency)} × {cycles} {item.pricing?.billingCycle}
                {setup > 0 ? ` + ${fmt(setup, item.pricing?.currency)} setup` : ''}
              </div>
            </div>
          )
        })}

        <Separator />

        <div className="flex justify-between items-center font-bold">
          <span className="text-sm">Total due today</span>
          <span className="text-base text-primary">{fmt(subtotal)}</span>
        </div>

        <div className="space-y-1.5 pt-1">
          {['🔒 SSL encrypted', '🛡️ 30-day guarantee', '⚡ Instant activation'].map(b => (
            <p key={b} className="text-[11px] text-muted-foreground">{b}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Step 0: Cart ───────────────────────────────────────────────────────────────

function CartStep({ items = [], subtotal, onContinue }) {
  const { removeItem, updateCycles } = useStoreCart()

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <ShoppingCart className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="font-semibold">Your cart is empty</p>
        <Button asChild><Link href="/store">Browse Plans</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map(item => {
          const price  = parseFloat(item.pricing?.price    || 0)
          const setup  = parseFloat(item.pricing?.setupFee || 0)
          const cycles = item.billingCycles || 1
          const total  = price * cycles + setup

          return (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{item.planName}</p>
                        <p className="text-xs text-muted-foreground">{item.serviceName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{fmt(total, item.pricing?.currency)}</p>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-[11px] text-destructive hover:underline mt-0.5"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cycle picker */}
                <div className="flex items-center gap-3 pl-13">
                  <span className="text-xs text-muted-foreground">Billing cycles:</span>
                  <div className="flex items-center border rounded-md overflow-hidden h-7">
                    <button
                      onClick={() => updateCycles(item.id, cycles - 1)}
                      disabled={cycles <= 1}
                      className="px-2 h-full text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2.5 text-xs font-semibold">{cycles}</span>
                    <button
                      onClick={() => updateCycles(item.id, cycles + 1)}
                      disabled={cycles >= 24}
                      className="px-2 h-full text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    × {fmt(price, item.pricing?.currency)}/{item.pricing?.billingCycle}
                  </span>
                </div>

                {setup > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground pl-13">
                    <span>One-time setup fee</span>
                    <span>{fmt(setup, item.pricing?.currency)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Total */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="font-bold">Total due today</span>
          <span className="text-xl font-extrabold text-primary">{fmt(subtotal)}</span>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" asChild className="flex-1">
          <Link href="/store"><ArrowLeft className="h-4 w-4 mr-1.5" />Add more</Link>
        </Button>
        <Button className="flex-1 gap-2 h-11 font-semibold" onClick={onContinue}>
          Continue to account <User className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 1: Account ────────────────────────────────────────────────────────────

function AccountStep({ onContinue, onBack, loading, error }) {
  const [mode,        setMode]       = useState('register')
  const [email,       setEmail]      = useState('')
  const [password,    setPassword]   = useState('')
  const [firstName,   setFirstName]  = useState('')
  const [lastName,    setLastName]   = useState('')
  const [showPw,      setShowPw]     = useState(false)
  const [acceptTerms, setAcceptTerms]= useState(false)
  const pwScore = pwStrength(password)

  function handleSubmit(e) {
    e.preventDefault()
    if (mode === 'register' && !acceptTerms) return
    onContinue({ mode, email, password, firstName, lastName })
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          {mode === 'register' ? 'Create your account' : 'Sign in to continue'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Mode toggle */}
        <div className="grid grid-cols-2 rounded-lg border overflow-hidden text-sm">
          {[['register', 'New customer'], ['login', 'Existing customer']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2 font-medium transition-colors ${
                mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">First name</Label>
                <Input placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Last name</Label>
                <Input placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Email address</Label>
            <Input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Password</Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                required minLength={8}
                placeholder={mode === 'register' ? 'Min. 8 characters' : 'Your password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === 'register' && password && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-colors"
                      style={{ background: i <= pwScore ? PW_COLOR[pwScore] : '#e2e8f0' }} />
                  ))}
                </div>
                {pwScore > 0 && (
                  <p className="text-[11px] font-semibold" style={{ color: PW_COLOR[pwScore] }}>
                    {PW_LABEL[pwScore]} password
                  </p>
                )}
              </div>
            )}
          </div>

          {mode === 'register' && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-0.5 accent-primary" />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the <span className="text-primary underline cursor-pointer">Terms of Service</span> and{' '}
                <span className="text-primary underline cursor-pointer">Privacy Policy</span>
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={loading || (mode === 'register' && !acceptTerms)}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Processing…' : mode === 'register' ? 'Create & continue →' : 'Sign in & continue →'}
            </Button>
          </div>
        </form>

        <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Your data is encrypted and secure
        </p>
      </CardContent>
    </Card>
  )
}

// ── Step 2: Payment ────────────────────────────────────────────────────────────

function PaymentStep({ invoices = [], onPay, onBack, loading, error, paidIds = [] }) {
  const [gateway, setGateway] = useState('stripe')
  const unpaid = invoices.filter(inv => inv.status !== 'paid' && !paidIds.includes(inv.id))
  const totalDue = unpaid.reduce((s, inv) => s + parseFloat(inv.amountDue || 0), 0)

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-base">Orders placed — invoices pending</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
            Your orders were received successfully. Invoices are being processed and will appear in your client dashboard shortly.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto pt-2">
          <Button asChild className="flex-1"><Link href="/client/dashboard">Go to Dashboard</Link></Button>
          <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Invoices list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-primary" />
            Generated Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {(invoices || []).map(inv => {
            if (!inv) return null
            const isPaid = inv.status === 'paid' || paidIds.includes(inv.id)
            return (
              <div key={inv.id} className={`flex items-center justify-between rounded-lg p-3 ${
                isPaid ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted/40'
              }`}>
                <div>
                  <p className="text-xs font-semibold">{inv.invoiceNumber || 'Invoice'}</p>
                  {inv.dueDate && <p className="text-[10px] text-muted-foreground">Due {fmtDate(inv.dueDate)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isPaid ? 'text-green-600' : ''}`}>
                    {fmt(inv.amountDue || 0, inv.currency)}
                  </span>
                  <Badge variant={isPaid ? 'default' : 'outline'}
                    className={isPaid ? 'bg-green-500 hover:bg-green-500 text-white text-[10px]' : 'text-[10px]'}>
                    {isPaid ? 'PAID' : (inv.status?.toUpperCase() || 'PENDING')}
                  </Badge>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Line items for unpaid invoices */}
      {unpaid.map(inv => {
        const lineItems = inv.lineItems || []
        if (!lineItems.length) return null
        return (
          <Card key={`li-${inv.id}`}>
            <CardContent className="p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {['Description', 'Qty', 'Price', 'Total'].map((h, i) => (
                      <th key={h} className={`pb-2 font-semibold text-muted-foreground ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{li.description}</td>
                      <td className="py-2 text-right">{li.quantity}</td>
                      <td className="py-2 text-right">{fmt(li.unitPrice, inv.currency)}</td>
                      <td className="py-2 text-right font-semibold">{fmt(li.total, inv.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      })}

      {/* Payment method */}
      {unpaid.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <RadioGroup value={gateway} onValueChange={setGateway}>
                <label className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                  gateway === 'stripe' ? 'border-primary bg-primary/5' : 'border-border'
                }`}>
                  <RadioGroupItem value="stripe" id="gw-stripe" className="mt-0.5" />
                  <div>
                    <Label htmlFor="gw-stripe" className="font-semibold text-sm cursor-pointer flex items-center gap-2">
                      Credit / Debit Card
                      <span className="text-[10px] font-normal text-muted-foreground">via Stripe</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Visa, Mastercard, Amex — secure payment powered by Stripe.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                  gateway === 'manual' ? 'border-primary bg-primary/5' : 'border-border'
                }`}>
                  <RadioGroupItem value="manual" id="gw-manual" className="mt-0.5" />
                  <div>
                    <Label htmlFor="gw-manual" className="font-semibold text-sm cursor-pointer">
                      Manual / Bank Transfer
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Our team confirms your payment and activates your account promptly.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="font-bold">Amount due now</span>
              <span className="text-xl font-extrabold text-primary">{fmt(totalDue)}</span>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button className="flex-1 h-12 gap-2 font-semibold" onClick={() => onPay(gateway)} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Processing…' : `Pay ${fmt(totalDue)} →`}
            </Button>
          </div>

          <div className="flex justify-center gap-4 text-[11px] text-muted-foreground flex-wrap">
            {['🔒 SSL Encrypted', '✅ Secure Checkout', '🛡️ 30-day Guarantee'].map(b => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Step 3: Done ───────────────────────────────────────────────────────────────

function DoneStep({ invoices = [], redirectUri }) {
  const invList   = invoices || []
  const total    = invList.reduce((s, i) => s + parseFloat(i?.amountDue || 0), 0)
  const currency = invList[0]?.currency || 'USD'

  useEffect(() => {
    if (!redirectUri) return
    // Redirect back to the external site after 5 seconds
    const timer = setTimeout(() => {
      window.location.href = redirectUri
    }, 5000)
    return () => clearTimeout(timer)
  }, [redirectUri])

  return (
    <div className="text-center space-y-6 py-4">
      <div className="relative inline-block">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="absolute -top-1 -right-1 text-2xl animate-bounce">🎉</div>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold">Payment Successful!</h2>
        <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto leading-relaxed">
          Your order has been placed and your account is being set up.
          A confirmation email is on its way to you.
        </p>
      </div>

      {/* Summary */}
      <Card className="text-left max-w-sm mx-auto border-green-200 dark:border-green-800">
        <CardContent className="p-4 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Summary</p>
          {invList.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Your payment was confirmed. A receipt has been emailed to you.
            </p>
          )}
          {invList.map(inv => (
            <div key={inv?.id} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-mono text-xs">{inv?.invoiceNumber}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{fmt(inv?.amountDue || 0, inv?.currency)}</span>
                <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] px-1.5">PAID</Badge>
              </div>
            </div>
          ))}
          {invList.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total paid</span>
                <span className="text-primary">{fmt(total, currency)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Next steps */}
      <div className="text-left max-w-sm mx-auto space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">What happens next</p>
        {[
          'Your hosting account is being provisioned automatically.',
          'Login credentials will be emailed to you shortly.',
          'Manage your services from your client dashboard.',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-primary">{i + 1}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
        <Button className="flex-1" asChild>
          <Link href="/client/dashboard">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/store">Browse More Plans</Link>
        </Button>
      </div>

      {redirectUri && (
        <p className="text-xs text-muted-foreground">
          Redirecting you back in 5 seconds…{' '}
          <a href={redirectUri} className="text-primary underline">Go now</a>
        </p>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

function StoreCheckoutContent() {
  const searchParams = useSearchParams()
  const redirectUri  = searchParams.get('redirect_uri') || ''

  const { items, subtotal, clearCart } = useStoreCart()

  const [step,     setStep]    = useState(STEP_CART)
  const [orders,   setOrders]  = useState([])
  const [invoices, setInvoices]= useState([])
  const [paidIds,  setPaidIds] = useState([])
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState(null)

  // Handle return from Stripe
  useEffect(() => {
    const status    = searchParams.get('status')
    const sessionId = searchParams.get('session_id')
    if (status === 'success' && sessionId) {
      setStep(STEP_DONE)
    }
    if (status === 'cancelled') {
      setError('Payment was cancelled. Please try again.')
      setStep(STEP_PAYMENT)
    }
  }, [searchParams])

  // ── Place orders after auth ────────────────────────────────────────────────

  async function handleAccount({ mode, email, password, firstName, lastName }) {
    setLoading(true)
    setError(null)
    try {
      // Register if needed
      if (mode === 'register') {
        try {
          await StoreAPI.register(email, password, firstName, lastName)
        } catch (err) {
          if (!err.message?.toLowerCase().includes('already')) throw err
        }
      }

      // Login (sets httpOnly cookie)
      await StoreAPI.login(email, password)

      // Place one order per cart item
      const placedOrders   = []
      const placedInvoices = []

      for (const item of items) {
        const result = await StoreAPI.placeOrder({
          serviceId:     item.serviceId,
          planId:        item.planId,
          pricingId:     item.pricingId,
          billingCycles: item.billingCycles || 1,
          quantity:      item.qty || 1,
        })
        placedOrders.push(result.order ?? result)

        // Invoice is returned directly from createOrder response
        if (result.invoice) {
          placedInvoices.push(result.invoice)
        } else {
          // Fallback: fetch by id if available
          const invId = result.invoiceId || result.order?.invoiceId
          if (invId) {
            try {
              const invData = await StoreAPI.getInvoice(invId)
              placedInvoices.push(invData.invoice ?? invData)
            } catch (fetchErr) {
              console.error('[Checkout] Failed to fetch invoice:', invId, fetchErr.message)
            }
          }
        }
      }

      setOrders(placedOrders)
      setInvoices(placedInvoices)
      setStep(STEP_PAYMENT)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Pay all invoices ───────────────────────────────────────────────────────

  async function handlePay(gateway) {
    setLoading(true)
    setError(null)
    const unpaid  = invoices.filter(inv => inv.status !== 'paid' && !paidIds.includes(inv.id))
    try {
      for (const inv of unpaid) {
        const result = await StoreAPI.payInvoice(inv.id, gateway)
        if (gateway === 'stripe' && result.checkoutUrl) {
          window.location.href = result.checkoutUrl
          return
        }
      }
      setPaidIds(prev => [...prev, ...unpaid.map(i => i.id)])
      clearCart()
      setStep(STEP_DONE)
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const showSidebar = step === STEP_ACCOUNT || step === STEP_PAYMENT

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back to store */}
      {step < STEP_DONE && (
        <Button variant="ghost" size="sm" asChild className="mb-6 gap-1.5 text-muted-foreground -ml-2">
          <Link href="/store"><ArrowLeft className="h-4 w-4" /> Back to store</Link>
        </Button>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-center">Checkout</h1>
      </div>

      <StepBar step={step} />

      <div className={`mt-8 ${showSidebar ? 'grid gap-6 lg:grid-cols-[1fr_300px] items-start' : 'max-w-xl mx-auto'}`}>
        {/* Main area */}
        <div>
          {step === STEP_CART && (
            <CartStep
              items={items}
              subtotal={subtotal}
              onContinue={() => setStep(STEP_ACCOUNT)}
            />
          )}

          {step === STEP_ACCOUNT && (
            <AccountStep
              onContinue={handleAccount}
              onBack={() => setStep(STEP_CART)}
              loading={loading}
              error={error}
            />
          )}

          {step === STEP_PAYMENT && (
            <PaymentStep
              invoices={invoices}
              onPay={handlePay}
              onBack={() => setStep(STEP_ACCOUNT)}
              loading={loading}
              error={error}
              paidIds={paidIds}
            />
          )}

          {step === STEP_DONE && (
            <DoneStep invoices={invoices} redirectUri={redirectUri} />
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="hidden lg:block">
            <OrderSummary items={items} subtotal={subtotal} />
          </div>
        )}
      </div>

      {/* Mobile compact summary */}
      {showSidebar && (
        <div className="mt-4 lg:hidden">
          <OrderSummary items={items} subtotal={subtotal} compact />
        </div>
      )}
    </div>
  )
}

export function StoreCheckout() {
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
      <StoreCheckoutContent />
    </Suspense>
  )
}
