"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package, Download, DollarSign, Star, PlusCircle,
  TrendingUp, ArrowRight, RefreshCw, Puzzle, AlertCircle,
  CheckCircle2, Clock, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/context/AuthContext";
import MarketplaceAPI from "@/lib/api/marketplace";
import { formatNumber, formatDate } from "@/lib/utils";

function KpiCard({ label, value, icon: Icon, sub, loading, color = "text-foreground" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading
              ? <Skeleton className="h-8 w-20 mt-1" />
              : <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>}
            {sub && !loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft:        { cls: "bg-muted text-muted-foreground",                                           label: "Draft" },
    submitted:    { cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",   label: "Submitted" },
    under_review: { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400", label: "Under Review" },
    approved:     { cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400", label: "Approved" },
    rejected:     { cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",       label: "Rejected" },
  };
  const m = map[status] ?? { cls: "bg-muted text-muted-foreground", label: status };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

export default function DeveloperDashboardPage() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user }  = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    MarketplaceAPI.listDeveloperPlugins()
      .then(data => setPlugins(data))
      .catch(err => toast({ variant: "destructive", title: "Load failed", description: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const totalInstalls = plugins.reduce((s, p) => s + (p.salesCount || 0), 0);
  const totalRevenue  = plugins.reduce((s, p) => s + (p.totalRevenue || 0), 0);
  const approved      = plugins.filter(p => p.status === "approved").length;
  const pending       = plugins.filter(p => p.status === "submitted" || p.status === "under_review").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s an overview of your plugins and performance.</p>
        </div>
        <Button asChild size="sm" className="gap-2 shrink-0">
          <Link href="/developer/plugins/new">
            <PlusCircle className="h-4 w-4" />New Plugin
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Plugins"  value={plugins.length}          icon={Package}   loading={loading} />
        <KpiCard label="Approved"        value={approved}                icon={CheckCircle2} loading={loading} color="text-green-600 dark:text-green-400" />
        <KpiCard label="Pending Review"  value={pending}                 icon={Clock}     loading={loading} color="text-amber-600 dark:text-amber-400" />
        <KpiCard label="Total Sales"     value={formatNumber(totalInstalls)} icon={Download} loading={loading} />
      </div>

      {/* Revenue */}
      {!loading && totalRevenue > 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent plugins */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">My Plugins</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
              <Link href="/developer/plugins">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 px-4 divide-y divide-border">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))
          ) : plugins.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Puzzle className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No plugins yet</p>
              <Button size="sm" className="mt-3 gap-2" asChild>
                <Link href="/developer/plugins/new"><PlusCircle className="h-4 w-4" />Create your first plugin</Link>
              </Button>
            </div>
          ) : (
            plugins.slice(0, 5).map(p => (
              <Link key={p.id} href={`/developer/plugins/${p.id}`}
                className="flex items-center gap-4 py-4 hover:bg-muted/50 -mx-4 px-4 transition-colors rounded-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-base font-bold text-muted-foreground">
                  {p.iconUrl ? <Image src={p.iconUrl} alt={p.name} width={32} height={32} className="object-contain rounded" /> : p.name?.[0] ?? "P"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.updatedAt ?? p.createdAt, "short")}</p>
                </div>
                <StatusBadge status={p.status} />
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/developer/plugins/new",  icon: PlusCircle,  label: "Create Plugin",     sub: "Start a new plugin project" },
          { href: "/developer/analytics",    icon: BarChart3,   label: "View Analytics",    sub: "Check installs & revenue" },
          { href: "/developer/plugins",      icon: Package,     label: "Manage Plugins",    sub: "Update and submit versions" },
        ].map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.sub}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
