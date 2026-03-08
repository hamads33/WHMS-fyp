'use client'

import Link from 'next/link'
import {
  Server,
  Globe,
  CreditCard,
  LifeBuoy,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './status-badge'
import { services, invoices, tickets, domains } from '@/lib/data'

const statCards = [
  {
    title: 'Active Services',
    value: services.filter((s) => s.status === 'Active').length,
    total: services.length,
    icon: Server,
    href: '/services',
    color: 'text-foreground',
    bg: 'bg-muted',
  },
  {
    title: 'Active Domains',
    value: domains.filter((d) => d.status === 'Active').length,
    total: domains.length,
    icon: Globe,
    href: '/domains',
    color: 'text-foreground',
    bg: 'bg-muted',
  },
  {
    title: 'Unpaid Invoices',
    value: invoices.filter((i) => i.status === 'Unpaid' || i.status === 'Overdue').length,
    total: invoices.length,
    icon: CreditCard,
    href: '/billing',
    color: 'text-foreground',
    bg: 'bg-muted',
    alert: true,
  },
  {
    title: 'Open Tickets',
    value: tickets.filter((t) => t.status === 'Open').length,
    total: tickets.length,
    icon: LifeBuoy,
    href: '/support',
    color: 'text-foreground',
    bg: 'bg-muted',
  },
]

function ServiceStatusIcon({ status }) {
  if (status === 'Active') return <CheckCircle2 className="h-4 w-4 text-foreground" />
  if (status === 'Suspended') return <AlertCircle className="h-4 w-4 text-muted-foreground" />
  return <Clock className="h-4 w-4 text-muted-foreground" />
}

export function DashboardContent() {
  const recentInvoices = invoices.slice(0, 4)
  const recentTickets = tickets.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here is an overview of your account.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-3xl font-bold">{card.value}</span>
                        <span className="text-sm text-muted-foreground">/ {card.total}</span>
                      </div>
                    </div>
                    <div className={`rounded-xl p-2.5 ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    <span>View all</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent invoices */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
              <CardDescription className="text-xs mt-0.5">Your latest billing activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-8">
              <Link href="/billing">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{inv.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{inv.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={inv.status} />
                    <span className="text-sm font-semibold tabular-nums">{inv.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent tickets */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Support Tickets</CardTitle>
              <CardDescription className="text-xs mt-0.5">Recent activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-8">
              <Link href="/support">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentTickets.map((tkt) => (
                <Link key={tkt.id} href={`/support/${tkt.id}`}>
                  <div className="flex flex-col gap-1.5 px-6 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">{tkt.id}</span>
                      <StatusBadge status={tkt.status} />
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-1 text-balance">{tkt.subject}</p>
                    <p className="text-xs text-muted-foreground">{tkt.department}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Status Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Service Status Overview</CardTitle>
            <CardDescription className="text-xs mt-0.5">Current status of all your hosting services</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs h-8">
            <Link href="/services">Manage services</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {services.map((svc) => (
              <div key={svc.id} className="flex items-center gap-4 px-6 py-4">
                <ServiceStatusIcon status={svc.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{svc.name}</p>
                  <p className="text-xs text-muted-foreground">{svc.domain}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-muted-foreground">Renews</p>
                  <p className="text-xs font-medium">{svc.renewalDate}</p>
                </div>
                <StatusBadge status={svc.status} />
                <Button variant="ghost" size="sm" asChild className="h-7 px-2.5 text-xs hidden md:flex">
                  <Link href={`/services/${svc.id}`}>Manage</Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
