"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users, Globe, DollarSign, Ticket,
  TrendingUp, ArrowRight, Server, ShoppingCart,
  AlertCircle, CheckCircle2, Layers, Zap, Settings,
  HardDrive, BarChart3, RefreshCw, Headphones, Workflow,
  Activity, Megaphone, Radio, LayoutDashboard,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// UI Components (shadcn)
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Dashboard Widgets
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { ServerHealthWidget } from "@/components/admin/dashboard/ServerHealthWidget";
import { BackupTrendWidget } from "@/components/admin/dashboard/BackupTrendWidget";
import { AutomationHealthWidget } from "@/components/admin/dashboard/AutomationHealthWidget";
import { ActivityFeedWidget } from "@/components/admin/dashboard/ActivityFeedWidget";
import { ClientGrowthChart } from "@/components/admin/dashboard/ClientGrowthChart";

import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) { return Number(n ?? 0).toLocaleString("en-US"); }
function fmtMoney(n) { return "$" + Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtK(n) { const v = Number(n ?? 0); if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`; return `$${v.toLocaleString()}`; }

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_CLS = {
  active:             "bg-secondary text-foreground border border-border",
  pending:            "bg-muted text-muted-foreground border border-border",
  suspended:          "bg-destructive/10 text-destructive border border-destructive/30",
  cancelled:          "bg-muted text-muted-foreground",
  terminated:         "bg-muted text-muted-foreground",
  open:               "bg-secondary text-foreground border border-border",
  waiting_for_staff:  "bg-secondary text-foreground border border-border",
  waiting_for_client: "bg-muted text-muted-foreground border border-border",
  on_hold:            "bg-muted text-muted-foreground border border-border",
  closed:             "bg-muted text-muted-foreground",
};

const PRIORITY_CLS = {
  low:      "text-muted-foreground",
  medium:   "text-foreground",
  high:     "text-foreground font-semibold",
  critical: "text-destructive font-bold",
};

function StatusBadge({ status }) {
  const cls = STATUS_CLS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {(status ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

// ─── Revenue Chart (shadcn Card) ──────────────────────────────────────────────

function RevenueAreaChart({ data, loading }) {
  const total = data.reduce((s, d) => s + (d.revenue ?? 0), 0);
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="text-xs font-semibold uppercase tracking-widest">Revenue Trend</CardDescription>
            {loading
              ? <Skeleton className="h-7 w-32 mt-1" />
              : <CardTitle className="text-2xl font-bold mt-0.5">{fmtMoney(total)}</CardTitle>
            }
            <CardDescription className="text-xs mt-1">Past 12 months · all paid invoices</CardDescription>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <TrendingUp className="h-4 w-4 text-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading
          ? <Skeleton className="h-52 w-full rounded-lg" />
          : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--foreground))" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip
                formatter={(v, n) => [n === "revenue" ? fmtMoney(v) : v, n === "revenue" ? "Revenue" : "Invoices"]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="hsl(var(--foreground))" strokeWidth={2} fill="url(#revGrd)" dot={false} activeDot={{ r: 4, fill: "hsl(var(--foreground))", stroke: "hsl(var(--card))", strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Revenue Summary Card ─────────────────────────────────────────────────────

function RevSummaryCard({ label, amount, count, icon: Icon, loading }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          {loading
            ? <Skeleton className="h-5 w-20 mt-1" />
            : <p className="text-lg font-bold text-foreground tabular-nums">{fmtMoney(amount)}</p>
          }
          {!loading && count !== undefined && <p className="text-[11px] text-muted-foreground">{fmt(count)} invoices</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── System Status Bar ────────────────────────────────────────────────────────

function StatusBar({ summary, loading }) {
  const kpis = summary?.kpis ?? {};
  const items = [
    { label: "System Health",  value: `${kpis.systemHealthScore ?? 100}%`, positive: (kpis.systemHealthScore ?? 100) >= 80 },
    { label: "Backup Rate",    value: `${kpis.backupSuccessRate ?? 100}%`, positive: (kpis.backupSuccessRate ?? 100) >= 90 },
    { label: "Prov. Success",  value: `${kpis.provSuccessRate ?? 100}%`,  positive: (kpis.provSuccessRate ?? 100) >= 90 },
    { label: "Cron Success",   value: `${kpis.cronSuccessRate ?? 100}%`,  positive: (kpis.cronSuccessRate ?? 100) >= 90 },
    { label: "Servers",        value: fmt(kpis.totalServers ?? 0),         positive: true },
    { label: "Failed Prov.",   value: fmt(kpis.failedProvisioning ?? 0),   positive: (kpis.failedProvisioning ?? 0) === 0 },
  ];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-border">
          {items.map(({ label, value, positive }) => (
            <div key={label} className="px-4 py-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
              {loading
                ? <Skeleton className="h-4 w-12 mx-auto" />
                : <p className={`text-sm font-bold tabular-nums ${positive ? "text-foreground" : "text-destructive"}`}>{value}</p>
              }
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Recent Orders ────────────────────────────────────────────────────────────

function RecentOrdersCard({ orders = [], loading }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Recent Orders</CardTitle>
            <CardDescription className="text-xs mt-0.5">Latest service purchases</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
            <Link href="/admin/orders">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => (
              <Link key={o.id} href="/admin/orders" className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground uppercase">
                  {(o.clientName || o.clientEmail || "?").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.serviceName}{o.planName ? ` · ${o.planName}` : ""}</p>
                  <p className="text-xs text-muted-foreground truncate">{o.clientName || o.clientEmail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={o.status} />
                  <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(o.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recent Tickets ───────────────────────────────────────────────────────────

function RecentTicketsCard({ tickets = [], loading }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Support Queue</CardTitle>
            <CardDescription className="text-xs mt-0.5">Awaiting response</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
            <Link href="/admin/support">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-3.5 flex-1 w-48" />
                <Skeleton className="h-5 w-14 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Ticket className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No open tickets</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((t) => (
              <Link key={t.id} href="/admin/support" className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.clientEmail}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    {t.priority && <span className={`text-[10px] font-bold uppercase ${PRIORITY_CLS[t.priority] ?? "text-muted-foreground"}`}>{t.priority}</span>}
                    <StatusBadge status={t.status} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(t.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Access ─────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: "Clients",    href: "/admin/clients",    icon: Users       },
  { label: "Orders",     href: "/admin/orders",     icon: ShoppingCart},
  { label: "Billing",    href: "/admin/billing",    icon: DollarSign  },
  { label: "Services",   href: "/admin/services",   icon: Layers      },
  { label: "Domains",    href: "/admin/domains",    icon: Globe       },
  { label: "Support",    href: "/admin/support",    icon: Headphones  },
  { label: "Automation", href: "/admin/automation", icon: Zap         },
  { label: "Workflows",  href: "/admin/workflows",  icon: Workflow    },
  { label: "Servers",    href: "/admin/servers",    icon: Server      },
  { label: "Backups",    href: "/admin/backups",    icon: HardDrive   },
  { label: "Broadcast",  href: "/admin/broadcast",  icon: Megaphone   },
  { label: "Settings",   href: "/admin/settings",   icon: Settings    },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();

  const [summary,    setSummary]    = useState(null);
  const [statsData,  setStatsData]  = useState(null);
  const [charts,     setCharts]     = useState(null);
  const [serverData, setServerData] = useState(null);
  const [autoHealth, setAutoHealth] = useState(null);
  const [activity,   setActivity]   = useState([]);

  const [loadingA, setLoadingA] = useState(true);
  const [loadingB, setLoadingB] = useState(true);
  const [loadingC, setLoadingC] = useState(true);
  const [loadingD, setLoadingD] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    // Wave A — KPIs (highest priority, shown first)
    Promise.allSettled([
      apiFetch("/admin/dashboard/summary"),
      apiFetch("/admin/dashboard/stats"),
    ]).then(([sRes, dRes]) => {
      if (sRes.status === "fulfilled" && sRes.value?.success) setSummary(sRes.value.data);
      if (dRes.status === "fulfilled" && dRes.value?.success) setStatsData(dRes.value.data);
      setLoadingA(false);
    });

    // Wave B — Charts
    apiFetch("/admin/dashboard/charts")
      .then((r) => { if (r?.success) setCharts(r.data); })
      .catch(() => {})
      .finally(() => setLoadingB(false));

    // Wave C — Infrastructure
    Promise.allSettled([
      apiFetch("/admin/dashboard/server-insights"),
      apiFetch("/admin/dashboard/automation-health"),
    ]).then(([srvR, autoR]) => {
      if (srvR.status === "fulfilled" && srvR.value?.success) setServerData(srvR.value.data);
      if (autoR.status === "fulfilled" && autoR.value?.success) setAutoHealth(autoR.value.data);
      setLoadingC(false);
    });

    // Wave D — Activity feed
    apiFetch("/admin/dashboard/activity?limit=20")
      .then((r) => { if (r?.success) setActivity(r.data ?? []); })
      .catch(() => {})
      .finally(() => { setLoadingD(false); if (isRefresh) setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const greeting = (() => {
    const h = new Date().getHours();
    const name = user?.email?.split("@")[0] ?? "Admin";
    return h < 12 ? `Good morning, ${name}` : h < 17 ? `Good afternoon, ${name}` : `Good evening, ${name}`;
  })();

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const kpis = summary?.kpis ?? {};
  const sparklines = summary?.sparklines ?? {};
  const serverHealth = summary?.serverHealth ?? {};

  return (
    <div className="space-y-5 pb-6">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl border border-border bg-primary flex items-center justify-center shadow-sm shrink-0">
            <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{greeting}</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-border bg-secondary text-foreground">
                <Radio className="h-2.5 w-2.5" /> Operational
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-border bg-card shadow-sm shrink-0">
          <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={refreshing} className="gap-1.5 h-8 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ── System Status Bar ─────────────────────────────── */}
      <StatusBar summary={summary} loading={loadingA} />

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-stretch">
        <KpiCard title="Total Clients"     value={fmt(kpis.totalClients)}       sub={statsData?.clients?.active != null ? `${fmt(statsData.clients.active)} active` : undefined} icon={Users}        href="/admin/clients"  loading={loadingA} sparkline={sparklines.clients} />
        <KpiCard title="Monthly Revenue"   value={fmtK(kpis.monthlyRevenue)}    sub={kpis.monthlyInvoiceCount ? `${fmt(kpis.monthlyInvoiceCount)} invoices` : undefined}          icon={DollarSign}   href="/admin/billing"  loading={loadingA} sparkline={sparklines.revenue} />
        <KpiCard title="Active Orders"     value={fmt(kpis.activeOrders)}       sub={kpis.totalOrders ? `of ${fmt(kpis.totalOrders)} total` : undefined}                         icon={ShoppingCart} href="/admin/orders"   loading={loadingA} sparkline={sparklines.provisioning} />
        <KpiCard title="Open Tickets"      value={fmt(kpis.openTickets)}        sub="Awaiting response"                                                                          icon={Ticket}       href="/admin/support"  loading={loadingA} />
        <KpiCard title="Pending Invoices"  value={fmt(kpis.pendingInvoices)}    sub={kpis.overdueInvoices ? `${fmt(kpis.overdueInvoices)} overdue` : "All up to date"}          icon={AlertCircle}  href="/admin/billing"  loading={loadingA} trendOverride={kpis.overdueInvoices > 0 ? -1 : 0} />
        <KpiCard title="System Health"     value={`${kpis.systemHealthScore ?? 100}%`} sub={`${fmt(kpis.totalServers ?? 0)} servers · ${fmt(kpis.totalServices ?? 0)} services`} icon={Activity}                            loading={loadingA} trendOverride={(kpis.systemHealthScore ?? 100) >= 90 ? 2 : (kpis.systemHealthScore ?? 100) >= 70 ? 0 : -5} />
      </div>

      {/* ── Revenue Chart + Revenue Summary ──────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueAreaChart data={charts?.revenueChart ?? []} loading={loadingB} />
        </div>
        <div className="flex flex-col gap-3">
          <RevSummaryCard label="This Month" amount={statsData?.revenue?.monthly?.amount} count={statsData?.revenue?.monthly?.count} icon={TrendingUp}   loading={loadingA} />
          <RevSummaryCard label="This Year"  amount={statsData?.revenue?.yearly?.amount}  count={statsData?.revenue?.yearly?.count}  icon={BarChart3}    loading={loadingA} />
          <RevSummaryCard label="All Time"   amount={statsData?.revenue?.allTime?.amount} count={statsData?.revenue?.allTime?.count} icon={CheckCircle2} loading={loadingA} />
          <div className="grid grid-cols-2 gap-3 flex-1">
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Globe className="h-5 w-5 text-foreground mb-1.5" />
                {loadingA ? <Skeleton className="h-5 w-10" /> : <p className="text-xl font-bold text-foreground">{fmt(statsData?.domains ?? kpis.totalDomains ?? 0)}</p>}
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Domains</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Layers className="h-5 w-5 text-foreground mb-1.5" />
                {loadingA ? <Skeleton className="h-5 w-10" /> : <p className="text-xl font-bold text-foreground">{fmt(statsData?.services ?? kpis.totalServices ?? 0)}</p>}
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Services</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Infrastructure Row ────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ServerHealthWidget
          servers={serverData?.servers ?? []}
          serverHealth={serverHealth}
          loading={loadingC}
        />
        <BackupTrendWidget data={charts?.backupChart ?? []} loading={loadingB} />
        <AutomationHealthWidget health={autoHealth} loading={loadingC} />
      </div>

      {/* ── Client Growth Chart ───────────────────────────── */}
      <ClientGrowthChart data={charts?.clientChart ?? []} loading={loadingB} />

      {/* ── Orders + Tickets ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentOrdersCard  orders={statsData?.recentOrders  ?? []} loading={loadingA} />
        <RecentTicketsCard tickets={statsData?.recentTickets ?? []} loading={loadingA} />
      </div>

      {/* ── Activity Feed + Quick Access ──────────────────── */}
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ActivityFeedWidget data={activity} loading={loadingD} />
        </div>
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm">Quick Access</CardTitle>
            <CardDescription className="text-xs mt-0.5">Navigate to any module</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-3 gap-px bg-border">
              {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1.5 px-2 py-4 bg-card hover:bg-muted/60 transition-colors group text-center"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted group-hover:bg-background transition-colors">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
