"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Download, ShoppingCart, RefreshCw, Star,
  Package, BadgeCheck, Sparkles, ExternalLink, Calendar, Tag,
  AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { StarRating } from "@/components/marketplace/StarRating";
import { CapabilityBadges } from "@/components/plugins/PluginCapabilityBadges";
import MarketplaceAPI from "@/lib/api/marketplace";
import { formatNumber, formatDate } from "@/lib/utils";

// Simple HTML sanitizer: remove script tags and dangerous attributes
const sanitizeText = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
};

// ── Install dialog (same as marketplace page) ─────────────────────────────────

function InstallDialog({ open, onClose, slug, pluginName }) {
  const [status, setStatus] = useState("idle");
  const [step, setStep]     = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError]   = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !slug) return;
    let cancelled = false;
    setStatus("running"); setProgress(5); setStep("Queuing installation…"); setError(null);

    (async () => {
      try {
        const { jobId } = await MarketplaceAPI.enqueueInstall(slug);
        if (cancelled) return;
        setProgress(15); setStep("Downloading plugin…");

        let attempts = 0;
        while (!cancelled && attempts++ < 60) {
          await new Promise(r => setTimeout(r, 1500));
          const job = await MarketplaceAPI.getJobStatus(jobId);
          if (cancelled) return;
          setProgress(Math.min(15 + (attempts / 60) * 75, 90));
          if (job.step) setStep(job.step);
          if (job.status === "completed") {
            setProgress(100); setStep("Installation complete!"); setStatus("completed");
            toast({ title: "Plugin installed", description: `${pluginName} is ready.` });
            return;
          }
          if (job.status === "failed") throw new Error(job.error || "Installation failed");
        }
        throw new Error("Installation timed out");
      } catch (err) {
        if (!cancelled) { setStatus("failed"); setError(err.message); }
      }
    })();

    return () => { cancelled = true; };
  }, [open, slug]);

  return (
    <Dialog open={open} onOpenChange={v => !v && status !== "running" && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === "completed" ? "Installed!" : status === "failed" ? "Failed" : `Installing ${pluginName}`}
          </DialogTitle>
          <DialogDescription>{status === "failed" ? error : step}</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-2">
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

// ── Screenshots carousel (simple) ────────────────────────────────────────────

function Screenshots({ images }) {
  const [current, setCurrent] = useState(0);
  if (!images?.length) return null;
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border bg-muted aspect-video flex items-center justify-center relative">
        <Image src={images[current]} alt={`Screenshot ${current + 1}`} fill className="object-contain" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 justify-center">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-foreground" : "w-1.5 bg-muted-foreground/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function PluginDetailPage({ params }) {
  const { slug } = use(params);
  const [plugin, setPlugin]       = useState(null);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [installing, setInstalling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    async function loadPlugin() {
      setLoading(true);
      try {
        const [p, s] = await Promise.all([
          MarketplaceAPI.getPluginBySlug(slug),
          MarketplaceAPI.getPluginStats(slug).catch(() => ({})),
        ]);
        if (!active) return;
        setPlugin(p);
        setStats(s);
      } catch (err) {
        if (!active) return;
        toast({ variant: "destructive", title: "Not found", description: err.message });
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPlugin();
    return () => { active = false; };
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-52 w-full rounded-lg" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="font-medium text-muted-foreground">Plugin not found</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/admin/plugins">Back to Marketplace</Link>
        </Button>
      </div>
    );
  }

  const isFree = plugin.pricingType === "free" || !plugin.price;
  const price  = isFree ? "Free" : `$${(plugin.price / 100).toFixed(2)}${plugin.pricingType === "subscription" ? `/${plugin.interval ?? "mo"}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/plugins" className="hover:text-foreground flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />Marketplace
        </Link>
        <span>/</span>
        <span className="text-foreground">{plugin.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <Card className="overflow-hidden">
            <div className="h-48 bg-muted flex items-center justify-center relative">
              {plugin.iconUrl ? (
                <Image src={plugin.iconUrl} alt={plugin.name} width={96} height={96} className="object-contain" />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{plugin.name?.[0] ?? "P"}</span>
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-1.5">
                {plugin.featured && <Badge className="gap-1 text-xs"><Sparkles className="h-3 w-3" />Featured</Badge>}
                {plugin.verified && <Badge variant="outline" className="gap-1 text-xs bg-background"><BadgeCheck className="h-3 w-3 text-blue-500" />Verified</Badge>}
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{plugin.name}</h1>
                <p className="text-muted-foreground mt-1">{sanitizeText(plugin.description)}</p>
              </div>

              {plugin.capabilities?.length > 0 && (
                <CapabilityBadges capabilities={plugin.capabilities} size="sm" />
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><StarRating rating={plugin.rating || 0} showValue /></div>
                <span className="flex items-center gap-1"><Download className="h-4 w-4" />{formatNumber(stats?.install_count || 0)} installs</span>
                {plugin.version && <span className="flex items-center gap-1"><Tag className="h-4 w-4" />v{plugin.version}</span>}
              </div>
            </CardContent>
          </Card>

          {/* Screenshots */}
          {plugin.screenshots?.length > 0 && (
            <Screenshots images={plugin.screenshots} />
          )}

          {/* Changelog */}
          {plugin.changelog && (
            <Card>
              <CardHeader><CardTitle className="text-base">Changelog</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sanitizeText(plugin.changelog)}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — sidebar info + install */}
        <div className="space-y-4">
          {/* Install card */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{price}</p>
                {plugin.pricingType === "subscription" && (
                  <p className="text-xs text-muted-foreground mt-0.5">billed {plugin.interval ?? "monthly"}</p>
                )}
              </div>

              <Separator />

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => setInstalling(true)}
              >
                {isFree ? <><Download className="h-4 w-4" />Install Free</> : <><ShoppingCart className="h-4 w-4" />Purchase & Install</>}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Plugin will be installed to your server instance.
              </p>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Plugin Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "Version",  value: plugin.version || "N/A" },
                { label: "Category", value: plugin.category || "General" },
                { label: "Pricing",  value: plugin.pricingType === "free" ? "Free" : plugin.pricingType === "subscription" ? "Subscription" : "One-time" },
                { label: "Status",   value: plugin.status },
                { label: "Updated",  value: formatDate(plugin.updatedAt, "short") },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground truncate text-right capitalize">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Stats */}
          {stats && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Statistics</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "Total installs",  value: formatNumber(stats.install_count || 0) },
                  { label: "Active installs", value: formatNumber(stats.active_install_count || 0) },
                  { label: "Reviews",         value: formatNumber(stats.review_count || 0) },
                  { label: "Avg. rating",     value: (stats.average_rating || 0).toFixed(1) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <InstallDialog
        open={installing}
        slug={slug}
        pluginName={plugin.name}
        onClose={() => setInstalling(false)}
      />
    </div>
  );
}

export default function Page(props) {
  return (
    <ErrorBoundary>
      <PluginDetailPage {...props} />
    </ErrorBoundary>
  );
}
