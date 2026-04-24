"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PlusCircle, ArrowRight, Package, RefreshCw, Puzzle, Upload,
  CheckCircle2, XCircle, Clock, Edit3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import MarketplaceAPI from "@/lib/api/marketplace";
import { CapabilityBadges } from "@/components/plugins/PluginCapabilityBadges";
import { formatDate, formatNumber } from "@/lib/utils";

function StatusBadge({ status }) {
  const map = {
    draft:        { label: "Draft",        cls: "bg-muted text-muted-foreground border-border" },
    submitted:    { label: "Submitted",    cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" },
    under_review: { label: "Under Review", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" },
    approved:     { label: "Approved",     cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" },
    rejected:     { label: "Rejected",     cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function PluginRow({ plugin }) {
  return (
    <Link
      href={`/developer/plugins/${plugin.id}`}
      className="flex items-center gap-4 py-4 hover:bg-muted/30 -mx-4 px-4 transition-colors rounded-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-base font-bold text-muted-foreground select-none">
        {plugin.iconUrl
          ? <Image src={plugin.iconUrl} alt={plugin.name} width={32} height={32} className="object-contain rounded" />
          : (plugin.name?.[0] ?? "P")}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">{plugin.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{plugin.slug}</span>
          {plugin.version && <span className="text-xs text-muted-foreground">v{plugin.version}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-muted-foreground">Updated {formatDate(plugin.updatedAt ?? plugin.createdAt, "short")}</p>
          {plugin.salesCount > 0 && (
            <p className="text-xs text-muted-foreground">{formatNumber(plugin.salesCount)} installs</p>
          )}
          {plugin.capabilities?.length > 0 && (
            <CapabilityBadges capabilities={plugin.capabilities} size="xs" max={3} />
          )}
          {plugin.pricingType === "free" ? (
            <span className="text-xs text-green-600 dark:text-green-400">Free</span>
          ) : (
            <span className="text-xs text-foreground font-medium">${(plugin.price / 100).toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={plugin.status} />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default function DeveloperPluginsPage() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MarketplaceAPI.listDeveloperPlugins();
      setPlugins(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Load failed", description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = plugins.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const statusCounts = {
    draft:        plugins.filter(p => p.status === "draft").length,
    submitted:    plugins.filter(p => p.status === "submitted").length,
    under_review: plugins.filter(p => p.status === "under_review").length,
    approved:     plugins.filter(p => p.status === "approved").length,
    rejected:     plugins.filter(p => p.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Plugins</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your plugin submissions and versions.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" asChild className="gap-2">
            <Link href="/developer/plugins/new"><PlusCircle className="h-4 w-4" />New Plugin</Link>
          </Button>
        </div>
      </div>

      {/* Status summary */}
      {!loading && plugins.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).filter(([, v]) => v > 0).map(([status, count]) => (
            <StatusBadge key={status} status={status} />
          ))}
          <span className="text-sm text-muted-foreground self-center">{plugins.length} total</span>
        </div>
      )}

      {/* Search */}
      {plugins.length > 0 && (
        <Input
          placeholder="Search plugins by name or slug…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      )}

      <Card>
        <CardContent className="p-0 px-4 divide-y divide-border">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-32" /></div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <Puzzle className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">
                {search ? "No matching plugins" : "No plugins yet"}
              </p>
              {!search && (
                <Button size="sm" className="mt-4 gap-2" asChild>
                  <Link href="/developer/plugins/new"><PlusCircle className="h-4 w-4" />Create your first plugin</Link>
                </Button>
              )}
            </div>
          ) : (
            filtered.map(p => <PluginRow key={p.id} plugin={p} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
