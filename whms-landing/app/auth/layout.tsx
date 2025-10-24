import type React from "react"
import { Navigation } from "@/components/navigation"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      {children}
    </main>
  )
}
