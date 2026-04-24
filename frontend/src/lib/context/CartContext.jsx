'use client'

/**
 * CartContext — global cart state for the WHMS client portal.
 *
 * Cart items: { id, serviceId, serviceName, planId, planName, pricingId, pricing, billingCycles, qty }
 * Persisted to localStorage so the cart survives page refresh.
 */

import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'

const STORAGE_KEY = 'whms_cart_v1'

// ── Reducer ───────────────────────────────────────────────────────────────────

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const exists = state.items.findIndex(i => i.pricingId === action.item.pricingId)
      if (exists !== -1) {
        // bump qty
        return {
          ...state,
          items: state.items.map((it, idx) =>
            idx === exists ? { ...it, qty: it.qty + (action.item.qty || 1) } : it
          ),
        }
      }
      return { ...state, items: [...state.items, { ...action.item, qty: action.item.qty || 1 }] }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.id !== action.id) }
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, qty: Math.max(1, action.qty) } : i
        ),
      }
    case 'UPDATE_CYCLES':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, billingCycles: Math.max(1, Math.min(24, action.cycles)) } : i
        ),
      }
    case 'UPDATE_PRICING':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, pricingId: action.pricingId, pricing: action.pricing } : i
        ),
      }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'LOAD':
      return { ...state, items: action.items }
    default:
      return state
  }
}

const initialState = { items: [] }

// ── Context ───────────────────────────────────────────────────────────────────

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const [isOpen, setIsOpen] = useReducer((s, v) => (typeof v === 'boolean' ? v : !s), false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const items = JSON.parse(raw)
        if (Array.isArray(items)) dispatch({ type: 'LOAD', items })
      }
    } catch {}
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items))
    } catch {}
  }, [state.items])

  const addItem = useCallback((item) => {
    dispatch({ type: 'ADD', item: { ...item, id: item.id || `${item.pricingId}-${Date.now()}` } })
    setIsOpen(true)
  }, [])

  const removeItem   = useCallback((id)           => dispatch({ type: 'REMOVE',       id         }), [])
  const updateQty    = useCallback((id, qty)       => dispatch({ type: 'UPDATE_QTY',   id, qty    }), [])
  const updateCycles = useCallback((id, cycles)    => dispatch({ type: 'UPDATE_CYCLES',id, cycles }), [])
  const updatePricing = useCallback((id, pricingId, pricing) => dispatch({ type: 'UPDATE_PRICING', id, pricingId, pricing }), [])
  const clearCart    = useCallback(()              => dispatch({ type: 'CLEAR'                     }), [])

  const itemCount = state.items.reduce((s, i) => s + (i.qty || 1), 0)
  const subtotal  = state.items.reduce((s, i) => {
    const price  = parseFloat(i.pricing?.price  || 0)
    const setup  = parseFloat(i.pricing?.setupFee || 0)
    return s + (price * (i.billingCycles || 1) + setup) * (i.qty || 1)
  }, 0)

  const value = {
    items: state.items,
    itemCount,
    subtotal,
    isOpen,
    openCart:  () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    toggleCart: () => setIsOpen(),
    addItem,
    removeItem,
    updateQty,
    updateCycles,
    updatePricing,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
