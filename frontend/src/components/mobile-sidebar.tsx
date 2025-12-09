"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Server, Globe, CreditCard, LifeBuoy, Settings, ChevronDown, Zap } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Services",
    href: "/dashboard/services",
    icon: Server,
    children: [
      { name: "All Services", href: "/dashboard/services" },
      { name: "Order New", href: "/dashboard/services/order" },
    ],
  },
  {
    name: "Domains",
    href: "/dashboard/domains",
    icon: Globe,
    children: [
      { name: "My Domains", href: "/dashboard/domains" },
      { name: "Register Domain", href: "/dashboard/domains/register" },
      { name: "Transfer Domain", href: "/dashboard/domains/transfer" },
    ],
  },
  {
    name: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    children: [
      { name: "Invoices", href: "/dashboard/billing" },
      { name: "Payment Methods", href: "/dashboard/billing/methods" },
      { name: "Add Funds", href: "/dashboard/billing/add-funds" },
    ],
  },
  {
    name: "Support",
    href: "/dashboard/support",
    icon: LifeBuoy,
    children: [
      { name: "Tickets", href: "/dashboard/support" },
      { name: "Open Ticket", href: "/dashboard/support/new" },
      { name: "Knowledge Base", href: "/dashboard/support/kb" },
    ],
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function MobileSidebar() {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>(["Services", "Domains", "Billing", "Support"])

  const toggleItem = (name: string) => {
    setOpenItems((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-2 h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">WHMS</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const hasChildren = item.children && item.children.length > 0
            const isOpen = openItems.includes(item.name)

            if (hasChildren) {
              return (
                <li key={item.name}>
                  <Collapsible open={isOpen} onOpenChange={() => toggleItem(item.name)}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          {item.name}
                        </span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 ml-8 space-y-1">
                      {item.children?.map((child) => {
                        const isChildActive = pathname === child.href
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-lg transition-colors",
                              isChildActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                            )}
                          >
                            {child.name}
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              )
            }

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
