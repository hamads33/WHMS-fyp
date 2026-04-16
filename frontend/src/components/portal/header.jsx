'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, Bell, Search, Sun, Moon, ChevronDown, LogOut, ArrowRightLeft, ShoppingCart } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const PORTAL_CONFIG = {
  admin:     { label: 'Admin Portal',     path: '/admin/dashboard' },
  client:    { label: 'Client Portal',    path: '/client/dashboard' },
  developer: { label: 'Developer Portal', path: '/developer' },
  reseller:  { label: 'Reseller Portal',  path: '/reseller/dashboard' },
}

export function Header({ onMenuClick, extraActions }) {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')

  // Portals this user can access, excluding the current client portal
  const otherPortals = (user?.portals || []).filter((p) => p !== 'client')

  const getInitials = () => {
    if (!user?.email) return 'U'
    return user.email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-card/95 backdrop-blur px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-sm hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services, invoices..."
          className="pl-9 bg-muted/50 border-0 h-9 text-sm"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          aria-label="Search"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {extraActions}
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="h-9 w-9"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 py-1.5 h-auto text-sm font-normal"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block font-medium truncate max-w-[120px]">
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium truncate">{user?.email || 'User'}</div>
              <div className="text-xs text-muted-foreground font-normal mt-0.5 flex flex-wrap gap-1">
                {(user?.roles || []).map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px] px-1 py-0 leading-4">{r}</Badge>
                ))}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/client/profile">Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/client/billing">Billing</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/client/support">Support</Link></DropdownMenuItem>

            {/* Switch portal — only shown when user has multiple portals */}
            {otherPortals.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                  Switch Portal
                </DropdownMenuLabel>
                {otherPortals.map((portalKey) => {
                  const config = PORTAL_CONFIG[portalKey]
                  if (!config) return null
                  return (
                    <DropdownMenuItem key={portalKey} onClick={() => router.push(config.path)}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      {config.label}
                    </DropdownMenuItem>
                  )
                })}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}