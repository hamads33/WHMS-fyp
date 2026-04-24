"use client"

import { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'

let toastListeners = []
let toastId = 0

export function toast({ title, description, variant = 'default', duration = 5000 }) {
  const id = toastId++
  const newToast = { id, title, description, variant, duration }
  
  toastListeners.forEach(listener => listener(newToast))
  
  return id
}

export function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const listener = (toast) => {
      setToasts(prev => [...prev, toast])
      
      if (toast.duration) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
        }, toast.duration)
      }
    }
    
    toastListeners.push(listener)
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map(toast => (
        <Card
          key={toast.id}
          className={`p-4 shadow-lg border-l-4 ${
            toast.variant === 'destructive'
              ? 'border-l-destructive bg-destructive/10'
              : toast.variant === 'success'
              ? 'border-l-green-500 bg-green-50 dark:bg-green-950'
              : 'border-l-primary bg-card'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {toast.variant === 'destructive' ? (
                <AlertCircle className="w-5 h-5 text-destructive" />
              ) : toast.variant === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Info className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="font-semibold text-foreground">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}