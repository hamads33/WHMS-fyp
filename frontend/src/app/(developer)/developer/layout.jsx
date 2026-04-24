"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Puzzle, PlusCircle, BarChart3,
  User, LogOut, ChevronRight, Code2, Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { href: "/developer/dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { href: "/developer/plugins",   label: "My Plugins",   icon: Puzzle },
  { href: "/developer/analytics", label: "Analytics",    icon: BarChart3 },
];

function NavItem({ href, label, icon: Icon, pathname }) {
  const isActive = pathname === href || (href !== "/developer" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className={cn("h-[15px] w-[15px] shrink-0", isActive ? "text-foreground" : "text-muted-foreground")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function DeveloperLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, loading, isAuthenticated, isDeveloper, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { router.push("/login"); return; }
    if (!isDeveloper) { router.push("/unauthorized"); }
  }, [loading, isAuthenticated, isDeveloper, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-2 text-center">
          <Skeleton className="h-8 w-8 rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading developer portal…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isDeveloper) return null;

  const emailShort = user?.email?.split("@")[0] ?? "Developer";
  const initials   = user?.email?.slice(0, 2)?.toUpperCase() ?? "DV";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex h-screen w-56 shrink-0 flex-col bg-card border-r border-border">
        {/* Brand */}
        <div className="flex h-14 items-center gap-3 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground">
            <Code2 className="h-4 w-4 text-background" />
          </div>
          <div className="leading-none">
            <p className="text-sm font-semibold tracking-tight text-foreground">Dev Console</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Plugin Developer</p>
          </div>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3 px-3">
          <nav className="space-y-0.5">
            {NAV.map(item => (
              <NavItem key={item.href} {...item} pathname={pathname} />
            ))}

            <div className="mt-4 mb-1.5 px-3 pt-4 border-t border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Actions</p>
            </div>
            <Link
              href="/developer/plugins/new"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                pathname === "/developer/plugins/new"
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <PlusCircle className="h-[15px] w-[15px] shrink-0" />
              New Plugin
            </Link>
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 px-3 py-3 hover:bg-accent transition-colors outline-none">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground text-[11px] font-semibold select-none ring-1 ring-border">
                  {initials}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{emailShort}</p>
                  <p className="text-[10px] text-muted-foreground">Developer</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />Switch to Admin
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="h-4 w-4" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="text-foreground font-medium">
              {NAV.find(n => pathname === n.href || (n.href !== "/developer" && pathname.startsWith(n.href)))?.label ?? "Developer"}
            </span>
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
