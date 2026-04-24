"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Upload, RefreshCw, AlertCircle, CheckCircle2,
  Send, Loader2, Info, ExternalLink, DollarSign, LayoutDashboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CapabilityBadges } from "@/components/plugins/PluginCapabilityBadges";
import MarketplaceAPI from "@/lib/api/marketplace";
import { formatDate, formatNumber } from "@/lib/utils";

const CAPABILITIES = ["hooks", "api", "cron", "billing", "provisioning", "ui"];

function parseCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseAdminPages(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, label, icon] = line.split("|").map((part) => part?.trim());
      return { id, label, ...(icon ? { icon } : {}) };
    })
    .filter((page) => page.id && page.label);
}

function parseDependencies(value) {
  return Object.fromEntries(
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, range] = line.split(/[:=]/).map((part) => part?.trim());
        return [name, range];
      })
      .filter(([name, range]) => name && range)
  );
}

function formatAdminPages(ui) {
  return (ui?.adminPages ?? [])
    .map((page) => [page.id, page.label, page.icon].filter(Boolean).join("|"))
    .join("\n");
}

function formatDependencies(pluginDependencies) {
  return Object.entries(pluginDependencies ?? {})
    .map(([name, range]) => `${name}:${range}`)
    .join("\n");
}

function StatusBadge({ status }) {
  const map = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
    submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" },
    under_review: { label: "Under Review", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" },
    approved: { label: "Approved", cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" },
    rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400" },
  };
  const meta = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-xs ${meta.cls}`}>{meta.label}</Badge>;
}

function UploadZipPanel({ pluginId, onDone }) {
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const { toast } = useToast();

  const submit = async () => {
    if (!file || !version.trim()) {
      toast({ variant: "destructive", title: "File and version required" });
      return;
    }

    setUploading(true);
    try {
      await MarketplaceAPI.uploadPluginZip(pluginId, file, version, changelog);
      toast({ title: "Version uploaded", description: "Your plugin version has been submitted for review." });
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Plugin ZIP</CardTitle>
        <CardDescription>Submit a version package for review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Plugin ZIP File</Label>
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <p className="text-sm text-foreground font-medium">{file.name}</p>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to select a .zip file</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Version</Label>
          <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className="font-mono" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="changelog">Changelog</Label>
          <Textarea id="changelog" rows={3} value={changelog} onChange={(e) => setChangelog(e.target.value)} />
        </div>

        <Button onClick={submit} disabled={uploading || !file || !version.trim()} className="gap-2">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Upload & Submit
        </Button>
      </CardContent>
    </Card>
  );
}

function PricingPanel({ plugin, onDone }) {
  const [pricingType, setPricingType] = useState(plugin?.pricingType ?? "free");
  const [price, setPrice] = useState(plugin?.price ? (plugin.price / 100).toFixed(2) : "");
  const [interval, setInterval] = useState(plugin?.interval ?? "month");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      await MarketplaceAPI.updatePluginPricing(plugin.id, {
        pricingType,
        price: pricingType === "free" ? 0 : parseFloat(price) * 100,
        interval: pricingType === "subscription" ? interval : null,
      });
      toast({ title: "Pricing updated" });
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update pricing", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pricing</CardTitle>
        <CardDescription>Set how your plugin is sold in the marketplace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Pricing Type</Label>
          <Select value={pricingType} onValueChange={setPricingType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="one-time">One-time Purchase</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {pricingType !== "free" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            {pricingType === "subscription" && (
              <div className="space-y-2">
                <Label>Interval</Label>
                <Select value={interval} onValueChange={setInterval}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
          Save Pricing
        </Button>
      </CardContent>
    </Card>
  );
}

function MetadataPanel({ plugin, onDone }) {
  const [form, setForm] = useState({
    name: plugin?.name ?? "",
    slug: plugin?.slug ?? "",
    author: plugin?.author ?? "",
    description: plugin?.description ?? "",
    category: plugin?.category ?? "",
    capabilities: (plugin?.capabilities ?? []).join(", "),
    permissions: (plugin?.permissions ?? []).join(", "),
    adminPages: formatAdminPages(plugin?.ui),
    dependencies: formatDependencies(plugin?.pluginDependencies),
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setForm({
      name: plugin?.name ?? "",
      slug: plugin?.slug ?? "",
      author: plugin?.author ?? "",
      description: plugin?.description ?? "",
      category: plugin?.category ?? "",
      capabilities: (plugin?.capabilities ?? []).join(", "),
      permissions: (plugin?.permissions ?? []).join(", "),
      adminPages: formatAdminPages(plugin?.ui),
      dependencies: formatDependencies(plugin?.pluginDependencies),
    });
  }, [plugin]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await MarketplaceAPI.updateDeveloperPlugin(plugin.id, {
        name: form.name.trim(),
        slug: form.slug.trim(),
        author: form.author.trim() || null,
        description: form.description.trim(),
        category: form.category.trim() || null,
        capabilities: parseCsv(form.capabilities).filter((cap) => CAPABILITIES.includes(cap)),
        permissions: parseCsv(form.permissions),
        ui: parseAdminPages(form.adminPages).length ? { adminPages: parseAdminPages(form.adminPages) } : null,
        pluginDependencies: Object.keys(parseDependencies(form.dependencies)).length ? parseDependencies(form.dependencies) : null,
      });
      toast({ title: "Metadata updated" });
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update plugin", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metadata</CardTitle>
        <CardDescription>Keep marketplace metadata aligned with your runtime plugin module.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Author</Label>
            <Input value={form.author} onChange={(e) => update("author", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} className="font-mono" />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Input value={form.category} onChange={(e) => update("category", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Capabilities</Label>
          <Input value={form.capabilities} onChange={(e) => update("capabilities", e.target.value)} placeholder="hooks, api, ui" />
        </div>

        <div className="space-y-2">
          <Label>Permissions</Label>
          <Input value={form.permissions} onChange={(e) => update("permissions", e.target.value)} placeholder="tenants.read, billing.write" />
        </div>

        <div className="space-y-2">
          <Label>Admin UI Pages</Label>
          <Textarea rows={4} value={form.adminPages} onChange={(e) => update("adminPages", e.target.value)} placeholder={"settings|Settings|layout-dashboard"} />
        </div>

        <div className="space-y-2">
          <Label>Plugin Dependencies</Label>
          <Textarea rows={3} value={form.dependencies} onChange={(e) => update("dependencies", e.target.value)} placeholder={"billing-core:^1.0.0"} />
        </div>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />}
          Save Metadata
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DeveloperPluginDetailPage({ params }) {
  const { id } = use(params);
  const [plugin, setPlugin] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const found = await MarketplaceAPI.getDeveloperPlugin(id);
      if (!found) throw new Error("Plugin not found");
      setPlugin(found);
    } catch (err) {
      toast({ variant: "destructive", title: "Not found", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Plugin not found</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/developer/plugins">Back</Link>
        </Button>
      </div>
    );
  }

  const isEditable = plugin.status === "draft" || plugin.status === "rejected";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/developer/plugins" className="hover:text-foreground flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />My Plugins
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{plugin.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 rounded-xl border bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
            {plugin.iconUrl ? <Image src={plugin.iconUrl} alt={plugin.name} width={48} height={48} className="object-contain rounded-lg" /> : plugin.name?.[0] ?? "P"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-foreground">{plugin.name}</h1>
              <StatusBadge status={plugin.status} />
              {plugin.capabilities?.length > 0 && <CapabilityBadges capabilities={plugin.capabilities} size="xs" max={4} />}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{plugin.slug}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 shrink-0">
          <RefreshCw className="h-4 w-4" />Refresh
        </Button>
      </div>

      {plugin.status === "rejected" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This plugin was rejected. Update the metadata or ZIP, then resubmit a version.
          </AlertDescription>
        </Alert>
      )}

      {plugin.status === "submitted" || plugin.status === "under_review" ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your plugin is currently <strong>{plugin.status === "under_review" ? "under review" : "submitted"}</strong>.
          </AlertDescription>
        </Alert>
      ) : plugin.status === "approved" ? (
        <Alert className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            This plugin is live on the marketplace.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="metadata">
            <TabsList>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="version">Upload Version</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="metadata" className="mt-4">
              {isEditable ? (
                <MetadataPanel plugin={plugin} onDone={load} />
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Metadata can only be edited while the plugin is in draft or rejected state.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="version" className="mt-4">
              {isEditable || plugin.status === "approved" ? (
                <UploadZipPanel pluginId={plugin.id} onDone={load} />
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>You can&apos;t upload a new version while the plugin is {plugin.status}.</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="pricing" className="mt-4">
              <PricingPanel plugin={plugin} onDone={load} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Plugin Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "Status", value: <StatusBadge status={plugin.status} /> },
                { label: "Version", value: plugin.version || "—" },
                { label: "Runtime", value: plugin.runtimeState || "not_installed" },
                { label: "Author", value: plugin.author || "—" },
                { label: "Category", value: plugin.category || "—" },
                { label: "Pricing", value: plugin.pricingType === "free" ? "Free" : `$${(plugin.price / 100).toFixed(2)}` },
                { label: "Sales", value: formatNumber(plugin.salesCount || 0) },
                { label: "Created", value: formatDate(plugin.createdAt, "short") },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground text-right">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Runtime Contract</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {plugin.capabilities?.length > 0 ? (
                <CapabilityBadges capabilities={plugin.capabilities} size="sm" />
              ) : (
                <p className="text-sm text-muted-foreground">No capabilities defined yet.</p>
              )}

              {(plugin.ui?.adminPages ?? []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Admin Pages</p>
                  {(plugin.ui?.adminPages ?? []).map((page) => (
                    <div key={page.id} className="text-xs text-muted-foreground font-mono">
                      {page.id} - {page.label}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <Link href={`/developer/analytics?plugin=${plugin.id}`}>
                  <ExternalLink className="h-4 w-4" />View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
