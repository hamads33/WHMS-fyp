"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Puzzle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import MarketplaceAPI from "@/lib/api/marketplace";

const CATEGORIES = ["Billing", "Provisioning", "Communication", "Analytics", "Security", "Automation", "Integration", "Other"];
const CAPABILITIES = ["hooks", "api", "cron", "billing", "provisioning", "ui"];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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

export default function NewPluginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    author: "",
    description: "",
    category: "",
    pricingType: "free",
    price: "",
    currency: "USD",
    interval: "month",
    capabilities: "",
    permissions: "",
    adminPages: "",
    dependencies: "",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugEdited) next.slug = slugify(value);
      return next;
    });
  };

  const handleSlugChange = (e) => {
    setSlugEdited(true);
    update("slug", slugify(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.slug.trim()) {
      setError("Name and slug are required.");
      return;
    }

    if (form.pricingType !== "free" && !form.price) {
      setError("Price is required for paid plugins.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const capabilities = parseCsv(form.capabilities).filter((cap) => CAPABILITIES.includes(cap));
      const permissions = parseCsv(form.permissions);
      const adminPages = parseAdminPages(form.adminPages);
      const pluginDependencies = parseDependencies(form.dependencies);

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        author: form.author.trim() || null,
        description: form.description.trim(),
        category: form.category || null,
        pricingType: form.pricingType,
        price: form.pricingType === "free" ? 0 : parseFloat(form.price) * 100,
        currency: form.currency,
        interval: form.pricingType === "subscription" ? form.interval : null,
        visibility: "public",
        capabilities,
        permissions,
        ui: adminPages.length ? { adminPages } : null,
        pluginDependencies: Object.keys(pluginDependencies).length ? pluginDependencies : null,
      };

      const res = await MarketplaceAPI.createPlugin(payload);
      if (!res?.success) throw new Error(res?.message || "Failed to create plugin");

      toast({ title: "Plugin created", description: "Your draft now includes plugin-system metadata." });
      router.push(`/developer/plugins/${res.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/developer/plugins" className="hover:text-foreground flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />My Plugins
        </Link>
        <span>/</span>
        <span className="text-foreground">New Plugin</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Create New Plugin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start with a draft and define the same metadata your runtime plugin module uses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Plugin Name</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author / Publisher</Label>
                <Input id="author" value={form.author} onChange={(e) => update("author", e.target.value)} placeholder="Your studio or team name" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">plugin/</span>
                <Input id="slug" value={form.slug} onChange={handleSlugChange} required className="font-mono text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(value) => update("category", value)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Plugin-System Metadata</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="capabilities">Capabilities</Label>
              <Input
                id="capabilities"
                value={form.capabilities}
                onChange={(e) => update("capabilities", e.target.value)}
                placeholder="hooks, api, ui"
              />
              <p className="text-xs text-muted-foreground">Supported: {CAPABILITIES.join(", ")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="permissions">Permissions</Label>
              <Input
                id="permissions"
                value={form.permissions}
                onChange={(e) => update("permissions", e.target.value)}
                placeholder="tenants.read, billing.write"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPages">Admin UI Pages</Label>
              <Textarea
                id="adminPages"
                rows={4}
                value={form.adminPages}
                onChange={(e) => update("adminPages", e.target.value)}
                placeholder={"settings|Settings|layout-dashboard\nreports|Reports|bar-chart-3"}
              />
              <p className="text-xs text-muted-foreground">One page per line: `id|label|icon`</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dependencies">Plugin Dependencies</Label>
              <Textarea
                id="dependencies"
                rows={3}
                value={form.dependencies}
                onChange={(e) => update("dependencies", e.target.value)}
                placeholder={"billing-core:^1.0.0\nanalytics-kit:^2.3.0"}
              />
              <p className="text-xs text-muted-foreground">One dependency per line: `plugin-name:semver-range`</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pricing Type</Label>
              <Select value={form.pricingType} onValueChange={(value) => update("pricingType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="one-time">One-time Purchase</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.pricingType !== "free" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input id="price" type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} />
                </div>
                {form.pricingType === "subscription" && (
                  <div className="space-y-2">
                    <Label>Billing Interval</Label>
                    <Select value={form.interval} onValueChange={(value) => update("interval", value)}>
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
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You can refine metadata later, then upload the ZIP and submit a version for review.
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/developer/plugins">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Puzzle className="h-4 w-4" />}
            Create Plugin Draft
          </Button>
        </div>
      </form>
    </div>
  );
}
