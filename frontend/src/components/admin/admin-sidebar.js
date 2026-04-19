"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Users, Globe, HardDrive, Zap,
  Puzzle, MonitorSmartphone, UserCheck, Lock, Workflow,
  Settings, ChevronLeft, ChevronRight, Server,
  Layers, Receipt, LogOut, Network,
  ChevronsUpDown, Mail, ChevronDown, List, Headphones,
  Megaphone, DollarSign, ScrollText, BarChart3, Activity,
  ClipboardList, Star,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/context/AuthContext";
import MarketplaceAPI from "@/lib/api/marketplace"
import { PluginSidebarSection } from "@/components/plugins/PluginSidebarSection";

const COLLAPSE_KEY = "whms-sidebar-collapsed";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { name: "Dashboard",     href: "/admin/dashboard",         icon: LayoutDashboard, permKey: "canAccessAdmin" },
      { name: "Clients",       href: "/admin/clients",           icon: Users,           permKey: "canViewUsers" },
      { name: "Services",      href: "/admin/services",          icon: Layers,          permKey: "canViewServices" },
      { name: "Orders",        href: "/admin/orders",            icon: Receipt,         permKey: "canViewOrders" },
      { name: "Billing",       href: "/admin/billing",           icon: DollarSign,      permKey: "canAccessAdmin" },
      { name: "Domains",       href: "/admin/domains",           icon: Globe,           permKey: "canAccessAdmin" },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Support",        href: "/admin/support",           icon: Headphones,      permKey: "canAccessAdmin" },
      { name: "Backups",        href: "/admin/backups",           icon: HardDrive,       permKey: "canViewBackups" },
      { name: "Broadcast",      href: "/admin/broadcast",         icon: Megaphone,       permKey: "canAccessAdmin" },
      { name: "Automation",     href: "/admin/automation",        icon: Zap,             permKey: "canViewAutomation" },
      { name: "Workflows",      href: "/admin/workflows",         icon: Workflow,        permKey: "canViewAutomation" },
      { name: "Email Builder",  href: "/admin/email-builder",     icon: Mail,            permKey: "canAccessAdmin" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { name: "Servers",       href: "/admin/servers",           icon: Server,          permKey: "canAccessAdmin" },
    ],
  },
  {
    label: "Plugins",
    items: [
      { name: "Marketplace",   href: "/admin/plugins",                     icon: Puzzle,        permKey: "canManagePlugins" },
      { name: "Installed",     href: "/admin/plugins/installed",           icon: Server,        permKey: "canManagePlugins" },
      { name: "Submissions",   href: "/admin/marketplace",                 icon: ClipboardList, permKey: "canApprovePlugins" },
      { name: "Reviews",       href: "/admin/marketplace/reviews",         icon: Star,          permKey: "canManagePlugins" },
    ],
  },
  {
    label: "Security",
    items: [
      { name: "Sessions",      href: "/admin/sessions",          icon: MonitorSmartphone, permKey: "canViewSessions" },
      { name: "Impersonation", href: "/admin/impersonation",     icon: UserCheck,       permKey: "canViewImpersonationLogs" },
      { name: "IP Rules",      href: "/admin/iprules",           icon: Network,         permKey: "canViewIpRules" },
      { name: "RBAC",          href: "/admin/rbac",              icon: Lock,            permKey: "canViewRoles" },
      { name: "Audit Logs",    href: "/admin/logs",              icon: ScrollText,      permKey: "canViewAuditLogs" },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Settings",      href: "/admin/settings",          icon: Settings,        permKey: "canAccessAdmin" },
    ],
  },
];

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({ item, isActive, collapsed }) {
  const Icon = item.icon;

  const content = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed ? "justify-center px-2" : "justify-start",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-foreground" aria-hidden="true" />
      )}
      <Icon className={cn(
        "h-[15px] w-[15px] shrink-0 transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
      )} />
      {!collapsed && (
        <span className="flex-1 truncate leading-none">{item.name}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// ── Collapsible nav item ──────────────────────────────────────────────────────

function CollapsibleNavItem({ item, pathname, collapsed }) {
  const Icon = item.icon;
  const isAnyChildActive = item.children.some(c => pathname === c.href || pathname.startsWith(c.href + "/"));
  const [open, setOpen] = useState(isAnyChildActive);

  useEffect(() => {
    if (isAnyChildActive) setOpen(true);
  }, [isAnyChildActive]);

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(o => !o)}
            className={cn(
              "group relative flex w-full items-center justify-center rounded-md px-2 py-2 text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isAnyChildActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className={cn("h-[15px] w-[15px] shrink-0", isAnyChildActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-0 overflow-hidden">
          <div className="py-1">
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">{item.name}</p>
            {item.children.map(child => {
              const CIcon = child.icon;
              const active = pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                    active ? "text-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <CIcon className="h-3.5 w-3.5" />
                  {child.name}
                </Link>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isAnyChildActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {isAnyChildActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-foreground" aria-hidden="true" />
        )}
        <Icon className={cn("h-[15px] w-[15px] shrink-0", isAnyChildActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
        <span className="flex-1 truncate leading-none text-left">{item.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-border space-y-0.5">
          {item.children.map(child => {
            const CIcon = child.icon;
            const active = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <CIcon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
                <span className="truncate">{child.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [pluginPages, setPluginPages] = useState([]);
  const perms = usePermissions();
  const { user, logout, isSuperAdmin } = useAuth();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved !== null) setCollapsed(JSON.parse(saved));
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  useEffect(() => {
    MarketplaceAPI.getPluginUiManifest()
      .then(res => {
        const entries = (res?.data ?? [])
          .filter(e => e.pages?.length > 0)
          .map(e => ({ plugin: e.plugin, name: e.displayName ?? e.plugin, pages: e.pages }));
        setPluginPages(entries);
      })
      .catch(() => {});
  }, []);

  const roleLabel  = isSuperAdmin ? "Superadmin" : "Admin";
  const initials   = user?.email ? user.email.slice(0, 2).toUpperCase() : "AD";
  const emailShort = user?.email?.split("@")[0] ?? "Admin";

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-screen flex-col bg-card border-r border-border transition-[width] duration-200 ease-in-out shrink-0 overflow-hidden",
          collapsed ? "w-[56px]" : "w-[232px]"
        )}
        aria-label="Admin navigation"
      >

        {/* ── Brand ── */}
        <div className={cn(
          "flex h-14 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-0" : "px-4 gap-3"
        )}>
          <Link
            href="/admin/dashboard"
            aria-label="WHMS Admin Dashboard"
            className="flex items-center gap-3 min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground">
              <Server className="h-4 w-4 text-background" />
            </div>
            {!collapsed && (
              <div className="min-w-0 leading-none">
                <p className="text-sm font-semibold tracking-tight text-foreground">WHMS</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">Admin Portal</p>
              </div>
            )}
          </Link>
        </div>

        {/* ── Navigation ── */}
        <ScrollArea className="flex-1 min-h-0">
          <nav
            className={cn("py-3 space-y-0.5", collapsed ? "px-2" : "px-3")}
            aria-label="Main navigation"
          >
            {NAV_GROUPS.map((group, groupIdx) => {
              const visibleItems = group.items.filter(item => perms[item.permKey]);
              if (visibleItems.length === 0) return null;

              return (
                <div key={groupIdx} className={groupIdx > 0 ? "mt-5" : ""}>
                  {group.label && !collapsed && (
                    <p className="mb-1.5 mt-0.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                      {group.label}
                    </p>
                  )}
                  {group.label && collapsed && (
                    <div className="mb-2 h-px bg-border" />
                  )}

                  <div className="space-y-0.5">
                    {visibleItems.map(item => {
                      if (item.children?.length) {
                        return <CollapsibleNavItem key={item.name} item={item} pathname={pathname} collapsed={collapsed} />;
                      }
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return <NavItem key={item.name} item={item} isActive={isActive} collapsed={collapsed} />;
                    })}
                  </div>
                </div>
              );
            })}

            {pluginPages.length > 0 && perms.canManagePlugins && (
              <div className="mt-5">
                {!collapsed && (
                  <p className="mb-1.5 mt-0.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                    Plugin Pages
                  </p>
                )}
                {collapsed && <div className="mb-2 h-px bg-border" />}
                <PluginSidebarSection entries={pluginPages} pathname={pathname} collapsed={collapsed} />
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border">

          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-3 cursor-default">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground text-[11px] font-semibold select-none ring-1 ring-border">
                    {initials}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{user?.email ?? "Admin"}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2.5 px-3 py-3 hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring rounded-none">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground text-[11px] font-semibold select-none ring-1 ring-border">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-medium truncate text-foreground leading-none">{emailShort}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{roleLabel}</p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium truncate">{user?.email ?? "Admin"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{roleLabel}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="gap-2">
                    <Settings className="h-4 w-4" /> Settings
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
          )}

          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center justify-center py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring border-t border-border"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

      </aside>
    </TooltipProvider>
  );
}
