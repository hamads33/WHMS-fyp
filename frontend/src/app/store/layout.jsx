import { Suspense } from 'react'
import { StoreCartProvider } from '@/lib/context/StoreCartContext'
import { StoreHeader } from './store-header'

export const metadata = {
  title: 'Store — WHMS',
  description: 'Browse and order hosting plans',
}

export default function StoreLayout({ children }) {
  return (
    <StoreCartProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={null}>
          <StoreHeader />
        </Suspense>
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} WHMS · Secure checkout · 30-day guarantee
        </footer>
      </div>
    </StoreCartProvider>
  )
}
