// components/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type Props = {
  children: React.ReactNode
  attribute?: "class" | "data-theme"
  defaultTheme?: string | "system"
  enableSystem?: boolean
}

/**
 * Simple wrapper around next-themes ThemeProvider.
 * We avoid importing internal package types to keep compatibility.
 */
export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
}: Props) {
  return (
    <NextThemesProvider attribute={attribute} defaultTheme={defaultTheme} enableSystem={enableSystem}>
      {children}
    </NextThemesProvider>
  )
}
