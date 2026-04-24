'use client'

import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/context/CartContext'

export function CartButton() {
  const { itemCount, toggleCart } = useCart()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleCart}
      className="relative h-9 w-9"
      aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ''}`}
    >
      <ShoppingCart className="h-4 w-4" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </Button>
  )
}
