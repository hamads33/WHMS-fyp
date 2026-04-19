"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, Power, PowerOff, ChevronRight, PackageOpen,
  CheckCircle2, XCircle, AlertCircle, ArrowUpCircle, Puzzle,
  Search, Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CapabilityBadges } from "@/components/plugins/PluginCapabilityBadges";
import MarketplaceAPI from "@/lib/api/marketplace";

// ── State badge ───────────────────────────────────────────────────────────────

function StateBadge({ state, enabled }) {
  if (!enabled) {
    return <Badge variant="secondary" className="gap-1 text-xs"><PowerOff className="h-3 w-3" />Disabled</Badge>;
  }
  const stateMap = {
    active:      { label: "Active",      icon: CheckCircle2, cls: "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400" },
    booting:     { label: "Booting",     icon: AlertCircle,  cls: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" },
    failed:      { label: "Failed",      icon: XCircle,      cls: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400" },
    downloading: { label: "Downloading", icon: AlertCircle,  cls: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" },
  };
  const meta = stateMap[state] ?? { label: state || "Unknown", icon: AlertCircle, cls: "text-muted-foreground bg-muted" };
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${meta.cls}`}>
      <Icon className="h-3 w-3" />{meta.label}
    </Badge>
  );
}

// ── Plugin row ────────────────────────────────────────────────────────────────

function PluginRow({ plugin, onToggle, toggling }) {
  return (
    <div className="flex items-start gap-4 py-4">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
        {plugin.iconUrl ? (
          <img src={plugin.iconUrl} alt={plugin.name} className="h-8 w-8 object-contain rounded" />
        ) : (
          <Puzzle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">{plugin.name}</span>
          <span className="text-xs text-muted-foreground">v{plugin.version || "—"}</span>
          <StateBadge state={plugin.state} enabled={plugin.enabled} />
        </div>
        {plugin.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plugin.description}</p>
        )}
        {plugin.capabilities?.length > 0 && (
          <div className="mt-1.5">
            <CapabilityBadges capabilities={plugin.capabilities} size="xs" max={4} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <Switch
          checked={!!plugin.enabled}
          onCheckedChange={checked => onToggle(plugin.name, checked)}
          disabled={toggling === plugin.name}
          aria-label={plugin.enabled ? "Disable plugin" : "Enable plugin"}
        />
      </div>
    </div>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 py-4">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-6 w-10 shrink-0" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InstalledPluginsPage() {
  const [plugins, setPlugins]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [toggling, setToggling] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MarketplaceAPI.listInstalledPlugins();
      setPlugins(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load plugins", description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (name, enable) => {
    setToggling(name);
    try {
      if (enable) {
        await MarketplaceAPI.enablePlugin(name);
        toast({ title: "Plugin enabled", description: `${name} is now active.` });
      } else {
        await MarketplaceAPI.disablePlugin(name);
        toast({ title: "Plugin disabled", description: `${name} has been disabled.` });
      }
      await load();
    } catch (err) {
      toast({ variant: "destructive", title: "Toggle failed", description: err.message });
    } finally {
      setToggling(null);
    }
  };

  const filtered = plugins.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const enabled  = plugins.filter(p => p.enabled).length;
  const disabled = plugins.filter(p => !p.enabled).length;
  const failed   = plugins.filter(p => p.state === "failed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Installed Plugins</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage plugins loaded on this server. Toggle to enable or disable.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/plugins">Browse Marketplace</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: plugins.length,   color: "text-foreground" },
            { label: "Active",    value: enabled,  color: "text-green-600 dark:text-green-400" },
            { label: "Disabled",  value: disabled, color: "text-muted-foreground" },
            { label: "Failed",    value: failed,   color: "text-red-500" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search installed plugins…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Plugin list */}
      <Card>
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${filtered.length} plugin${filtered.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-4 divide-y divide-border">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No plugins installed</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Install plugins from the marketplace.</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/admin/plugins">Browse Marketplace</Link>
              </Button>
            </div>
          ) : (
            filtered.map(plugin => (
              <PluginRow
                key={plugin.name}
                plugin={plugin}
                onToggle={handleToggle}
                toggling={toggling}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
