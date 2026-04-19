"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  User, Moon, Sun, Monitor, LogOut, ArrowRightLeft, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/context/AuthContext";

const PORTAL_CONFIG = {
  admin:     { label: "Admin Portal",     path: "/admin/dashboard" },
  client:    { label: "Client Portal",    path: "/client/dashboard" },
  developer: { label: "Developer Portal", path: "/developer" },
  reseller:  { label: "Reseller Portal",  path: "/reseller/dashboard" },
};

// Derive a readable breadcrumb label from the pathname
function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // e.g. ["admin", "clients", "123"] → "Clients"
  // find the segment after "admin"
  const adminIdx = segments.indexOf("admin");
  const section = adminIdx !== -1 ? segments[adminIdx + 1] : null;

  if (!section) return "Dashboard";

  const labels = {
    dashboard:    "Dashboard",
    clients:      "Clients",
    services:     "Services",
    orders:       "Orders",
    domains:      "Domains",
    backups:      "Backups",
    automation:   "Automation",
    workflows:    "Workflows",
    plugins:      "Marketplace",
    marketplace:  "Marketplace",
    sessions:     "Sessions",
    impersonation:"Impersonation",
    iprules:      "IP Rules",
    rbac:         "RBAC",
    logs:         "Audit Logs",
    settings:     "Settings",
    profile:      "Profile",
    support:      "Support",
    billing:      "Billing",
    servers:      "Servers",
    broadcast:    "Broadcast",
  };

  // Check for sub-section
  const subSection = segments[adminIdx + 2];
  if (section === "plugins") {
    if (subSection === "installed") return "Installed Plugins";
    if (subSection === "ui") return "Plugin UI";
    if (subSection) return "Plugin Details";
    return "Marketplace";
  }
  if (section === "marketplace") {
    if (subSection === "reviews") return "Reviews";
    if (subSection === "submissions") return "Submissions";
    return "Marketplace Submissions";
  }
  if (subSection === "new") return `New ${labels[section] ?? section}`;

  return labels[section] ?? section.charAt(0).toUpperCase() + section.slice(1);
}

export function AdminHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const breadcrumb = useBreadcrumb();

  const otherPortals = (user?.portals || []).filter(p => p !== "admin");
  const initials = user?.email?.[0]?.toUpperCase() ?? "U";

  async function handleLogout() {
    try {
      await logout();
    } catch {
      router.push("/login");
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 shrink-0">
      {/* Left: breadcrumb / page title */}
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-sm font-semibold text-foreground truncate">{breadcrumb}</h2>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Account dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-9 px-2.5 max-w-[220px]">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate hidden sm:inline-block">{user?.email ?? "Account"}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            {/* User identity */}
            <DropdownMenuLabel className="pb-2">
              <p className="font-semibold text-sm truncate">{user?.email ?? "Account"}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(user?.roles || []).map(r => (
                  <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0 leading-4 capitalize">{r}</Badge>
                ))}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/admin/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
            </DropdownMenuGroup>

            {/* Theme selector */}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light" className="gap-2">
                <Sun className="h-3.5 w-3.5" /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="gap-2">
                <Moon className="h-3.5 w-3.5" /> Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="gap-2">
                <Monitor className="h-3.5 w-3.5" /> System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            {/* Portal switcher */}
            {otherPortals.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
                  Switch Portal
                </DropdownMenuLabel>
                {otherPortals.map(portalKey => {
                  const config = PORTAL_CONFIG[portalKey];
                  if (!config) return null;
                  return (
                    <DropdownMenuItem key={portalKey} onClick={() => router.push(config.path)}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      {config.label}
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
