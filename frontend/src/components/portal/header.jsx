'use client'

import { useState } from 'react'
import { Menu, Bell, Search, Sun, Moon, ChevronDown } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { currentUser } from '@/lib/data'

export function Header({ onMenuClick }) {
  const { theme, setTheme } = useTheme()
  const [searchValue, setSearchValue] = useState('')

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')

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
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block font-medium">{currentUser.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="font-medium">{currentUser.name}</div>
              <div className="text-xs text-muted-foreground font-normal">{currentUser.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
