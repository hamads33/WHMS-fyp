"use client"

import { useToast } from "./use-toast"
import { X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-background border shadow rounded-md p-4 flex gap-3"
        >
          <div className="flex-1">
            {toast.title && (
              <p className="font-medium">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm text-muted-foreground">
                {toast.description}
              </p>
            )}
          </div>
          <button onClick={() => dismiss(toast.id)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
