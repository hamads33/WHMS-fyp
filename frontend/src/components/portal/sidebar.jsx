'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Server, Globe, CreditCard,
  LifeBuoy, Download, User, LogOut, Zap, X, ChevronsUpDown, ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/context/AuthContext'

const navItems = [
  { href: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/client/services',  label: 'Services',  icon: Server },
  { href: '/client/orders',    label: 'My Orders', icon: ShoppingBag },
  { href: '/client/domains',   label: 'Domains',   icon: Globe },
  { href: '/client/billing',   label: 'Billing',   icon: CreditCard },
  { href: '/client/support',   label: 'Support',   icon: LifeBuoy },
  { href: '/client/downloads', label: 'Downloads', icon: Download },
  { href: '/client/profile',   label: 'Profile',   icon: User },
]

export function Sidebar({ open, onClose }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const initials   = user?.email ? user.email.slice(0, 2).toUpperCase() : 'CL'
  const emailShort = user?.email?.split('@')[0] ?? 'Account'

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-[232px] flex-col bg-sidebar border-r border-border/60 transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
          <Link
            href="/client/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">WHMS</p>
              <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 tracking-wide">Client Portal</p>
            </div>
          </Link>
          <Button
            variant="ghost" size="icon"
            className="lg:hidden h-7 w-7 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col overflow-y-auto py-3 px-3 space-y-0.5" aria-label="Client navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-100 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary" aria-hidden="true" />
                )}
                <Icon className={cn(
                  'h-[17px] w-[17px] shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-sidebar-foreground/45 group-hover:text-sidebar-foreground/80'
                )} />
                <span className="leading-none">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-border/60">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 px-3 py-3 hover:bg-sidebar-accent/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold select-none">
                  {initials}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-medium truncate text-sidebar-foreground leading-none">{emailShort}</p>
                  <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 leading-none">Client</p>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium truncate">{user?.email ?? 'Client'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Client Account</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/client/profile" onClick={onClose} className="gap-2">
                  <User className="h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
