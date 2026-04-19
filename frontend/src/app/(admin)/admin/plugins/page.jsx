"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Download, ShoppingCart, RefreshCw, Package,
  Star, TrendingUp, Zap, Filter, X, SortAsc,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PluginCard } from "@/components/marketplace/PluginCard";
import { StarRating } from "@/components/marketplace/StarRating";
import { CapabilityBadges } from "@/components/plugins/PluginCapabilityBadges";
import MarketplaceAPI from "@/lib/api/marketplace";
import { formatNumber } from "@/lib/utils";

// ── Skeleton grid ─────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </Card>
  );
}

// ── Install progress dialog ───────────────────────────────────────────────────

function InstallDialog({ open, onClose, slug, pluginName }) {
  const [status, setStatus] = useState("idle"); // idle | running | completed | failed
  const [step, setStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !slug) return;

    let cancelled = false;
    setStatus("running");
    setProgress(5);
    setStep("Queuing installation…");

    (async () => {
      try {
        const { jobId } = await MarketplaceAPI.enqueueInstall(slug);
        if (cancelled) return;
        setProgress(15);
        setStep("Downloading plugin…");

        // Poll for status
        let attempts = 0;
        const maxAttempts = 60;
        while (!cancelled && attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1500));
          const job = await MarketplaceAPI.getJobStatus(jobId);
          if (cancelled) return;

          attempts++;
          const p = Math.min(15 + (attempts / maxAttempts) * 75, 90);
          setProgress(p);
          if (job.step) setStep(job.step);

          if (job.status === "completed") {
            setProgress(100);
            setStep("Installation complete!");
            setStatus("completed");
            toast({ title: "Plugin installed", description: `${pluginName} was installed successfully.` });
            return;
          }
          if (job.status === "failed") {
            throw new Error(job.error || "Installation failed");
          }
        }
        throw new Error("Timed out waiting for installation to complete");
      } catch (err) {
        if (!cancelled) {
          setStatus("failed");
          setError(err.message);
          toast({ variant: "destructive", title: "Installation failed", description: err.message });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [open, slug]);

  return (
    <Dialog open={open} onOpenChange={v => !v && status !== "running" && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === "completed" ? "Plugin Installed" : status === "failed" ? "Installation Failed" : `Installing ${pluginName}`}
          </DialogTitle>
          <DialogDescription>
            {status === "failed" ? error : step || "Preparing…"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}%</p>
        </div>

        <DialogFooter>
          {status !== "running" && (
            <Button onClick={onClose} variant={status === "failed" ? "destructive" : "default"}>
              {status === "completed" ? "Done" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Billing", "Provisioning", "Communication", "Analytics", "Security", "Automation", "Integration"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "rating",  label: "Highest Rated" },
  { value: "name",    label: "Name A–Z" },
];

export default function AdminPluginsMarketplacePage() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [installing, setInstalling] = useState(null); // { slug, name }
  const { toast } = useToast();

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MarketplaceAPI.listPlugins();
      setPlugins(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load marketplace", description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlugins(); }, [loadPlugins]);

  // ── Filtering + sorting ──────────────────────────────────────────
  const filtered = plugins
    .filter(p => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name?.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false;
      }
      if (category !== "All" && p.category !== category) return false;
      if (pricingFilter === "free" && p.pricingType !== "free") return false;
      if (pricingFilter === "paid" && p.pricingType === "free") return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "name")    return (a.name || "").localeCompare(b.name || "");
      if (sort === "rating")  return (b.rating || 0) - (a.rating || 0);
      if (sort === "popular") return (b.salesCount || 0) - (a.salesCount || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const hasFilters = search || category !== "All" || pricingFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Plugin Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and install plugins to extend your platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPlugins} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Package className="h-4 w-4" />{plugins.length} plugins</span>
          <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {plugins.filter(p => (p.rating || 0) >= 4).length} highly rated
          </span>
          <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-green-500" />
            {plugins.filter(p => p.pricingType === "free").length} free
          </span>
        </div>
      )}

      {/* Search + filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plugins…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={pricingFilter} onValueChange={setPricingFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Pricing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pricing</SelectItem>
                <SelectItem value="free">Free only</SelectItem>
                <SelectItem value="paid">Paid only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground"
                onClick={() => { setSearch(""); setCategory("All"); setPricingFilter("all"); }}>
                <X className="h-4 w-4" />Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              category === c
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:border-foreground/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Plugin grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">No plugins found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filters.</p>
          {hasFilters && (
            <Button variant="outline" size="sm" className="mt-4"
              onClick={() => { setSearch(""); setCategory("All"); setPricingFilter("all"); }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(plugin => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              detailHref={`/admin/plugins/${plugin.slug || plugin.id}`}
              onInstall={slug => setInstalling({ slug, name: plugin.name })}
            />
          ))}
        </div>
      )}

      {/* Install progress dialog */}
      <InstallDialog
        open={!!installing}
        slug={installing?.slug}
        pluginName={installing?.name}
        onClose={() => { setInstalling(null); loadPlugins(); }}
      />
    </div>
  );
}
