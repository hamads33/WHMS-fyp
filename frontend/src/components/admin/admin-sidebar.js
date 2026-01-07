"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; 
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Globe,
  HardDrive,
  Zap,
  Puzzle,
  MonitorSmartphone,
  UserCheck,
  Shield,
  Key,
  Lock,
  Webhook,
  Settings,
  ChevronLeft,
  ChevronRight,
  Server,
  Workflow, 
  Layers,
   Receipt
} from "lucide-react";

/**
 * Admin Navigation
 * UI-only. Backend enforces access.
 */
const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/admin/clients", icon: Users, badge: "" },
  { name: "Services", href: "/admin/services", icon: Layers },
  { name: "Orders", href: "/admin/orders", icon: Receipt },
  { name: "Domains", href: "/admin/domains", icon: Globe, badge: "" },
  { name: "Backups", href: "/admin/backups", icon: HardDrive },
  { name: "Automation", href: "/admin/automation", icon: Zap },
  { name: "Plugins", href: "/admin/plugins", icon: Puzzle,  },
  { name: "Sessions", href: "/admin/sessions", icon: MonitorSmartphone },
  { name: "Impersonation", href: "/admin/impersonation", icon: UserCheck },
  { name: "Workflows", href: "/admin/workflows", icon: Workflow },
  { name: "IP Rules", href: "/admin/iprules", icon: Settings },
  { name: "RBAC", href: "/admin/rbac", icon: Lock },
   { name: "Logs", href: "/admin/logs", icon: Lock },
  // { name: "Webhooks", href: "/admin/webhooks", icon: Webhook },
  // { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* BRAND */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Server className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground">
              WHMS
            </span>
          )}
        </Link>
      </div>

      {/* NAV */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive && "text-primary"
                    )}
                  />

                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">
                        {item.name}
                      </span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* COLLAPSE */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}