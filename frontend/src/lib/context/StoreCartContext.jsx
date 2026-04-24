'use client'

/**
 * StoreCartContext — cart state for the public WHMS storefront (/store).
 * Separate from the client-portal CartContext so the two don't interfere.
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'whms_store_cart_v1'

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':   return { ...state, items: action.items }
    case 'CLEAR':  return { ...state, items: [] }
    case 'REMOVE': return { ...state, items: state.items.filter(i => i.id !== action.id) }
    case 'UPDATE_CYCLES':
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, billingCycles: Math.max(1, Math.min(24, action.cycles)) } : i) }
    case 'UPDATE_PRICING':
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, pricingId: action.pricingId, pricing: action.pricing } : i) }
    case 'ADD': {
      const idx = state.items.findIndex(i => i.pricingId === action.item.pricingId)
      if (idx !== -1) {
        return { ...state, items: state.items.map((it, i) => i === idx ? { ...it, qty: (it.qty || 1) + 1 } : it) }
      }
      return { ...state, items: [...state.items, { ...action.item, qty: 1 }] }
    }
    default: return state
  }
}

const Ctx = createContext(null)

export function StoreCartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [] })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) dispatch({ type: 'LOAD', items: JSON.parse(raw) })
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)) } catch {}
  }, [state.items])

  const addItem      = useCallback(item    => dispatch({ type: 'ADD',           item         }), [])
  const removeItem   = useCallback(id      => dispatch({ type: 'REMOVE',        id           }), [])
  const updateCycles = useCallback((id, n) => dispatch({ type: 'UPDATE_CYCLES', id, cycles: n}), [])
  const updatePricing= useCallback((id, pricingId, pricing) => dispatch({ type: 'UPDATE_PRICING', id, pricingId, pricing }), [])
  const clearCart    = useCallback(()      => dispatch({ type: 'CLEAR'                        }), [])

  const itemCount = state.items.reduce((s, i) => s + (i.qty || 1), 0)
  const subtotal  = state.items.reduce((s, i) => {
    const price = parseFloat(i.pricing?.price || 0)
    const setup = parseFloat(i.pricing?.setupFee || 0)
    return s + (price * (i.billingCycles || 1) + setup) * (i.qty || 1)
  }, 0)

  return (
    <Ctx.Provider value={{ items: state.items, itemCount, subtotal, addItem, removeItem, updateCycles, updatePricing, clearCart }}>
      {children}
    </Ctx.Provider>
  )
}

export function useStoreCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStoreCart must be inside <StoreCartProvider>')
  return ctx
}
