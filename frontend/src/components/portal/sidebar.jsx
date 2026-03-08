'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Server,
  Globe,
  CreditCard,
  LifeBuoy,
  Download,
  User,
  LogOut,
  Zap,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/services', label: 'Services', icon: Server },
  { href: '/domains', label: 'Domains', icon: Globe },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/support', label: 'Support Tickets', icon: LifeBuoy },
  { href: '/downloads', label: 'Downloads', icon: Download },
  { href: '/profile', label: 'Profile', icon: User },
]

export function Sidebar({ open, onClose }) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              ClientZone
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
