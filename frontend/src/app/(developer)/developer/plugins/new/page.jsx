"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Puzzle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import MarketplaceAPI from "@/lib/api/marketplace";

const CATEGORIES = ["Billing", "Provisioning", "Communication", "Analytics", "Security", "Automation", "Integration", "Other"];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function NewPluginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", slug: "", description: "",
    category: "", pricingType: "free", price: "", currency: "USD", interval: "month",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-generate slug from name unless user has manually edited it
      if (key === "name" && !slugEdited) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSlugChange = e => {
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
      const payload = {
        name:       form.name.trim(),
        slug:       form.slug.trim(),
        description: form.description.trim(),
        category:   form.category || null,
        pricingType: form.pricingType,
        price:      form.pricingType === "free" ? 0 : parseFloat(form.price) * 100,
        currency:   form.currency,
        interval:   form.pricingType === "subscription" ? form.interval : null,
        visibility: "public",
      };

      const res = await MarketplaceAPI.createPlugin(payload);
      if (!res?.success) throw new Error(res?.message || "Failed to create plugin");

      toast({ title: "Plugin created!", description: "Your plugin draft has been created." });
      router.push(`/developer/plugins/${res.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
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
          Start with a draft. You can upload your plugin ZIP after creating the entry.
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
            <div className="space-y-2">
              <Label htmlFor="name">Plugin Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="My Awesome Plugin"
                value={form.name}
                onChange={e => update("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground ml-2">(unique identifier, e.g. my-awesome-plugin)</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">plugin/</span>
                <Input
                  id="slug"
                  placeholder="my-awesome-plugin"
                  value={form.slug}
                  onChange={handleSlugChange}
                  required
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what your plugin does…"
                value={form.description}
                onChange={e => update("description", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={v => update("category", v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pricing Type</Label>
              <Select value={form.pricingType} onValueChange={v => update("pricingType", v)}>
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
                  <Label htmlFor="price">Price (USD) <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="9.99"
                      value={form.price}
                      onChange={e => update("price", e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                {form.pricingType === "subscription" && (
                  <div className="space-y-2">
                    <Label>Billing Interval</Label>
                    <Select value={form.interval} onValueChange={v => update("interval", v)}>
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
            After creating the plugin, you'll be able to upload the ZIP file and submit it for review.
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
