"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Server, Globe, CreditCard, LifeBuoy, Settings, ChevronRight, Cloud } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { Separator } from "@/components/ui/separator"

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

export function Sidebar() {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>(["Services", "Domains", "Billing", "Support"])

  const toggleItem = (name: string) => {
    setOpenItems((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-3 h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
          <Cloud className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">CloudHost</span>
          <span className="text-[10px] text-muted-foreground">Client Portal</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Menu</p>
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
                          "flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon className="w-[18px] h-[18px]" />
                          {item.name}
                        </span>
                        <ChevronRight
                          className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-90")}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 ml-[30px] space-y-0.5 border-l border-border pl-3">
                      {item.children?.map((child) => {
                        const isChildActive = pathname === child.href
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "block px-3 py-2 text-[13px] rounded-md transition-all duration-150",
                              isChildActive
                                ? "text-primary font-medium bg-primary/5"
                                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
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
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
          <p className="text-sm font-medium text-foreground">Need assistance?</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Our support team is available 24/7</p>
          <Separator className="my-3 bg-primary/10" />
          <Link
            href="/dashboard/support/new"
            className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Contact Support
            <ChevronRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
