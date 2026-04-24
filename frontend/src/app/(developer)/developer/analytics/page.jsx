"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3, Download, DollarSign, Star, RefreshCw,
  TrendingUp, Package, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import MarketplaceAPI from "@/lib/api/marketplace";
import { formatNumber, formatDate } from "@/lib/utils";

function KpiCard({ label, value, icon: Icon, sub, color = "text-foreground", loading }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading
              ? <Skeleton className="h-8 w-24 mt-1" />
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

function DeveloperAnalyticsPageContent() {
  const searchParams  = useSearchParams();
  const initialPlugin = searchParams.get("plugin") ?? "all";

  const [plugins, setPlugins]   = useState([]);
  const [selected, setSelected] = useState(initialPlugin);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [aLoading, setALoading] = useState(false);
  const { toast } = useToast();

  // Load plugin list
  useEffect(() => {
    MarketplaceAPI.listDeveloperPlugins()
      .then(data => {
        setPlugins(data);
        // If initial plugin is set but doesn't exist in list, fall back to first
        if (initialPlugin !== "all" && !data.find(p => p.id === initialPlugin) && data.length > 0) {
          setSelected(data[0].id);
        }
      })
      .catch(err => toast({ variant: "destructive", title: "Load failed", description: err.message }))
      .finally(() => setLoading(false));
  }, []);

  // Load analytics for selected plugin
  const loadAnalytics = useCallback(async () => {
    if (!selected || selected === "all") {
      setAnalytics(null);
      return;
    }
    setALoading(true);
    try {
      const data = await MarketplaceAPI.getDeveloperAnalytics(selected);
      setAnalytics(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Analytics failed", description: err.message });
      setAnalytics(null);
    } finally {
      setALoading(false);
    }
  }, [selected]);

  useEffect(() => { if (!loading) loadAnalytics(); }, [selected, loading]);

  // Aggregate all-plugin totals
  const totals = {
    installs: plugins.reduce((s, p) => s + (p.salesCount || 0), 0),
    revenue:  plugins.reduce((s, p) => s + (p.totalRevenue || 0), 0),
    plugins:  plugins.length,
    approved: plugins.filter(p => p.status === "approved").length,
  };

  // Chart data from growth_over_time
  const chartData = analytics?.growth_over_time?.map(row => ({
    month: row.period ?? row.month ?? row.date,
    revenue: row.revenue ?? 0,
    sales: row.sales ?? row.count ?? 0,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track installs, revenue, and ratings for your plugins.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={aLoading} className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${aLoading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Overall totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Plugins"   value={totals.plugins}             icon={Package}   loading={loading} />
        <KpiCard label="Live Plugins"    value={totals.approved}            icon={TrendingUp} loading={loading} color="text-green-600 dark:text-green-400" />
        <KpiCard label="Total Installs"  value={formatNumber(totals.installs)} icon={Download}  loading={loading} />
        <KpiCard label="Total Revenue"   value={`$${totals.revenue.toFixed(2)}`} icon={DollarSign} loading={loading} color="text-green-600 dark:text-green-400" />
      </div>

      {/* Plugin selector */}
      {plugins.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">Viewing:</span>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select plugin" />
            </SelectTrigger>
            <SelectContent>
              {plugins.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Per-plugin analytics */}
      {selected && selected !== "all" && (
        <>
          {aLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard label="Installs"     value={formatNumber(analytics.installs)}     icon={Download}  loading={false} />
                <KpiCard label="Active"       value={formatNumber(analytics.activeInstalls)} icon={TrendingUp} loading={false} color="text-green-600 dark:text-green-400" />
                <KpiCard label="Revenue"      value={`$${(analytics.revenue ?? 0).toFixed(2)}`} icon={DollarSign} loading={false} color="text-green-600 dark:text-green-400" />
                <KpiCard label="Avg Rating"   value={`${(analytics.rating ?? 0).toFixed(1)} / 5`} icon={Star} loading={false} color="text-yellow-500" sub={`${analytics.reviewCount ?? 0} reviews`} />
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Growth Over Time</CardTitle>
                    <CardDescription>Monthly sales and revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" name="Sales" />
                        <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="rgba(34,197,94,0.1)" name="Revenue ($)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No analytics data available yet.</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Analytics appear once your plugin gets installs.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {plugins.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No plugins yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create a plugin to start tracking analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DeveloperAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <DeveloperAnalyticsPageContent />
    </Suspense>
  );
}
