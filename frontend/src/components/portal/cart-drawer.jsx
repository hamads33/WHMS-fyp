'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, X, Trash2, Plus, Minus, Package,
  ChevronRight, Shield, RefreshCcw, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCart } from '@/lib/context/CartContext'

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

// ── Cart Item Card ─────────────────────────────────────────────────────────────

function CartItemCard({ item }) {
  const { removeItem, updateQty, updateCycles, updatePricing } = useCart()
  const price    = parseFloat(item.pricing?.price    || 0)
  const setupFee = parseFloat(item.pricing?.setupFee || 0)
  const cycles   = item.billingCycles || 1
  const qty      = item.qty || 1
  const lineTotal = (price * cycles + setupFee) * qty

  return (
    <div className="group rounded-lg border bg-card p-3.5 space-y-3 transition-shadow hover:shadow-sm">
      {/* Header row */}
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Package className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{item.planName}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.serviceName}</p>
        </div>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => removeItem(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Billing cycle selector */}
      {item.availablePricing?.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Billing:</span>
          <Select
            value={item.pricingId}
            onValueChange={(val) => {
              const p = item.availablePricing.find(pr => pr.id === val)
              if (p) updatePricing(item.id, val, p)
            }}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.availablePricing.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.billingCycle || p.cycle} — {fmt(p.price, p.currency)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Cycles + Qty */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Cycles:</span>
          <div className="flex items-center border rounded-md overflow-hidden h-7">
            <button
              onClick={() => updateCycles(item.id, cycles - 1)}
              disabled={cycles <= 1}
              className="px-2 h-full text-muted-foreground hover:bg-muted disabled:opacity-40 text-sm"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="px-2 text-xs font-semibold min-w-[1.5rem] text-center">{cycles}</span>
            <button
              onClick={() => updateCycles(item.id, cycles + 1)}
              disabled={cycles >= 24}
              className="px-2 h-full text-muted-foreground hover:bg-muted disabled:opacity-40 text-sm"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-bold">{fmt(lineTotal, item.pricing?.currency)}</span>
          {setupFee > 0 && (
            <span className="text-[10px] text-muted-foreground">incl. {fmt(setupFee, item.pricing?.currency)} setup</span>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className="text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5 space-y-0.5">
        <div className="flex justify-between">
          <span>{fmt(price, item.pricing?.currency)} × {cycles} cycle{cycles > 1 ? 's' : ''}</span>
          <span>{fmt(price * cycles, item.pricing?.currency)}</span>
        </div>
        {setupFee > 0 && (
          <div className="flex justify-between">
            <span>Setup fee (one-time)</span>
            <span>{fmt(setupFee, item.pricing?.currency)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cart Drawer ────────────────────────────────────────────────────────────────

export function CartDrawer() {
  const { items, isOpen, closeCart, clearCart, subtotal, itemCount } = useCart()
  const router = useRouter()

  function handleCheckout() {
    closeCart()
    router.push('/client/checkout')
  }

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && closeCart()}>
      <SheetContent side="right" className="flex flex-col p-0 w-full max-w-sm sm:max-w-md">
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between border-b px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base font-semibold">Shopping Cart</SheetTitle>
            {itemCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">{itemCount}</Badge>
            )}
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost" size="sm"
              className="text-xs text-muted-foreground h-7 px-2"
              onClick={clearCart}
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </SheetHeader>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ShoppingCart className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-medium text-sm">Your cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Browse our services to find the perfect plan.</p>
            </div>
            <Button asChild size="sm" className="mt-2" onClick={closeCart}>
              <Link href="/client/services">Browse Services</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-2.5">
                {items.map(item => (
                  <CartItemCard key={item.id} item={item} />
                ))}
              </div>

              {/* Trust signals */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { icon: Shield, text: '30-day guarantee' },
                  { icon: RefreshCcw, text: 'Cancel anytime' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2.5 py-2">
                    <Icon className="h-3 w-3 shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t px-5 py-4 space-y-3 shrink-0 bg-card">
              {/* Totals */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                  <span className="font-semibold">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taxes calculated at checkout</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-bold">Estimated total</span>
                <span className="text-lg font-extrabold text-primary">{fmt(subtotal)}</span>
              </div>

              <Button className="w-full gap-2 h-11 text-sm font-semibold" onClick={handleCheckout}>
                Proceed to Checkout
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button variant="outline" className="w-full h-9 text-sm" asChild onClick={closeCart}>
                <Link href="/client/services">Continue Shopping</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
