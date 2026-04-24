"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronLeft, ChevronUp, ChevronDown, RefreshCcw, MoreHorizontal,
  Pencil, Trash2, Plus, Eye, EyeOff, Power, PowerOff,
  Zap, Mail, Webhook, Settings, Package, Layers, Tag,
  PuzzleIcon, ClipboardList, ToggleLeft, BarChart3,
  Download, Upload, Search, ArrowUpDown, ShoppingCart, FormInput,
  Check, X,
} from "lucide-react"
import {
  AdminServicesAPI, normalizeFeaturesMatrix, normalizePlanFeatures,
} from "@/lib/api/services"
import { toast } from "sonner"

// ─── Constants ───────────────────────────────────────────────────────────────

const BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annually", label: "Semi-Annually" },
  { value: "annually", label: "Annually" },
  { value: "biennially", label: "Biennially" },
  { value: "triennially", label: "Triennially" },
]
const PAYMENT_TYPES = [
  { value: "regular", label: "Recurring" },
  { value: "onetime", label: "One-time" },
  { value: "free", label: "Free" },
]
const CUSTOMIZE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "addon_only", label: "Add-ons only" },
  { value: "full", label: "Fully customizable" },
]
const MODULE_TYPES = ["hosting", "domain", "ssl", "vps", "dedicated", "custom"]
const FEATURE_TYPES = ["text", "boolean", "number", "limit"]
const DISCOUNT_TYPES = [
  { value: "none", label: "None" },
  { value: "percent", label: "Percent (%)" },
  { value: "fixed", label: "Fixed amount" },
]
const CUSTOM_FIELD_TYPES = [
  { value: "text", label: "Text Box" },
  { value: "textarea", label: "Text Area" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio Buttons" },
  { value: "password", label: "Password" },
  { value: "hidden", label: "Hidden" },
]
const MULTIPLE_QUANTITIES_OPTIONS = [
  { value: "no", label: "No — one service per order" },
  { value: "multiple", label: "Yes — multiple service instances" },
  { value: "scaling", label: "Yes — scaling (quantity per instance)" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap(res, key) {
  return res?.[key] ?? (Array.isArray(res) ? res : [])
}

function statusBadge(active, hidden) {
  if (!active) return <Badge variant="secondary">Inactive</Badge>
  if (hidden) return <Badge variant="outline">Hidden</Badge>
  return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ServiceDetailPage() {
  const { id } = useParams()
  const [service, setService] = useState(null)
  const [groups, setGroups] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadService = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, gRes, stRes] = await Promise.all([
        AdminServicesAPI.getService(id),
        AdminServicesAPI.listGroups(),
        AdminServicesAPI.getServiceStats(id).catch(() => null),
      ])
      setService(sRes?.service ?? sRes)
      setGroups(unwrap(gRes, "groups"))
      setStats(stRes)
    } catch {
      toast.error("Failed to load service")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadService() }, [loadService])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <Package className="h-12 w-12 opacity-30" />
        <p>Service not found</p>
        <Button variant="outline" asChild><Link href="/admin/services">Back to Services</Link></Button>
      </div>
    )
  }

  const groupName = groups.find((g) => g.id === service.groupId)?.name ?? "—"

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/services"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ChevronLeft className="h-4 w-4" /> Services
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{service.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{service.code}</code>
            {statusBadge(service.active, service.hidden)}
            {service.moduleType && (
              <Badge variant="outline" className="capitalize">{service.moduleType}</Badge>
            )}
            <span className="text-sm text-muted-foreground">{groupName}</span>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={loadService}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Plans", value: stats?.planCount ?? service.plans?.length ?? "—" },
          { label: "Active Orders", value: stats?.activeOrderCount ?? "—" },
          { label: "Total Orders", value: stats?.totalOrderCount ?? "—" },
          { label: "Revenue", value: stats?.totalRevenue ? `$${Number(stats.totalRevenue).toFixed(2)}` : "—" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold mt-0.5">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><Settings className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="plans"><Layers className="h-4 w-4 mr-1.5" />Plans</TabsTrigger>
          <TabsTrigger value="features"><Tag className="h-4 w-4 mr-1.5" />Features</TabsTrigger>
          <TabsTrigger value="addons"><PuzzleIcon className="h-4 w-4 mr-1.5" />Add-ons</TabsTrigger>
          <TabsTrigger value="customfields"><FormInput className="h-4 w-4 mr-1.5" />Custom Fields</TabsTrigger>
          <TabsTrigger value="upgrades"><ArrowUpDown className="h-4 w-4 mr-1.5" />Upgrades</TabsTrigger>
          <TabsTrigger value="crosssells"><ShoppingCart className="h-4 w-4 mr-1.5" />Cross-sells</TabsTrigger>
          <TabsTrigger value="automations"><Zap className="h-4 w-4 mr-1.5" />Automations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab service={service} groups={groups} onRefresh={loadService} />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <PlansTab serviceId={id} />
        </TabsContent>
        <TabsContent value="features" className="mt-4">
          <FeaturesTab serviceId={id} />
        </TabsContent>
        <TabsContent value="addons" className="mt-4">
          <AddonsTab serviceId={id} />
        </TabsContent>
        <TabsContent value="customfields" className="mt-4">
          <CustomFieldsTab serviceId={id} />
        </TabsContent>
        <TabsContent value="upgrades" className="mt-4">
          <UpgradesTab serviceId={id} />
        </TabsContent>
        <TabsContent value="crosssells" className="mt-4">
          <CrossSellsTab serviceId={id} />
        </TabsContent>
        <TabsContent value="automations" className="mt-4">
          <AutomationsTab serviceId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ service, groups, onRefresh }) {
  const [editOpen, setEditOpen] = useState(false)

  const rows = [
    { label: "Code", value: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{service.code}</code> },
    { label: "Name", value: service.name },
    { label: "Tagline", value: service.tagline ?? "—" },
    { label: "Description", value: service.description ?? "—" },
    { label: "Short Description", value: service.shortDescription ?? "—" },
    { label: "Group", value: groups.find((g) => g.id === service.groupId)?.name ?? "None" },
    { label: "Module Type", value: service.moduleType ? <span className="capitalize">{service.moduleType}</span> : "—" },
    { label: "Module Name", value: service.moduleName ?? "—" },
    { label: "Server Group", value: service.serverGroup ?? "—" },
    { label: "Payment Type", value: PAYMENT_TYPES.find((p) => p.value === service.paymentType)?.label ?? service.paymentType },
    { label: "Customization", value: CUSTOMIZE_OPTIONS.find((o) => o.value === service.customizeOption)?.label ?? service.customizeOption },
    { label: "Multiple Quantities", value: MULTIPLE_QUANTITIES_OPTIONS.find((o) => o.value === service.multipleQuantities)?.label ?? service.multipleQuantities ?? "No" },
    { label: "Welcome Email", value: service.welcomeEmailTemplate ?? "System Default" },
    { label: "Product Color", value: service.color ? (
      <div className="flex items-center gap-2">
        <div className="h-4 w-8 rounded border" style={{ backgroundColor: service.color }} />
        <span className="text-xs font-mono">{service.color}</span>
      </div>
    ) : "—" },
  ]

  const billingRows = [
    { label: "Recurring Cycles Limit", value: service.recurringCyclesLimit ? `${service.recurringCyclesLimit} cycles` : "Unlimited" },
    { label: "Auto-Terminate After", value: service.autoTerminateDays ? `${service.autoTerminateDays} days` : "Disabled" },
    { label: "Prorata Billing", value: service.prorataBilling ? "Enabled" : "Disabled" },
    { label: "Prorata Date", value: service.prorataDate ? `Day ${service.prorataDate}` : "—" },
  ]

  const flags = [
    { key: "active", label: "Active" },
    { key: "hidden", label: "Hidden" },
    { key: "featured", label: "Featured" },
    { key: "retired", label: "Retired" },
    { key: "taxable", label: "Taxable" },
    { key: "requiresDomain", label: "Requires Domain" },
    { key: "allowAutoRenew", label: "Auto-renew" },
    { key: "autoSetup", label: "Auto-setup" },
    { key: "autoSuspend", label: "Auto-suspend" },
    { key: "onDemandRenewals", label: "On-Demand Renewals" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Service Details</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              {rows.map(({ label, value }) => (
                <div key={label} className="py-2.5 flex gap-4">
                  <dt className="w-44 shrink-0 text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-sm flex-1">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status &amp; Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {flags.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{label}</span>
                    {service[key]
                      ? <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Yes</Badge>
                      : <Badge variant="secondary" className="text-xs">No</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Billing Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {billingRows.map(({ label, value }) => (
                  <div key={label} className="py-1.5 flex justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ServiceEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        service={service}
        groups={groups}
        onSaved={() => { setEditOpen(false); onRefresh() }}
      />
    </div>
  )
}

function ServiceEditDialog({ open, onOpenChange, service, groups, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && service) {
      setForm({
        name: service.name ?? "",
        tagline: service.tagline ?? "",
        description: service.description ?? "",
        shortDescription: service.shortDescription ?? "",
        groupId: service.groupId ?? "",
        moduleType: service.moduleType ?? "",
        moduleName: service.moduleName ?? "",
        serverGroup: service.serverGroup ?? "",
        paymentType: service.paymentType ?? "regular",
        customizeOption: service.customizeOption ?? "none",
        multipleQuantities: service.multipleQuantities ?? "no",
        welcomeEmailTemplate: service.welcomeEmailTemplate ?? "",
        color: service.color ?? "",
        taxable: service.taxable ?? true,
        active: service.active ?? true,
        hidden: service.hidden ?? false,
        featured: service.featured ?? false,
        retired: service.retired ?? false,
        requiresDomain: service.requiresDomain ?? false,
        allowAutoRenew: service.allowAutoRenew ?? true,
        autoSetup: service.autoSetup ?? true,
        autoSuspend: service.autoSuspend ?? true,
        onDemandRenewals: service.onDemandRenewals ?? true,
        prorataBilling: service.prorataBilling ?? false,
        prorataDate: service.prorataDate ?? 0,
        chargeNextMonth: service.chargeNextMonth ?? 0,
        recurringCyclesLimit: service.recurringCyclesLimit ?? 0,
        autoTerminateDays: service.autoTerminateDays ?? 0,
      })
    }
  }, [open, service])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.groupId) delete payload.groupId
      if (!payload.moduleName) delete payload.moduleName
      if (!payload.moduleType) delete payload.moduleType
      if (!payload.serverGroup) delete payload.serverGroup
      if (!payload.welcomeEmailTemplate) delete payload.welcomeEmailTemplate
      if (!payload.color) delete payload.color
      if (!payload.tagline) delete payload.tagline
      await AdminServicesAPI.updateService(service.id, payload)
      toast.success("Service updated")
      onSaved()
    } catch (err) {
      toast.error(err.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {/* Basic Info */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</p>
          <Field label="Name *">
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Tagline" hint="Short phrase shown in store listings">
            <Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} maxLength={255} placeholder="e.g. Fast &amp; reliable hosting" />
          </Field>
          <Field label="Short Description">
            <Input value={form.shortDescription ?? ""} onChange={(e) => set("shortDescription", e.target.value)} maxLength={255} />
          </Field>
          <Field label="Description" hint={`${(form.description ?? "").length}/1000`}>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Group">
              <Select value={form.groupId || "__none"} onValueChange={(v) => set("groupId", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No group</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Product Color" hint="Hex color for store display">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.color || "#3b82f6"}
                  onChange={(e) => set("color", e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer p-1"
                />
                <Input value={form.color ?? ""} onChange={(e) => set("color", e.target.value)} placeholder="#3b82f6" maxLength={7} className="flex-1" />
              </div>
            </Field>
          </div>

          <Separator />
          {/* Configuration */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuration</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Payment Type">
              <Select value={form.paymentType ?? "regular"} onValueChange={(v) => set("paymentType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Customization">
              <Select value={form.customizeOption ?? "none"} onValueChange={(v) => set("customizeOption", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CUSTOMIZE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Module Type">
              <Select value={form.moduleType || "__none"} onValueChange={(v) => set("moduleType", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {MODULE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Module Name">
              <Input value={form.moduleName ?? ""} onChange={(e) => set("moduleName", e.target.value)} placeholder="e.g. cPanel" />
            </Field>
            <Field label="Server Group">
              <Input value={form.serverGroup ?? ""} onChange={(e) => set("serverGroup", e.target.value)} placeholder="e.g. US-East" />
            </Field>
            <Field label="Welcome Email Template">
              <Input value={form.welcomeEmailTemplate ?? ""} onChange={(e) => set("welcomeEmailTemplate", e.target.value)} placeholder="Template name or ID" />
            </Field>
          </div>
          <Field label="Allow Multiple Quantities">
            <Select value={form.multipleQuantities ?? "no"} onValueChange={(v) => set("multipleQuantities", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MULTIPLE_QUANTITIES_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Separator />
          {/* Billing Settings */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billing Settings</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Recurring Cycles Limit" hint="0 = Unlimited">
              <Input type="number" min={0} value={form.recurringCyclesLimit ?? 0} onChange={(e) => set("recurringCyclesLimit", Number(e.target.value))} />
            </Field>
            <Field label="Auto Terminate After (days)" hint="0 = Disabled">
              <Input type="number" min={0} value={form.autoTerminateDays ?? 0} onChange={(e) => set("autoTerminateDays", Number(e.target.value))} />
            </Field>
            <Field label="Prorata Date" hint="Day of month to charge on">
              <Input type="number" min={0} max={28} value={form.prorataDate ?? 0} onChange={(e) => set("prorataDate", Number(e.target.value))} />
            </Field>
            <Field label="Charge Next Month After Day">
              <Input type="number" min={0} max={28} value={form.chargeNextMonth ?? 0} onChange={(e) => set("chargeNextMonth", Number(e.target.value))} />
            </Field>
          </div>

          <Separator />
          {/* Flags */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status &amp; Flags</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { key: "active", label: "Active" },
              { key: "hidden", label: "Hidden" },
              { key: "featured", label: "Featured" },
              { key: "retired", label: "Retired" },
              { key: "taxable", label: "Apply Tax" },
              { key: "requiresDomain", label: "Require Domain" },
              { key: "allowAutoRenew", label: "Auto-renew" },
              { key: "autoSetup", label: "Auto-setup" },
              { key: "autoSuspend", label: "Auto-suspend" },
              { key: "prorataBilling", label: "Prorata Billing" },
              { key: "onDemandRenewals", label: "On-Demand Renewals" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer">
                <span className="text-xs">{label}</span>
                <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANS TAB
// ─────────────────────────────────────────────────────────────────────────────

function PlansTab({ serviceId }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [pricingPlan, setPricingPlan] = useState(null)
  const [statsPlan, setStatsPlan] = useState(null)
  const [planStats, setPlanStats] = useState({})
  const [importOpen, setImportOpen] = useState(false)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await AdminServicesAPI.listPlans(serviceId)
      setPlans(unwrap(res, "plans"))
    } catch {
      toast.error("Failed to load plans")
    } finally {
      setLoading(false)
    }
  }, [serviceId])

  useEffect(() => { load() }, [load])

  const handleToggleStatus = async (plan) => {
    try {
      await AdminServicesAPI.togglePlanStatus(plan.id)
      toast.success(`Plan ${plan.active ? "deactivated" : "activated"}`)
      load()
    } catch { toast.error("Failed to toggle plan status") }
  }

  const handleToggleVisibility = async (plan) => {
    try {
      await AdminServicesAPI.togglePlanVisibility(plan.id)
      toast.success(`Plan ${plan.hidden ? "shown" : "hidden"}`)
      load()
    } catch { toast.error("Failed to toggle visibility") }
  }

  const handleReorder = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= plans.length) return
    const a = plans[index]
    const b = plans[targetIndex]
    const newPlans = [...plans]
    ;[newPlans[index], newPlans[targetIndex]] = [newPlans[targetIndex], newPlans[index]]
    setPlans(newPlans)
    try {
      await Promise.all([
        AdminServicesAPI.updatePlan(a.id, { position: b.position ?? targetIndex }),
        AdminServicesAPI.updatePlan(b.id, { position: a.position ?? index }),
      ])
    } catch {
      toast.error("Failed to reorder plans")
      load()
    }
  }

  const loadPlanStats = async (plan) => {
    if (planStats[plan.id]) { setStatsPlan({ plan, stats: planStats[plan.id] }); return }
    try {
      const res = await AdminServicesAPI.getPlanStats(plan.id)
      const s = res?.stats ?? res
      setPlanStats((prev) => ({ ...prev, [plan.id]: s }))
      setStatsPlan({ plan, stats: s })
    } catch { toast.error("Failed to load plan stats") }
  }

  const handleExport = () => {
    try {
      const json = JSON.stringify(plans, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `plans-export-${serviceId}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${plans.length} plan(s)`)
    } catch { toast.error("Export failed") }
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        await AdminServicesAPI.importPlans(serviceId, Array.isArray(data) ? data : [data])
        toast.success("Plans imported")
        load()
      } catch (err) {
        toast.error(err.message || "Import failed — check JSON format")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" /> Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Plan
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Layers className="h-10 w-10 opacity-30" />
            <p>No plans yet</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create first plan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan, index) => (
            <Card key={plan.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleReorder(index, "up")} disabled={index === 0}>
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleReorder(index, "down")} disabled={index === plans.length - 1}>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {statusBadge(plan.active, plan.hidden)}
                      {plan.paymentType && (
                        <Badge variant="outline" className="capitalize text-xs">{plan.paymentType}</Badge>
                      )}
                    </div>
                    {plan.summary && <CardDescription className="mt-0.5">{plan.summary}</CardDescription>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2" onClick={() => setEditPlan(plan)}>
                      <Pencil className="h-4 w-4" /> Edit Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => setPricingPlan(plan)}>
                      <Tag className="h-4 w-4" /> Manage Pricing
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => loadPlanStats(plan)}>
                      <BarChart3 className="h-4 w-4" /> Stats
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2" onClick={() => handleToggleStatus(plan)}>
                      {plan.active ? <><PowerOff className="h-4 w-4" /> Deactivate</> : <><Power className="h-4 w-4" /> Activate</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => handleToggleVisibility(plan)}>
                      {plan.hidden ? <><Eye className="h-4 w-4" /> Show</> : <><EyeOff className="h-4 w-4" /> Hide</>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  {plan.maxQuantity && <span>Max qty: {plan.maxQuantity}</span>}
                  {plan.stockLimit && <span>Stock: {plan.stockLimit}</span>}
                  {plan.pricing?.length > 0 && (
                    <span>{plan.pricing.length} pricing cycle{plan.pricing.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlanFormDialog open={createOpen} onOpenChange={setCreateOpen} serviceId={serviceId} onSaved={() => { setCreateOpen(false); load() }} />
      <PlanFormDialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)} plan={editPlan} serviceId={serviceId} onSaved={() => { setEditPlan(null); load() }} />
      {pricingPlan && <PricingManagerDialog open={!!pricingPlan} onOpenChange={(o) => !o && setPricingPlan(null)} plan={pricingPlan} onSaved={load} />}

      {/* Plan stats dialog */}
      <Dialog open={!!statsPlan} onOpenChange={(o) => !o && setStatsPlan(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{statsPlan?.plan?.name} — Stats</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {statsPlan?.stats ? (
              Object.entries(statsPlan.stats).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                  <Badge variant="secondary">{String(v)}</Badge>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground text-center py-4">No stats available</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlanFormDialog({ open, onOpenChange, plan, serviceId, onSaved }) {
  const isEdit = !!plan
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {
        name: plan.name ?? "", summary: plan.summary ?? "",
        customizeOption: plan.customizeOption ?? "none",
        paymentType: plan.paymentType ?? "regular",
        maxQuantity: plan.maxQuantity ?? "", stockLimit: plan.stockLimit ?? "",
        active: plan.active ?? true, hidden: plan.hidden ?? false,
      } : {
        name: "", summary: "", customizeOption: "none", paymentType: "regular",
        maxQuantity: "", stockLimit: "",
      })
    }
  }, [open, plan, isEdit])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.summary) delete payload.summary
      if (payload.maxQuantity === "") delete payload.maxQuantity; else payload.maxQuantity = Number(payload.maxQuantity)
      if (payload.stockLimit === "") delete payload.stockLimit; else payload.stockLimit = Number(payload.stockLimit)
      if (isEdit) {
        await AdminServicesAPI.updatePlan(plan.id, payload)
        toast.success("Plan updated")
      } else {
        await AdminServicesAPI.createPlan(serviceId, payload)
        toast.success("Plan created")
      }
      onSaved()
    } catch (err) {
      toast.error(err.message || "Failed to save plan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Plan" : "Create Plan"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Name *">
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} maxLength={255} />
          </Field>
          <Field label="Summary">
            <Input value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)} maxLength={255} placeholder="Short description" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Payment Type">
              <Select value={form.paymentType ?? "regular"} onValueChange={(v) => set("paymentType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Customization">
              <Select value={form.customizeOption ?? "none"} onValueChange={(v) => set("customizeOption", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CUSTOMIZE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Max Quantity">
              <Input type="number" min={1} value={form.maxQuantity ?? ""} onChange={(e) => set("maxQuantity", e.target.value)} placeholder="Unlimited" />
            </Field>
            <Field label="Stock Limit">
              <Input type="number" min={0} value={form.stockLimit ?? ""} onChange={(e) => set("stockLimit", e.target.value)} placeholder="Unlimited" />
            </Field>
          </div>
          {isEdit && (
            <div className="flex gap-3">
              {[{ key: "active", label: "Active" }, { key: "hidden", label: "Hidden" }].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer flex-1">
                  <span className="text-sm">{label}</span>
                  <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
                </label>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PricingManagerDialog({ open, onOpenChange, plan, onSaved }) {
  const [pricing, setPricing] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editPricing, setEditPricing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await AdminServicesAPI.listPricing(plan.id)
      setPricing(unwrap(res, "pricing"))
    } catch { toast.error("Failed to load pricing") }
    finally { setLoading(false) }
  }, [plan.id])

  useEffect(() => { if (open) load() }, [open, load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.deletePricing(deleteTarget.id)
      toast.success("Pricing deleted")
      setDeleteTarget(null); load(); onSaved()
    } catch { toast.error("Failed to delete pricing") }
    finally { setSubmitting(false) }
  }

  const usedCycles = new Set(pricing.map((p) => p.cycle))
  const availableCycles = BILLING_CYCLES.filter((c) => !usedCycles.has(c.value))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pricing — {plan.name}</DialogTitle>
          <DialogDescription>Manage billing cycles and prices</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="space-y-3">
            {pricing.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pricing configured</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cycle</TableHead><TableHead>Price</TableHead><TableHead>Setup</TableHead>
                    <TableHead>Renewal</TableHead><TableHead>Currency</TableHead><TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricing.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="capitalize font-medium">{p.cycle?.replace(/_/g, " ")}</TableCell>
                      <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                      <TableCell>{p.setupFee ? `$${Number(p.setupFee).toFixed(2)}` : "—"}</TableCell>
                      <TableCell>{p.renewalPrice ? `$${Number(p.renewalPrice).toFixed(2)}` : "—"}</TableCell>
                      <TableCell>{p.currency ?? "USD"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => setEditPricing(p)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {availableCycles.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Pricing Cycle
              </Button>
            )}
          </div>
        )}
      </DialogContent>
      <PricingFormDialog open={createOpen} onOpenChange={setCreateOpen} planId={plan.id} availableCycles={availableCycles} onSaved={() => { setCreateOpen(false); load(); onSaved() }} />
      <PricingFormDialog open={!!editPricing} onOpenChange={(o) => !o && setEditPricing(null)} planId={plan.id} pricing={editPricing} availableCycles={BILLING_CYCLES} onSaved={() => { setEditPricing(null); load(); onSaved() }} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pricing?</AlertDialogTitle>
            <AlertDialogDescription>Remove the <strong className="capitalize">{deleteTarget?.cycle?.replace(/_/g, " ")}</strong> pricing cycle.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{submitting ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

function PricingFormDialog({ open, onOpenChange, planId, pricing, availableCycles, onSaved }) {
  const isEdit = !!pricing
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {
        cycle: pricing.cycle ?? "", price: pricing.price ?? "",
        setupFee: pricing.setupFee ?? "", renewalPrice: pricing.renewalPrice ?? "",
        suspensionFee: pricing.suspensionFee ?? "", terminationFee: pricing.terminationFee ?? "",
        currency: pricing.currency ?? "USD",
        discountType: pricing.discountType ?? "none", discountAmount: pricing.discountAmount ?? "",
      } : {
        cycle: availableCycles[0]?.value ?? "", price: "", setupFee: "", renewalPrice: "",
        suspensionFee: "", terminationFee: "", currency: "USD", discountType: "none", discountAmount: "",
      })
    }
  }, [open, pricing, isEdit, availableCycles])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.cycle) { toast.error("Billing cycle is required"); return }
    if (form.price === "" || isNaN(Number(form.price))) { toast.error("Price is required"); return }
    setSaving(true)
    try {
      const payload = { cycle: form.cycle, price: Number(form.price), currency: form.currency || "USD" }
      if (form.setupFee !== "") payload.setupFee = Number(form.setupFee)
      if (form.renewalPrice !== "") payload.renewalPrice = Number(form.renewalPrice)
      if (form.suspensionFee !== "") payload.suspensionFee = Number(form.suspensionFee)
      if (form.terminationFee !== "") payload.terminationFee = Number(form.terminationFee)
      if (form.discountType && form.discountType !== "none") { payload.discountType = form.discountType; payload.discountAmount = Number(form.discountAmount) }
      if (isEdit) { await AdminServicesAPI.updatePricing(pricing.id, payload); toast.success("Pricing updated") }
      else { await AdminServicesAPI.createPricing(planId, payload); toast.success("Pricing created") }
      onSaved()
    } catch (err) { toast.error(err.message || "Failed to save pricing") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Pricing" : "Add Pricing Cycle"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Billing Cycle *">
            <Select value={form.cycle ?? ""} onValueChange={(v) => set("cycle", v)} disabled={isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{availableCycles.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price *"><Input type="number" min={0} step="0.01" value={form.price ?? ""} onChange={(e) => set("price", e.target.value)} placeholder="0.00" /></Field>
            <Field label="Currency"><Input value={form.currency ?? "USD"} onChange={(e) => set("currency", e.target.value)} maxLength={3} /></Field>
            <Field label="Setup Fee"><Input type="number" min={0} step="0.01" value={form.setupFee ?? ""} onChange={(e) => set("setupFee", e.target.value)} placeholder="0.00" /></Field>
            <Field label="Renewal Price"><Input type="number" min={0} step="0.01" value={form.renewalPrice ?? ""} onChange={(e) => set("renewalPrice", e.target.value)} placeholder="Same as price" /></Field>
            <Field label="Suspension Fee"><Input type="number" min={0} step="0.01" value={form.suspensionFee ?? ""} onChange={(e) => set("suspensionFee", e.target.value)} placeholder="0.00" /></Field>
            <Field label="Termination Fee"><Input type="number" min={0} step="0.01" value={form.terminationFee ?? ""} onChange={(e) => set("terminationFee", e.target.value)} placeholder="0.00" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Discount Type">
              <Select value={form.discountType ?? "none"} onValueChange={(v) => set("discountType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISCOUNT_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {form.discountType && form.discountType !== "none" && (
              <Field label="Discount Amount"><Input type="number" min={0} step="0.01" value={form.discountAmount ?? ""} onChange={(e) => set("discountAmount", e.target.value)} /></Field>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES TAB
// ─────────────────────────────────────────────────────────────────────────────

function FeaturesTab({ serviceId }) {
  const [features, setFeatures] = useState([])
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("list")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [planFeaturesTarget, setPlanFeaturesTarget] = useState(null) // plan to show features for
  const [planFeaturesData, setPlanFeaturesData] = useState(null)
  const [plans, setPlans] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editFeature, setEditFeature] = useState(null)
  const [setValueTarget, setSetValueTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [fRes, mRes, pRes] = await Promise.all([
        AdminServicesAPI.listFeatures(serviceId),
        AdminServicesAPI.getFeaturesComparison(serviceId),
        AdminServicesAPI.listPlans(serviceId),
      ])
      setFeatures(unwrap(fRes, "features"))
      setMatrix(normalizeFeaturesMatrix(mRes))
      setPlans(unwrap(pRes, "plans"))
    } catch { toast.error("Failed to load features") }
    finally { setLoading(false) }
  }, [serviceId])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.deleteFeature(deleteTarget.id)
      toast.success("Feature deleted")
      setDeleteTarget(null); load()
    } catch { toast.error("Failed to delete feature") }
    finally { setSubmitting(false) }
  }

  const handleReorder = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= filteredFeatures.length) return
    const newFeatures = [...filteredFeatures]
    ;[newFeatures[index], newFeatures[targetIndex]] = [newFeatures[targetIndex], newFeatures[index]]
    setFeatures(newFeatures)
    try {
      await AdminServicesAPI.reorderFeatures(newFeatures.map((f) => f.id))
    } catch { toast.error("Failed to reorder"); load() }
  }

  const loadPlanFeatures = async (plan) => {
    setPlanFeaturesTarget(plan)
    setPlanFeaturesData(null)
    try {
      const raw = await AdminServicesAPI.getPlanFeatures(plan.id)
      setPlanFeaturesData(normalizePlanFeatures(raw))
    } catch { toast.error("Failed to load plan features") }
  }

  // Category filter
  const categories = ["all", ...new Set(features.map((f) => f.category).filter(Boolean))]
  const filteredFeatures = categoryFilter === "all" ? features : features.filter((f) => f.category === categoryFilter)

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
            <ClipboardList className="h-4 w-4 mr-1.5" /> List
          </Button>
          <Button size="sm" variant={view === "matrix" ? "default" : "outline"} onClick={() => setView("matrix")} disabled={!matrix?.plans?.length}>
            <Layers className="h-4 w-4 mr-1.5" /> Matrix
          </Button>
          <Button size="sm" variant={view === "plan" ? "default" : "outline"} onClick={() => setView("plan")} disabled={!plans.length}>
            <Search className="h-4 w-4 mr-1.5" /> Per Plan
          </Button>
          {view === "list" && categories.length > 1 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c === "all" ? "All categories" : c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Feature
        </Button>
      </div>

      {view === "list" && (
        filteredFeatures.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Tag className="h-10 w-10 opacity-30" />
              <p>No features defined</p>
              <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add feature</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Order</TableHead>
                  <TableHead>Key</TableHead><TableHead>Name</TableHead>
                  <TableHead>Type</TableHead><TableHead>Unit</TableHead><TableHead>Category</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeatures.map((f, index) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorder(index, "up")} disabled={index === 0}><ChevronUp className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorder(index, "down")} disabled={index === filteredFeatures.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.key}</code></TableCell>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="capitalize text-sm text-muted-foreground">{f.type ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.unit ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.category ?? "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => setEditFeature(f)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteTarget(f)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      )}

      {view === "matrix" && (
        matrix && matrix.features.length > 0 ? (
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40">Feature</TableHead>
                    {matrix.plans.map((p) => <TableHead key={p.id} className="text-center min-w-32">{p.name}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.features.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{f.name}</p>
                          {f.unit && <p className="text-xs text-muted-foreground">{f.unit}</p>}
                        </div>
                      </TableCell>
                      {matrix.plans.map((p) => {
                        const val = f.values?.[p.id]
                        const feat = features.find((ft) => ft.key === f.key)
                        return (
                          <TableCell key={p.id} className="text-center">
                            <button
                              className="min-w-12 text-sm hover:bg-muted rounded px-2 py-1 transition-colors"
                              onClick={() => feat && setSetValueTarget({ feature: feat, plan: p, currentValue: val })}
                              title="Click to set value"
                            >
                              {val === null || val === undefined ? <span className="text-muted-foreground">—</span>
                                : val === "true" || val === true ? <span className="text-green-600">✓</span>
                                : val === "false" || val === false ? <span className="text-muted-foreground">✗</span>
                                : val}
                            </button>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No plans or features to display</p>
        )
      )}

      {view === "plan" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {plans.map((p) => (
              <Button
                key={p.id} size="sm"
                variant={planFeaturesTarget?.id === p.id ? "default" : "outline"}
                onClick={() => loadPlanFeatures(p)}
              >
                {p.name}
              </Button>
            ))}
          </div>
          {planFeaturesTarget && (
            planFeaturesData === null ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : planFeaturesData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No features for {planFeaturesTarget.name}</p>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Feature</TableHead><TableHead>Value</TableHead><TableHead>Unit</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {planFeaturesData.map((f) => (
                      <TableRow key={f.key}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell>
                          {f.value === "true" || f.value === true ? <span className="text-green-600">✓ Yes</span>
                            : f.value === "false" || f.value === false ? <span className="text-muted-foreground">✗ No</span>
                            : f.value ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.unit ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )
          )}
        </div>
      )}

      <FeatureFormDialog open={createOpen} onOpenChange={setCreateOpen} serviceId={serviceId} onSaved={() => { setCreateOpen(false); load() }} />
      <FeatureFormDialog open={!!editFeature} onOpenChange={(o) => !o && setEditFeature(null)} feature={editFeature} serviceId={serviceId} onSaved={() => { setEditFeature(null); load() }} />
      {setValueTarget && (
        <SetFeatureValueDialog
          open={!!setValueTarget} onOpenChange={(o) => !o && setSetValueTarget(null)}
          feature={setValueTarget.feature} plan={setValueTarget.plan} currentValue={setValueTarget.currentValue}
          onSaved={() => { setSetValueTarget(null); load() }}
        />
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feature?</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleteTarget?.name}</strong>? All plan values will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{submitting ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FeatureFormDialog({ open, onOpenChange, feature, serviceId, onSaved }) {
  const isEdit = !!feature
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {
        name: feature.name ?? "", description: feature.description ?? "",
        type: feature.type ?? "text", unit: feature.unit ?? "",
        icon: feature.icon ?? "", category: feature.category ?? "",
      } : { key: "", name: "", description: "", type: "text", unit: "", icon: "", category: "" })
    }
  }, [open, feature, isEdit])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return }
    if (!isEdit && !form.key?.trim()) { toast.error("Key is required"); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.description) delete payload.description
      if (!payload.unit) delete payload.unit
      if (!payload.icon) delete payload.icon
      if (!payload.category) delete payload.category
      if (isEdit) { await AdminServicesAPI.updateFeature(feature.id, payload); toast.success("Feature updated") }
      else { await AdminServicesAPI.createFeature(serviceId, payload); toast.success("Feature created") }
      onSaved()
    } catch (err) { toast.error(err.message || "Failed to save feature") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Feature" : "Create Feature"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {!isEdit && <Field label="Key *" hint="Unique, e.g. storage_limit"><Input value={form.key ?? ""} onChange={(e) => set("key", e.target.value)} maxLength={100} placeholder="feature_key" /></Field>}
          <Field label="Name *"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} maxLength={255} /></Field>
          <Field label="Description"><Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={500} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select value={form.type ?? "text"} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FEATURE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Unit" hint="e.g. GB"><Input value={form.unit ?? ""} onChange={(e) => set("unit", e.target.value)} maxLength={50} /></Field>
            <Field label="Category"><Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} maxLength={100} placeholder="e.g. Storage" /></Field>
            <Field label="Icon"><Input value={form.icon ?? ""} onChange={(e) => set("icon", e.target.value)} maxLength={100} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SetFeatureValueDialog({ open, onOpenChange, feature, plan, currentValue, onSaved }) {
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setValue(currentValue ?? "") }, [open, currentValue])

  const handleSave = async () => {
    setSaving(true)
    try {
      await AdminServicesAPI.setFeatureValue(feature.id, plan.id, value)
      toast.success("Value set"); onSaved()
    } catch (err) { toast.error(err.message || "Failed to set value") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Feature Value</DialogTitle>
          <DialogDescription><strong>{feature?.name}</strong> for <strong>{plan?.name}</strong></DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {feature?.type === "boolean" ? (
            <Field label="Value">
              <Select value={String(value)} onValueChange={(v) => setValue(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Yes ✓</SelectItem><SelectItem value="false">No ✗</SelectItem></SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label={`Value${feature?.unit ? ` (${feature.unit})` : ""}`}>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Unlimited, 100" />
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Set Value"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD-ONS TAB
// ─────────────────────────────────────────────────────────────────────────────

function AddonsTab({ serviceId }) {
  const [addons, setAddons] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editAddon, setEditAddon] = useState(null)
  const [attachAddon, setAttachAddon] = useState(null)
  const [pricingAddon, setPricingAddon] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, pRes] = await Promise.all([
        AdminServicesAPI.listAddons(serviceId),
        AdminServicesAPI.listPlans(serviceId),
      ])
      setAddons(unwrap(aRes, "addons"))
      setPlans(unwrap(pRes, "plans"))
    } catch { toast.error("Failed to load add-ons") }
    finally { setLoading(false) }
  }, [serviceId])

  useEffect(() => { load() }, [load])

  const handleToggleActive = async (addon) => {
    try {
      await AdminServicesAPI.toggleAddonActive(addon.id)
      toast.success(`Add-on ${addon.active ? "deactivated" : "activated"}`); load()
    } catch { toast.error("Failed to toggle add-on") }
  }

  const handleReorder = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= addons.length) return
    const newAddons = [...addons]
    ;[newAddons[index], newAddons[targetIndex]] = [newAddons[targetIndex], newAddons[index]]
    setAddons(newAddons)
    try {
      await AdminServicesAPI.reorderAddons(newAddons.map((a) => a.id))
    } catch { toast.error("Failed to reorder"); load() }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.deleteAddon(deleteTarget.id)
      toast.success("Add-on deleted"); setDeleteTarget(null); load()
    } catch { toast.error("Failed to delete add-on") }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{addons.length} add-on{addons.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Add-on</Button>
      </div>

      {addons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <PuzzleIcon className="h-10 w-10 opacity-30" />
            <p>No add-ons yet</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create first add-on</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addons.map((addon, index) => (
            <Card key={addon.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleReorder(index, "up")} disabled={index === 0}><ChevronUp className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleReorder(index, "down")} disabled={index === addons.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{addon.name}</CardTitle>
                      {addon.code && <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{addon.code}</code>}
                      <Badge variant={addon.active ? "default" : "secondary"}>{addon.active ? "Active" : "Inactive"}</Badge>
                      {addon.required && <Badge variant="outline">Required</Badge>}
                      {addon.recurring && <Badge variant="outline">Recurring</Badge>}
                    </div>
                    {addon.description && <CardDescription className="mt-0.5">{addon.description}</CardDescription>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2" onClick={() => setEditAddon(addon)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => setPricingAddon(addon)}><Tag className="h-4 w-4" /> Pricing Cycles</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => setAttachAddon(addon)}><Layers className="h-4 w-4" /> Plan Attachments</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2" onClick={() => handleToggleActive(addon)}>
                      <ToggleLeft className="h-4 w-4" /> {addon.active ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteTarget(addon)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  {addon.monthlyPrice != null && <span>Monthly: ${Number(addon.monthlyPrice).toFixed(2)}</span>}
                  {addon.setupFee != null && <span>Setup: ${Number(addon.setupFee).toFixed(2)}</span>}
                  {addon.maxQuantity && <span>Max qty: {addon.maxQuantity}</span>}
                  {addon.billingType && <span className="capitalize">{addon.billingType}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddonFormDialog open={createOpen} onOpenChange={setCreateOpen} serviceId={serviceId} onSaved={() => { setCreateOpen(false); load() }} />
      <AddonFormDialog open={!!editAddon} onOpenChange={(o) => !o && setEditAddon(null)} addon={editAddon} serviceId={serviceId} onSaved={() => { setEditAddon(null); load() }} />
      {attachAddon && <AddonPlanAttachDialog open={!!attachAddon} onOpenChange={(o) => !o && setAttachAddon(null)} addon={attachAddon} plans={plans} onSaved={load} />}
      {pricingAddon && <AddonPricingDialog open={!!pricingAddon} onOpenChange={(o) => !o && setPricingAddon(null)} addon={pricingAddon} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete add-on?</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{submitting ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddonFormDialog({ open, onOpenChange, addon, serviceId, onSaved }) {
  const isEdit = !!addon
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {
        name: addon.name ?? "", description: addon.description ?? "",
        setupFee: addon.setupFee ?? "", monthlyPrice: addon.monthlyPrice ?? "",
        currency: addon.currency ?? "USD", maxQuantity: addon.maxQuantity ?? "",
        required: addon.required ?? false, recurring: addon.recurring ?? false,
        billingType: addon.billingType ?? "", active: addon.active ?? true,
      } : { name: "", description: "", code: "", setupFee: "", monthlyPrice: "", currency: "USD", maxQuantity: "", required: false, recurring: true, billingType: "" })
    }
  }, [open, addon, isEdit])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.description) delete payload.description
      if (!payload.code) delete payload.code
      if (!payload.billingType) delete payload.billingType
      if (payload.setupFee === "") delete payload.setupFee; else payload.setupFee = Number(payload.setupFee)
      if (payload.monthlyPrice === "") delete payload.monthlyPrice; else payload.monthlyPrice = Number(payload.monthlyPrice)
      if (payload.maxQuantity === "") delete payload.maxQuantity; else payload.maxQuantity = Number(payload.maxQuantity)
      if (isEdit) { await AdminServicesAPI.updateAddon(addon.id, payload); toast.success("Add-on updated") }
      else { await AdminServicesAPI.createAddon(serviceId, payload); toast.success("Add-on created") }
      onSaved()
    } catch (err) { toast.error(err.message || "Failed to save add-on") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Add-on" : "Create Add-on"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {!isEdit && <Field label="Code" hint="Unique identifier"><Input value={form.code ?? ""} onChange={(e) => set("code", e.target.value)} maxLength={100} placeholder="addon_code" /></Field>}
          <Field label="Name *"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} maxLength={255} /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={500} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly Price"><Input type="number" min={0} step="0.01" value={form.monthlyPrice ?? ""} onChange={(e) => set("monthlyPrice", e.target.value)} placeholder="0.00" /></Field>
            <Field label="Setup Fee"><Input type="number" min={0} step="0.01" value={form.setupFee ?? ""} onChange={(e) => set("setupFee", e.target.value)} placeholder="0.00" /></Field>
            <Field label="Currency"><Input value={form.currency ?? "USD"} onChange={(e) => set("currency", e.target.value)} maxLength={3} /></Field>
            <Field label="Max Quantity"><Input type="number" min={1} value={form.maxQuantity ?? ""} onChange={(e) => set("maxQuantity", e.target.value)} placeholder="Unlimited" /></Field>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "required", label: "Required" }, { key: "recurring", label: "Recurring" },
              ...(isEdit ? [{ key: "active", label: "Active" }] : []),
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer">
                <span className="text-sm">{label}</span>
                <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddonPricingDialog({ open, onOpenChange, addon }) {
  const [form, setForm] = useState({ cycle: "monthly", price: "", setupFee: "", renewalPrice: "", currency: "USD" })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm({ cycle: "monthly", price: "", setupFee: "", renewalPrice: "", currency: "USD" }) }, [open])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (form.price === "" || isNaN(Number(form.price))) { toast.error("Price is required"); return }
    setSaving(true)
    try {
      const payload = { cycle: form.cycle, price: Number(form.price), currency: form.currency || "USD" }
      if (form.setupFee !== "") payload.setupFee = Number(form.setupFee)
      if (form.renewalPrice !== "") payload.renewalPrice = Number(form.renewalPrice)
      await AdminServicesAPI.createAddonPricing(addon.id, payload)
      toast.success("Add-on pricing created")
      onOpenChange(false)
    } catch (err) { toast.error(err.message || "Failed to create pricing") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add-on Pricing</DialogTitle>
          <DialogDescription>Add a billing cycle price for <strong>{addon?.name}</strong></DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Billing Cycle">
            <Select value={form.cycle} onValueChange={(v) => set("cycle", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BILLING_CYCLES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price *"><Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={(e) => set("currency", e.target.value)} maxLength={3} /></Field>
            <Field label="Setup Fee"><Input type="number" min={0} step="0.01" value={form.setupFee} onChange={(e) => set("setupFee", e.target.value)} placeholder="0.00" /></Field>
            <Field label="Renewal Price"><Input type="number" min={0} step="0.01" value={form.renewalPrice} onChange={(e) => set("renewalPrice", e.target.value)} placeholder="Same as price" /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Add Pricing"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddonPlanAttachDialog({ open, onOpenChange, addon, plans, onSaved }) {
  const [detailed, setDetailed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await AdminServicesAPI.getAddonDetailed(addon.id)
      setDetailed(res?.addon ?? res)
    } catch { toast.error("Failed to load add-on details") }
    finally { setLoading(false) }
  }, [addon.id])

  useEffect(() => { if (open) load() }, [open, load])

  const attachedPlanIds = new Set(detailed?.plans?.map((p) => p.id) ?? [])

  const handleToggle = async (plan) => {
    setSubmitting(plan.id)
    try {
      if (attachedPlanIds.has(plan.id)) {
        await AdminServicesAPI.detachAddonFromPlan(addon.id, plan.id)
        toast.success(`Detached from ${plan.name}`)
      } else {
        await AdminServicesAPI.attachAddonToPlan(addon.id, plan.id, { included: false, quantity: 1 })
        toast.success(`Attached to ${plan.name}`)
      }
      load(); onSaved()
    } catch { toast.error("Failed to update plan attachment") }
    finally { setSubmitting(null) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plan Attachments</DialogTitle>
          <DialogDescription>Control which plans include <strong>{addon.name}</strong></DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No plans available</p>
        ) : (
          <div className="space-y-2 py-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between rounded-md border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{plan.name}</p>
                  {!plan.active && <p className="text-xs text-muted-foreground">Inactive</p>}
                </div>
                <Switch checked={attachedPlanIds.has(plan.id)} onCheckedChange={() => handleToggle(plan)} disabled={submitting === plan.id} />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

function AutomationsTab({ serviceId }) {
  const [automations, setAutomations] = useState([])
  const [loading, setLoading] = useState(true)
  const [availableEvents, setAvailableEvents] = useState([])
  const [availableActions, setAvailableActions] = useState([])
  const [availableModules, setAvailableModules] = useState([])
  const [eventFilter, setEventFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState("custom")
  const [editAutomation, setEditAutomation] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, evRes, acRes, modRes] = await Promise.all([
        AdminServicesAPI.listAutomations(serviceId),
        AdminServicesAPI.listAvailableEvents().catch(() => ({ events: [] })),
        AdminServicesAPI.listAvailableActions().catch(() => ({ actions: [] })),
        AdminServicesAPI.listAvailableModules().catch(() => ({ modules: [] })),
      ])
      setAutomations(unwrap(aRes, "automations"))
      setAvailableEvents(unwrap(evRes, "events"))
      setAvailableActions(unwrap(acRes, "actions"))
      setAvailableModules(unwrap(modRes, "modules"))
    } catch { toast.error("Failed to load automations") }
    finally { setLoading(false) }
  }, [serviceId])

  useEffect(() => { load() }, [load])

  const handleToggle = async (automation) => {
    try {
      await AdminServicesAPI.toggleAutomation(automation.id)
      toast.success(`Automation ${automation.enabled ? "disabled" : "enabled"}`); load()
    } catch { toast.error("Failed to toggle automation") }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.deleteAutomation(deleteTarget.id)
      toast.success("Automation deleted"); setDeleteTarget(null); load()
    } catch { toast.error("Failed to delete automation") }
    finally { setSubmitting(false) }
  }

  const loadEditAutomation = async (automation) => {
    try {
      const res = await AdminServicesAPI.getAutomation(automation.id)
      setEditAutomation(res?.automation ?? res)
    } catch { toast.error("Failed to load automation details") }
  }

  // Dynamic events list: prefer server-side list, fall back to hardcoded
  const eventOptions = availableEvents.length > 0
    ? availableEvents
    : ["order.created","order.activated","order.suspended","order.resumed","order.renewed","order.terminated","order.cancelled","payment.received","invoice.generated","invoice.overdue"]

  const actionOptions = availableActions.length > 0 ? availableActions : []
  const moduleOptions = availableModules.length > 0 ? availableModules : []

  const filteredAutomations = eventFilter === "all"
    ? automations
    : automations.filter((a) => a.event === eventFilter)

  const usedEvents = [...new Set(automations.map((a) => a.event))]

  const openCreate = (mode) => { setCreateMode(mode); setCreateOpen(true) }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{automations.length} automation{automations.length !== 1 ? "s" : ""}</p>
          {usedEvents.length > 0 && (
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                {usedEvents.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => openCreate("provisioning")}><Settings className="h-4 w-4 mr-1.5" />Provisioning</Button>
          <Button size="sm" variant="outline" onClick={() => openCreate("email")}><Mail className="h-4 w-4 mr-1.5" />Email</Button>
          <Button size="sm" variant="outline" onClick={() => openCreate("webhook")}><Webhook className="h-4 w-4 mr-1.5" />Webhook</Button>
          <Button size="sm" onClick={() => openCreate("custom")}><Plus className="h-4 w-4 mr-1.5" />Custom</Button>
        </div>
      </div>

      {filteredAutomations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Zap className="h-10 w-10 opacity-30" />
            <p>{eventFilter !== "all" ? `No automations for "${eventFilter}"` : "No automations configured"}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead><TableHead>Action</TableHead><TableHead>Module</TableHead>
                <TableHead className="text-center">Priority</TableHead><TableHead className="text-center">Enabled</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAutomations.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.event}</code></TableCell>
                  <TableCell className="capitalize text-sm">{a.action?.replace(/_/g, " ") ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.module ?? "—"}</TableCell>
                  <TableCell className="text-center text-sm">{a.priority ?? 0}</TableCell>
                  <TableCell className="text-center"><Switch checked={!!a.enabled} onCheckedChange={() => handleToggle(a)} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => loadEditAutomation(a)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteTarget(a)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AutomationCreateDialog
        open={createOpen} onOpenChange={setCreateOpen} mode={createMode} serviceId={serviceId}
        eventOptions={eventOptions} actionOptions={actionOptions} moduleOptions={moduleOptions}
        onSaved={() => { setCreateOpen(false); load() }}
      />

      {editAutomation && (
        <AutomationEditDialog
          open={!!editAutomation} onOpenChange={(o) => !o && setEditAutomation(null)}
          automation={editAutomation}
          eventOptions={eventOptions} actionOptions={actionOptions} moduleOptions={moduleOptions}
          onSaved={() => { setEditAutomation(null); load() }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>Automation for <strong>{deleteTarget?.event}</strong> will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{submitting ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AutomationCreateDialog({ open, onOpenChange, mode, serviceId, eventOptions, actionOptions, moduleOptions, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const isProvisioning = mode === "provisioning"
  const isEmail = mode === "email"
  const isWebhook = mode === "webhook"

  useEffect(() => {
    if (open) {
      const firstEvent = Array.isArray(eventOptions) ? (typeof eventOptions[0] === "string" ? eventOptions[0] : eventOptions[0]?.value ?? "") : ""
      if (isProvisioning) setForm({ module: "", config: "{}" })
      else if (isEmail) setForm({ event: firstEvent, emailTemplate: "" })
      else if (isWebhook) setForm({ event: firstEvent, webhookUrl: "" })
      else setForm({ event: firstEvent, action: "", module: "", provisioningKey: "", webhookUrl: "", emailTemplate: "", priority: 0 })
    }
  }, [open, mode, isProvisioning, isEmail, isWebhook, eventOptions])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const eventLabel = (e) => typeof e === "string" ? e : e?.label ?? e?.value ?? String(e)
  const eventValue = (e) => typeof e === "string" ? e : e?.value ?? String(e)

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isProvisioning) {
        if (!form.module?.trim()) { toast.error("Module is required"); setSaving(false); return }
        let config = {}
        try { config = JSON.parse(form.config || "{}") } catch { toast.error("Config must be valid JSON"); setSaving(false); return }
        await AdminServicesAPI.createProvisioningAutomation(serviceId, { module: form.module, config })
      } else if (isEmail) {
        if (!form.emailTemplate?.trim()) { toast.error("Template is required"); setSaving(false); return }
        await AdminServicesAPI.createEmailAutomation(serviceId, { event: form.event, template: form.emailTemplate })
      } else if (isWebhook) {
        if (!form.webhookUrl?.trim()) { toast.error("URL is required"); setSaving(false); return }
        await AdminServicesAPI.createWebhookAutomation(serviceId, { event: form.event, webhookUrl: form.webhookUrl })
      } else {
        if (!form.action?.trim()) { toast.error("Action is required"); setSaving(false); return }
        const payload = { event: form.event, action: form.action, priority: Number(form.priority) || 0 }
        if (form.module) payload.module = form.module
        if (form.provisioningKey) payload.provisioningKey = form.provisioningKey
        if (form.webhookUrl) payload.webhookUrl = form.webhookUrl
        if (form.emailTemplate) payload.emailTemplate = form.emailTemplate
        await AdminServicesAPI.createAutomation(serviceId, payload)
      }
      toast.success("Automation created"); onSaved()
    } catch (err) { toast.error(err.message || "Failed to create automation") }
    finally { setSaving(false) }
  }

  const titles = { provisioning: "Provisioning Automation", email: "Email Automation", webhook: "Webhook Automation", custom: "Custom Automation" }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{titles[mode] ?? "Automation"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {!isProvisioning && (
            <Field label="Event *">
              <Select value={form.event ?? ""} onValueChange={(v) => set("event", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{eventOptions.map((e) => <SelectItem key={eventValue(e)} value={eventValue(e)}>{eventLabel(e)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
          {isProvisioning && (
            <>
              <Field label="Module *" hint="e.g., cpanel">
                {moduleOptions.length > 0 ? (
                  <Select value={form.module || "__none"} onValueChange={(v) => set("module", v === "__none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Select…</SelectItem>
                      {moduleOptions.map((m) => <SelectItem key={typeof m === "string" ? m : m.value} value={typeof m === "string" ? m : m.value}>{typeof m === "string" ? m : m.label ?? m.value}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.module ?? ""} onChange={(e) => set("module", e.target.value)} placeholder="module_name" />
                )}
              </Field>
              <Field label="Config (JSON)">
                <Textarea rows={4} value={form.config ?? "{}"} onChange={(e) => set("config", e.target.value)} className="font-mono text-xs" placeholder="{}" />
              </Field>
            </>
          )}
          {isEmail && <Field label="Email Template *"><Input value={form.emailTemplate ?? ""} onChange={(e) => set("emailTemplate", e.target.value)} placeholder="template_name" /></Field>}
          {isWebhook && <Field label="Webhook URL *"><Input type="url" value={form.webhookUrl ?? ""} onChange={(e) => set("webhookUrl", e.target.value)} placeholder="https://…" /></Field>}
          {mode === "custom" && (
            <>
              <Field label="Action *">
                {actionOptions.length > 0 ? (
                  <Select value={form.action || "__none"} onValueChange={(v) => set("action", v === "__none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Select…</SelectItem>
                      {actionOptions.map((a) => <SelectItem key={typeof a === "string" ? a : a.value} value={typeof a === "string" ? a : a.value}>{typeof a === "string" ? a : a.label ?? a.value}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.action ?? ""} onChange={(e) => set("action", e.target.value)} placeholder="send_email, provision, webhook" />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Module"><Input value={form.module ?? ""} onChange={(e) => set("module", e.target.value)} /></Field>
                <Field label="Priority"><Input type="number" value={form.priority ?? 0} onChange={(e) => set("priority", e.target.value)} /></Field>
              </div>
              <Field label="Webhook URL"><Input type="url" value={form.webhookUrl ?? ""} onChange={(e) => set("webhookUrl", e.target.value)} /></Field>
              <Field label="Email Template"><Input value={form.emailTemplate ?? ""} onChange={(e) => set("emailTemplate", e.target.value)} /></Field>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AutomationEditDialog({ open, onOpenChange, automation, eventOptions, actionOptions, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && automation) {
      setForm({
        event: automation.event ?? "",
        action: automation.action ?? "",
        module: automation.module ?? "",
        provisioningKey: automation.provisioningKey ?? "",
        webhookUrl: automation.webhookUrl ?? "",
        emailTemplate: automation.emailTemplate ?? "",
        priority: automation.priority ?? 0,
        enabled: automation.enabled ?? true,
      })
    }
  }, [open, automation])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const eventValue = (e) => typeof e === "string" ? e : e?.value ?? String(e)
  const eventLabel = (e) => typeof e === "string" ? e : e?.label ?? e?.value ?? String(e)

  const handleSave = async () => {
    if (!form.action?.trim()) { toast.error("Action is required"); return }
    setSaving(true)
    try {
      const payload = {
        event: form.event, action: form.action,
        priority: Number(form.priority) || 0, enabled: form.enabled,
      }
      if (form.module) payload.module = form.module
      if (form.provisioningKey) payload.provisioningKey = form.provisioningKey
      if (form.webhookUrl) payload.webhookUrl = form.webhookUrl
      if (form.emailTemplate) payload.emailTemplate = form.emailTemplate
      await AdminServicesAPI.updateAutomation(automation.id, payload)
      toast.success("Automation updated"); onSaved()
    } catch (err) { toast.error(err.message || "Failed to update automation") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Automation</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Event">
            <Select value={form.event ?? ""} onValueChange={(v) => set("event", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{eventOptions.map((e) => <SelectItem key={eventValue(e)} value={eventValue(e)}>{eventLabel(e)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Action *">
            {actionOptions.length > 0 ? (
              <Select value={form.action || "__none"} onValueChange={(v) => set("action", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select…</SelectItem>
                  {actionOptions.map((a) => <SelectItem key={typeof a === "string" ? a : a.value} value={typeof a === "string" ? a : a.value}>{typeof a === "string" ? a : a.label ?? a.value}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.action ?? ""} onChange={(e) => set("action", e.target.value)} />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Module"><Input value={form.module ?? ""} onChange={(e) => set("module", e.target.value)} /></Field>
            <Field label="Priority"><Input type="number" value={form.priority ?? 0} onChange={(e) => set("priority", e.target.value)} /></Field>
          </div>
          <Field label="Webhook URL"><Input type="url" value={form.webhookUrl ?? ""} onChange={(e) => set("webhookUrl", e.target.value)} /></Field>
          <Field label="Email Template"><Input value={form.emailTemplate ?? ""} onChange={(e) => set("emailTemplate", e.target.value)} /></Field>
          <label className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer">
            <span className="text-sm">Enabled</span>
            <Switch checked={!!form.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM FIELDS TAB
// ─────────────────────────────────────────────────────────────────────────────

function CustomFieldsTab({ serviceId }) {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editField, setEditField] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await AdminServicesAPI.listCustomFields(serviceId)
      setFields(res?.customFields ?? [])
    } catch { toast.error("Failed to load custom fields") }
    finally { setLoading(false) }
  }, [serviceId])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.deleteCustomField(serviceId, deleteTarget.id)
      toast.success("Field deleted")
      setDeleteTarget(null); load()
    } catch { toast.error("Failed to delete field") }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{fields.length} custom field{fields.length !== 1 ? "s" : ""} — collected from clients at order time</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Field</Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FormInput className="h-10 w-10 opacity-30" />
            <p>No custom fields defined</p>
            <p className="text-xs text-center max-w-xs">Custom fields let you collect additional information from clients when they order this service (e.g. domain name, username, preferences).</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add first field</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Field Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Required</TableHead>
                <TableHead className="text-center">Order Form</TableHead>
                <TableHead className="text-center">Invoice</TableHead>
                <TableHead className="text-center">Admin Only</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f, i) => (
                <TableRow key={f.id}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{f.fieldName}</TableCell>
                  <TableCell className="capitalize text-sm text-muted-foreground">
                    {CUSTOM_FIELD_TYPES.find((t) => t.value === f.fieldType)?.label ?? f.fieldType}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{f.description ?? "—"}</TableCell>
                  <TableCell className="text-center">{f.requiredField ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                  <TableCell className="text-center">{f.showOnOrderForm ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                  <TableCell className="text-center">{f.showOnInvoice ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                  <TableCell className="text-center">{f.adminOnly ? <Check className="h-4 w-4 text-orange-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => setEditField(f)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteTarget(f)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CustomFieldFormDialog open={createOpen} onOpenChange={setCreateOpen} serviceId={serviceId} onSaved={() => { setCreateOpen(false); load() }} />
      <CustomFieldFormDialog open={!!editField} onOpenChange={(o) => !o && setEditField(null)} serviceId={serviceId} field={editField} onSaved={() => { setEditField(null); load() }} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field?</AlertDialogTitle>
            <AlertDialogDescription>Remove the <strong>{deleteTarget?.fieldName}</strong> custom field. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{submitting ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CustomFieldFormDialog({ open, onOpenChange, serviceId, field, onSaved }) {
  const isEdit = !!field
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {
        fieldName: field.fieldName ?? "", fieldType: field.fieldType ?? "text",
        description: field.description ?? "", validation: field.validation ?? "",
        selectOptions: field.selectOptions ?? "", displayOrder: field.displayOrder ?? 0,
        adminOnly: field.adminOnly ?? false, requiredField: field.requiredField ?? false,
        showOnOrderForm: field.showOnOrderForm ?? false, showOnInvoice: field.showOnInvoice ?? false,
      } : {
        fieldName: "", fieldType: "text", description: "", validation: "",
        selectOptions: "", displayOrder: 0,
        adminOnly: false, requiredField: false, showOnOrderForm: true, showOnInvoice: false,
      })
    }
  }, [open, field, isEdit])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.fieldName?.trim()) { toast.error("Field name is required"); return }
    setSaving(true)
    try {
      if (isEdit) {
        await AdminServicesAPI.updateCustomField(serviceId, field.id, form)
        toast.success("Field updated")
      } else {
        await AdminServicesAPI.createCustomField(serviceId, form)
        toast.success("Field created")
      }
      onSaved()
    } catch (err) { toast.error(err.message || "Failed to save") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Custom Field" : "Add Custom Field"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Field Name *">
              <Input value={form.fieldName ?? ""} onChange={(e) => set("fieldName", e.target.value)} placeholder="e.g. Domain Name" />
            </Field>
            <Field label="Display Order">
              <Input type="number" min={0} value={form.displayOrder ?? 0} onChange={(e) => set("displayOrder", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Field Type">
            <Select value={form.fieldType ?? "text"} onValueChange={(v) => set("fieldType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CUSTOM_FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Description" hint="Shown to clients as a hint">
            <Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Enter the domain to point to this hosting" />
          </Field>
          <Field label="Validation" hint="Regular expression">
            <Input value={form.validation ?? ""} onChange={(e) => set("validation", e.target.value)} placeholder="e.g. ^[a-z0-9]+$" />
          </Field>
          {["dropdown", "radio"].includes(form.fieldType) && (
            <Field label="Select Options" hint="Comma-separated list">
              <Textarea rows={2} value={form.selectOptions ?? ""} onChange={(e) => set("selectOptions", e.target.value)} placeholder="Option 1,Option 2,Option 3" />
            </Field>
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "adminOnly", label: "Admin Only" },
              { key: "requiredField", label: "Required Field" },
              { key: "showOnOrderForm", label: "Show on Order Form" },
              { key: "showOnInvoice", label: "Show on Invoice" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer">
                <span className="text-sm">{label}</span>
                <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Add Field"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UPGRADES TAB
// ─────────────────────────────────────────────────────────────────────────────

function UpgradesTab({ serviceId }) {
  const [paths, setPaths] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, plRes] = await Promise.all([
        AdminServicesAPI.listUpgradePaths(serviceId),
        AdminServicesAPI.listPlans(serviceId),
      ])
      setPaths(pRes?.upgradePaths ?? [])
      setPlans(unwrap(plRes, "plans"))
    } catch { toast.error("Failed to load upgrade paths") }
    finally { setLoading(false) }
  }, [serviceId])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.deleteUpgradePath(serviceId, deleteTarget.id)
      toast.success("Upgrade path removed")
      setDeleteTarget(null); load()
    } catch { toast.error("Failed to delete") }
    finally { setSubmitting(false) }
  }

  const handleToggleAllowed = async (path) => {
    try {
      await AdminServicesAPI.updateUpgradePath(serviceId, path.id, { allowed: !path.allowed })
      toast.success(`Path ${path.allowed ? "disabled" : "enabled"}`)
      load()
    } catch { toast.error("Failed to update") }
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Define which plans clients can upgrade or downgrade between.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={plans.length < 2}><Plus className="h-4 w-4 mr-1.5" /> Add Path</Button>
      </div>

      {paths.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <ArrowUpDown className="h-10 w-10 opacity-30" />
            <p>No upgrade paths configured</p>
            <p className="text-xs text-center max-w-xs">Upgrade paths define which plans clients can move between. Without paths, no upgrades or downgrades are available.</p>
            {plans.length >= 2 && <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add first path</Button>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From Plan</TableHead>
                <TableHead className="text-center">→</TableHead>
                <TableHead>To Plan</TableHead>
                <TableHead className="text-center">Prorated</TableHead>
                <TableHead className="text-center">Credit Unused</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paths.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.fromPlan?.name ?? "—"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">→</TableCell>
                  <TableCell className="font-medium">{p.toPlan?.name ?? "—"}</TableCell>
                  <TableCell className="text-center">{p.prorated ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                  <TableCell className="text-center">{p.creditUnused ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.allowed ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggleAllowed(p)}>
                      {p.allowed ? "Allowed" : "Blocked"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <UpgradePathFormDialog open={createOpen} onOpenChange={setCreateOpen} serviceId={serviceId} plans={plans} existingPaths={paths} onSaved={() => { setCreateOpen(false); load() }} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove upgrade path?</AlertDialogTitle>
            <AlertDialogDescription>Remove the path from <strong>{deleteTarget?.fromPlan?.name}</strong> to <strong>{deleteTarget?.toPlan?.name}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{submitting ? "Removing…" : "Remove"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function UpgradePathFormDialog({ open, onOpenChange, serviceId, plans, existingPaths, onSaved }) {
  const [form, setForm] = useState({ fromPlanId: "", toPlanId: "", prorated: true, creditUnused: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ fromPlanId: "", toPlanId: "", prorated: true, creditUnused: true })
  }, [open])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.fromPlanId || !form.toPlanId) { toast.error("Both plans are required"); return }
    if (form.fromPlanId === form.toPlanId) { toast.error("From and To plans must be different"); return }
    setSaving(true)
    try {
      await AdminServicesAPI.createUpgradePath(serviceId, form)
      toast.success("Upgrade path created")
      onSaved()
    } catch (err) { toast.error(err.message || "Failed to create path") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Upgrade Path</DialogTitle><DialogDescription>Define a valid upgrade or downgrade path between plans.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="From Plan *">
            <Select value={form.fromPlanId} onValueChange={(v) => set("fromPlanId", v)}>
              <SelectTrigger><SelectValue placeholder="Select plan…" /></SelectTrigger>
              <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="To Plan *">
            <Select value={form.toPlanId} onValueChange={(v) => set("toPlanId", v)}>
              <SelectTrigger><SelectValue placeholder="Select plan…" /></SelectTrigger>
              <SelectContent>{plans.filter((p) => p.id !== form.fromPlanId).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {[{ key: "prorated", label: "Prorated" }, { key: "creditUnused", label: "Credit Unused Time" }].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer">
                <span className="text-sm">{label}</span>
                <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Create Path"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-SELLS TAB
// ─────────────────────────────────────────────────────────────────────────────

function CrossSellsTab({ serviceId }) {
  const [crossSells, setCrossSells] = useState([])
  const [allServices, setAllServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [removeTarget, setRemoveTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [csRes, sRes] = await Promise.all([
        AdminServicesAPI.listCrossSells(serviceId),
        AdminServicesAPI.listServices(),
      ])
      setCrossSells(csRes?.crossSells ?? [])
      const all = Array.isArray(sRes) ? sRes : (sRes?.services ?? [])
      setAllServices(all.filter((s) => s.id !== serviceId && s.active))
    } catch { toast.error("Failed to load cross-sells") }
    finally { setLoading(false) }
  }, [serviceId])

  useEffect(() => { load() }, [load])

  const crossSellIds = new Set(crossSells.map((c) => c.crossSellServiceId))

  const handleAdd = async (targetServiceId) => {
    try {
      await AdminServicesAPI.addCrossSell(serviceId, targetServiceId)
      toast.success("Cross-sell added")
      load()
    } catch (err) { toast.error(err.message || "Failed to add") }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.removeCrossSell(serviceId, removeTarget.crossSellServiceId)
      toast.success("Cross-sell removed")
      setRemoveTarget(null); load()
    } catch { toast.error("Failed to remove") }
    finally { setSubmitting(false) }
  }

  const filtered = allServices.filter((s) =>
    !crossSellIds.has(s.id) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Cross-sells are products recommended to clients when they order this service.</p>

      {/* Current cross-sells */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current Cross-sells ({crossSells.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {crossSells.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No cross-sells configured yet.</p>
          ) : (
            <div className="space-y-2">
              {crossSells.map((cs) => (
                <div key={cs.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{cs.crossSellService?.name ?? cs.crossSellServiceId}</p>
                    {cs.crossSellService?.shortDescription && (
                      <p className="text-xs text-muted-foreground">{cs.crossSellService.shortDescription}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setRemoveTarget(cs)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add cross-sells */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add Cross-sell</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{search ? "No matching services found" : "All services are already added"}</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {filtered.slice(0, 20).map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.code}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleAdd(s.id)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove cross-sell?</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>{removeTarget?.crossSellService?.name}</strong> from cross-sell recommendations.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{submitting ? "Removing…" : "Remove"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
