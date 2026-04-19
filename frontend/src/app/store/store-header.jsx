'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ShoppingCart, Shield, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStoreCart } from '@/lib/context/StoreCartContext'

export function StoreHeader() {
  const { itemCount }  = useStoreCart()
  const searchParams   = useSearchParams()
  const redirectUri    = searchParams.get('redirect_uri')
  const checkoutHref   = redirectUri
    ? `/store/checkout?redirect_uri=${encodeURIComponent(redirectUri)}`
    : '/store/checkout'

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/store" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-black">W</span>
          </div>
          WHMS Store
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/store">All Services</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/client/billing">My Invoices</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/client/orders">My Orders</Link>
          </Button>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Trust badge */}
          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-green-500" />
            <span>Secure checkout</span>
          </div>

          {/* Dashboard link */}
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex gap-1.5">
            <Link href="/client/dashboard">
              <LogIn className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>

          {/* Cart button */}
          <Button asChild size="sm" className="gap-2 relative">
            <Link href={checkoutHref}>
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-primary-foreground text-primary">
                  {itemCount > 9 ? '9+' : itemCount}
                </Badge>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
