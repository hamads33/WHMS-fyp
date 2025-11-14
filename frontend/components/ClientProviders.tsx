// src/components/ClientProviders.tsx
"use client"

import React, { ReactNode } from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { ThemeProvider } from "@/components/theme-provider"

interface Props {
  children: ReactNode
}

export default function ClientProviders({ children }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {/* Keep your ThemeProvider inside client wrapper if it needs client features */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
