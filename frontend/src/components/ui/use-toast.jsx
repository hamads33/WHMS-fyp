"use client"

import { useState, useCallback } from "react"

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ title, description }) => {
    const id = toastId++

    setToasts((prev) => [
      ...prev,
      { id, title, description, open: true },
    ])

    setTimeout(() => dismiss(id), 4000)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
