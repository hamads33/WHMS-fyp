import { useState, useCallback } from "react"

// Toast notification manager
let toastId = 0
let toastListeners = []

/**
 * Hook for displaying toast notifications
 * Provides a toast function to show notifications with auto-dismissal
 * 
 * @returns {Object} { toast: function }
 */
export function useToast() {
  const [, setToasts] = useState([])

  const toast = useCallback(({ title, description, variant = "default", duration = 3000 }) => {
    const id = toastId++
    const notification = { id, title, description, variant }

    // Notify all listeners
    toastListeners.forEach(listener => listener(notification))

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        toastListeners.forEach(listener => listener({ id, removed: true }))
      }, duration)
    }

    return id
  }, [])

  // Register listener on mount
  // This allows the toast system to work globally
  useCallback(() => {
    const listener = (notification) => {
      setToasts(prev => {
        if (notification.removed) {
          return prev.filter(t => t.id !== notification.id)
        }
        return [...prev, notification]
      })
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  return { toast }
}

/**
 * Toast Context Provider Component
 * Renders toast notifications on the page
 * Use this in your root layout or app component
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  useState(() => {
    const listener = (notification) => {
      if (notification.removed) {
        setToasts(prev => prev.filter(t => t.id !== notification.id))
      } else {
        setToasts(prev => [...prev, notification])
      }
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </>
  )
}

/**
 * Toast Display Component
 * Individual toast notification UI
 */
function Toast({ id, title, description, variant = "default" }) {
  const bgColor = {
    default: "bg-slate-900 text-white",
    destructive: "bg-red-600 text-white",
    success: "bg-green-600 text-white",
  }[variant] || "bg-slate-900 text-white"

  return (
    <div
      className={`${bgColor} px-4 py-3 rounded-lg shadow-lg pointer-events-auto max-w-sm animate-in slide-in-from-bottom-4 fade-in-0`}
    >
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm opacity-90">{description}</div>}
    </div>
  )
}