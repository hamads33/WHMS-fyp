"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import { ChevronLeft, Loader2 } from "lucide-react"
import { AdminServicesAPI } from "@/lib/api/services"
import { toast } from "sonner"

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_TYPES = [
  { value: "hosting", label: "Web Hosting" },
  { value: "domain", label: "Domain Registration" },
  { value: "ssl", label: "SSL Certificate" },
  { value: "vps", label: "VPS Server" },
  { value: "dedicated", label: "Dedicated Server" },
  { value: "custom", label: "Custom / Other" },
]

const PAYMENT_TYPES = [
  { value: "regular", label: "Recurring (subscription)" },
  { value: "onetime", label: "One-time payment" },
  { value: "free", label: "Free" },
]

const CUSTOMIZE_OPTIONS = [
  { value: "none", label: "None — fixed configuration" },
  { value: "addon_only", label: "Add-ons only" },
  { value: "full", label: "Fully customizable" },
]

// ─── Helper components ────────────────────────────────────────────────────────

function Field({ label, hint, required, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function FlagToggle({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/20">
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-none">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={!!checked} onCheckedChange={onChange} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewServicePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [groups, setGroups] = useState([])

  const [form, setForm] = useState({
    code: "",
    name: "",
    tagline: "",
    description: "",
    shortDescription: "",
    groupId: "",
    moduleType: "",
    moduleName: "",
    serverGroup: "",
    welcomeEmailTemplate: "",
    color: "",
    paymentType: "regular",
    customizeOption: "none",
    taxable: true,
    requiresDomain: false,
    allowAutoRenew: true,
    autoSetup: true,
    autoSuspend: true,
    featured: false,
  })

  useEffect(() => {
    AdminServicesAPI.listGroups()
      .then((res) => setGroups(Array.isArray(res) ? res : []))
      .catch(() => {})
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Auto-generate code from name
  const handleNameChange = (v) => {
    set("name", v)
    if (!form.code || form.code === slugify(form.name)) {
      set("code", slugify(v))
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return }
    if (!form.description.trim()) { toast.error("Description is required"); return }
    if (!form.code.trim()) { toast.error("Product code is required"); return }

    setSaving(true)
    try {
      const payload = { ...form }
      // Strip empty optional strings
      ;["groupId", "moduleType", "moduleName", "serverGroup", "welcomeEmailTemplate",
        "color", "tagline", "shortDescription"].forEach((k) => {
        if (!payload[k]) delete payload[k]
      })

      const created = await AdminServicesAPI.createService(payload)
      toast.success("Product created successfully")

      // Navigate to the detail/edit page for the new service
      const id = created?.id ?? created?.service?.id
      if (id) {
        router.push(`/admin/services/${id}`)
      } else {
        router.push("/admin/services")
      }
    } catch (err) {
      toast.error(err?.message || "Failed to create product")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl pb-16">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/services" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> Products &amp; Services
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Add New Product</span>
      </div>

      {/* Page header + top save bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add New Product</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your new product. You can add plans and pricing after saving.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href="/admin/services">Cancel</Link>
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save & Continue"}
          </Button>
        </div>
      </div>

      {/* Tabbed form */}
      <Tabs defaultValue="details">
        <TabsList className="grid grid-cols-4 max-w-md">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="module">Module</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>

        {/* ── Details ── */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Product Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Basic information displayed to clients in the store.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Product Name" required>
                    <Input
                      placeholder="e.g., Shared Hosting"
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      maxLength={255}
                    />
                  </Field>
                </div>

                <Field label="Product Code" hint="Unique identifier, no spaces" required>
                  <Input
                    placeholder="e.g., shared_hosting"
                    value={form.code}
                    onChange={(e) => set("code", slugify(e.target.value))}
                    maxLength={50}
                    className="font-mono"
                  />
                </Field>

                <Field label="Product Group">
                  <Select
                    value={form.groupId || "__none"}
                    onValueChange={(v) => set("groupId", v === "__none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No group</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="col-span-2">
                  <Field label="Tagline" hint="Short phrase shown in store listings">
                    <Input
                      placeholder="e.g., Fast & reliable web hosting"
                      value={form.tagline}
                      onChange={(e) => set("tagline", e.target.value)}
                      maxLength={255}
                    />
                  </Field>
                </div>

                <div className="col-span-2">
                  <Field label="Description" hint={`${form.description.length}/1000`} required>
                    <Textarea
                      placeholder="Describe this product for clients…"
                      rows={4}
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      maxLength={1000}
                    />
                  </Field>
                </div>

                <div className="col-span-2">
                  <Field label="Short Description" hint="One-liner for compact views">
                    <Input
                      placeholder="Brief summary…"
                      value={form.shortDescription}
                      onChange={(e) => set("shortDescription", e.target.value)}
                      maxLength={255}
                    />
                  </Field>
                </div>

                <Field label="Accent Color" hint="Used in store display">
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={form.color || "#3b82f6"}
                      onChange={(e) => set("color", e.target.value)}
                      className="h-9 w-10 rounded border cursor-pointer p-1 shrink-0"
                    />
                    <Input
                      value={form.color}
                      onChange={(e) => set("color", e.target.value)}
                      placeholder="#3b82f6"
                      maxLength={7}
                      className="font-mono"
                    />
                  </div>
                </Field>

                <Field label="Featured">
                  <div className="flex items-center gap-2 mt-1.5">
                    <Switch
                      checked={form.featured}
                      onCheckedChange={(v) => set("featured", v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      Highlight in store
                    </span>
                  </div>
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Module ── */}
        <TabsContent value="module" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Module Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect this product to a provisioning module for automated setup.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm text-blue-800">
                  Module settings are optional. You can configure provisioning after creating the product.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Product Type">
                    <Select
                      value={form.moduleType || "__none"}
                      onValueChange={(v) => set("moduleType", v === "__none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {MODULE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Module Name" hint="e.g., cpanel, plesk">
                  <Input
                    placeholder="Module identifier"
                    value={form.moduleName}
                    onChange={(e) => set("moduleName", e.target.value)}
                  />
                </Field>

                <Field label="Server Group" hint="Provisioning server pool">
                  <Input
                    placeholder="e.g., US-East"
                    value={form.serverGroup}
                    onChange={(e) => set("serverGroup", e.target.value)}
                  />
                </Field>

                <div className="col-span-2">
                  <Field label="Welcome Email Template" hint="Sent after provisioning">
                    <Input
                      placeholder="Template name or ID"
                      value={form.welcomeEmailTemplate}
                      onChange={(e) => set("welcomeEmailTemplate", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pricing ── */}
        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pricing &amp; Billing</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set the billing model. Individual plan prices are configured on the product detail page.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Payment Type">
                    <Select value={form.paymentType} onValueChange={(v) => set("paymentType", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="col-span-2">
                  <Field label="Customization">
                    <Select value={form.customizeOption} onValueChange={(v) => set("customizeOption", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMIZE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <FlagToggle
                  label="Apply Tax"
                  hint="Include applicable taxes on invoices for this product"
                  checked={form.taxable}
                  onChange={(v) => set("taxable", v)}
                />
                <FlagToggle
                  label="Allow Auto-Renew"
                  hint="Clients can enable automatic renewal for orders"
                  checked={form.allowAutoRenew}
                  onChange={(v) => set("allowAutoRenew", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Options ── */}
        <TabsContent value="options" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Provisioning Options</CardTitle>
              <p className="text-sm text-muted-foreground">
                Control automated provisioning behaviour for orders.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <FlagToggle
                label="Require Domain"
                hint="Client must provide or register a domain when ordering"
                checked={form.requiresDomain}
                onChange={(v) => set("requiresDomain", v)}
              />
              <FlagToggle
                label="Auto-Setup"
                hint="Automatically provision the service when an order is placed"
                checked={form.autoSetup}
                onChange={(v) => set("autoSetup", v)}
              />
              <FlagToggle
                label="Auto-Suspend"
                hint="Automatically suspend when payment is overdue"
                checked={form.autoSuspend}
                onChange={(v) => set("autoSuspend", v)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom save bar */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" asChild>
          <Link href="/admin/services">Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save & Continue"}
        </Button>
      </div>
    </div>
  )
}

// ─── Tiny util ────────────────────────────────────────────────────────────────

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50)
}
