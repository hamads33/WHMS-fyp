"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus, Search, RefreshCcw, MoreHorizontal, Pencil,
  Trash2, Archive, CheckCircle, Eye, EyeOff, ExternalLink,
  Package, FolderOpen, Download, Upload, Settings2, Radio,
} from "lucide-react"
import { AdminServicesAPI } from "@/lib/api/services"
import { toast } from "sonner"
import { usePermissions } from "@/hooks/usePermissions"

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Backend returns plain arrays for both endpoints
function toArray(res) {
  return Array.isArray(res) ? res : (res?.services ?? res?.groups ?? [])
}

function statusBadge(active, hidden) {
  if (!active)
    return <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Inactive</Badge>
  if (hidden)
    return <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border">Hidden</Badge>
  return <Badge variant="outline" className="text-xs font-normal text-foreground border-border">Active</Badge>
}

function lowestPrice(service) {
  const prices = (service.plans ?? [])
    .flatMap((p) => (p.pricing ?? []).map((pr) => parseFloat(pr.price || 0)))
    .filter((n) => !isNaN(n) && n > 0)
  if (!prices.length) return null
  return Math.min(...prices)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminServicesPage() {
  const { canManageServices } = usePermissions()

  const [tab, setTab] = useState("products")
  const [services, setServices] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [groupFilter, setGroupFilter] = useState("all")

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  // Confirm dialogs
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [activateTarget, setActivateTarget] = useState(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null)
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false)
  const [bulkActivateOpen, setBulkActivateOpen] = useState(false)
  const [bulkHardDeleteOpen, setBulkHardDeleteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    setSelectedIds(new Set())
    try {
      const [sRes, gRes] = await Promise.all([
        AdminServicesAPI.listServices(),
        AdminServicesAPI.listGroups(),
      ])
      setServices(toArray(sRes))
      setGroups(toArray(gRes))
    } catch {
      toast.error("Failed to load services")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = services.filter((s) => {
    const q = search.toLowerCase()
    if (q && !s.name.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q)) return false
    if (statusFilter === "active" && (!s.active || s.hidden)) return false
    if (statusFilter === "inactive" && s.active) return false
    if (statusFilter === "hidden" && !s.hidden) return false
    if (groupFilter === "ungrouped" && s.groupId) return false
    if (groupFilter !== "all" && groupFilter !== "ungrouped" && s.groupId !== groupFilter) return false
    return true
  })

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    total: services.length,
    active: services.filter((s) => s.active && !s.hidden).length,
    inactive: services.filter((s) => !s.active).length,
    hidden: services.filter((s) => s.hidden).length,
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  const selectedList = [...selectedIds]
  const someSelected = selectedList.length > 0
  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id))
  const allSelectedInactive = someSelected && selectedList.every(
    (id) => services.find((s) => s.id === id)?.active === false
  )

  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map((s) => s.id)))
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleToggleVisibility = async (service) => {
    try {
      await AdminServicesAPI.toggleServiceVisibility(service.id)
      toast.success(`Service ${service.hidden ? "shown" : "hidden"}`)
      loadData()
    } catch { toast.error("Failed to update visibility") }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.deleteService(deactivateTarget.id)
      toast.success("Service deactivated")
      setDeactivateTarget(null)
      loadData()
    } catch { toast.error("Failed to deactivate") } finally { setSubmitting(false) }
  }

  const handleActivate = async () => {
    if (!activateTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.updateService(activateTarget.id, { active: true })
      toast.success("Service activated")
      setActivateTarget(null)
      loadData()
    } catch { toast.error("Failed to activate") } finally { setSubmitting(false) }
  }

  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.hardDeleteService(hardDeleteTarget.id)
      toast.success("Service permanently deleted")
      setHardDeleteTarget(null)
      loadData()
    } catch { toast.error("Failed to delete") } finally { setSubmitting(false) }
  }

  const handleBulkDeactivate = async () => {
    setBulkSubmitting(true)
    try {
      await AdminServicesAPI.bulkUpdateServices(selectedList, { active: false })
      toast.success(`${selectedList.length} service(s) deactivated`)
      setSelectedIds(new Set())
      setBulkDeactivateOpen(false)
      loadData()
    } catch { toast.error("Bulk deactivate failed") } finally { setBulkSubmitting(false) }
  }

  const handleBulkActivate = async () => {
    setBulkSubmitting(true)
    try {
      await AdminServicesAPI.bulkUpdateServices(selectedList, { active: true })
      toast.success(`${selectedList.length} service(s) activated`)
      setSelectedIds(new Set())
      setBulkActivateOpen(false)
      loadData()
    } catch { toast.error("Bulk activate failed") } finally { setBulkSubmitting(false) }
  }

  const handleBulkHardDelete = async () => {
    setBulkSubmitting(true)
    try {
      await AdminServicesAPI.bulkHardDeleteServices(selectedList)
      toast.success(`${selectedList.length} service(s) deleted`)
      setSelectedIds(new Set())
      setBulkHardDeleteOpen(false)
      loadData()
    } catch { toast.error("Bulk delete failed") } finally { setBulkSubmitting(false) }
  }

  const handleExport = async () => {
    try {
      const data = await AdminServicesAPI.exportServices()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `services-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Export downloaded")
    } catch { toast.error("Export failed") }
  }

  // ── Grouped rows for WHMCS-style table ────────────────────────────────────

  const groupedRows = (() => {
    const rows = []
    const servicesInGroups = new Set()

    // Groups that have matching services
    for (const g of groups) {
      const members = filtered.filter((s) => s.groupId === g.id)
      if (!members.length) continue
      rows.push({ type: "header", group: g })
      members.forEach((s) => { rows.push({ type: "service", service: s }); servicesInGroups.add(s.id) })
    }

    // Ungrouped
    const ungrouped = filtered.filter((s) => !servicesInGroups.has(s.id))
    if (ungrouped.length) {
      rows.push({ type: "header", group: { id: null, name: "Ungrouped", icon: null } })
      ungrouped.forEach((s) => rows.push({ type: "service", service: s }))
    }

    return rows
  })()

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl border border-border bg-primary flex items-center justify-center shadow-sm shrink-0">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Products &amp; Services</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-border bg-secondary text-foreground">
                <Radio className="h-2.5 w-2.5" /> {stats.active} active
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.total} product{stats.total !== 1 ? "s" : ""}
              {stats.inactive > 0 && ` · ${stats.inactive} inactive`}
              {stats.hidden > 0 && ` · ${stats.hidden} hidden`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-border bg-card shadow-sm shrink-0">
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading} className="gap-1.5 h-8 text-xs">
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canManageServices && (
            <>
              <div className="h-5 w-px bg-border" />
              <Button asChild size="sm" className="gap-1.5 h-8 text-xs rounded-lg">
                <Link href="/admin/services/new">
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="groups">Product Groups</TabsTrigger>
          <TabsTrigger value="batch">Import / Export</TabsTrigger>
        </TabsList>

        {/* ══ Products tab ══════════════════════════════════════════════════ */}
        <TabsContent value="products" className="space-y-4 mt-4">

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                <SelectItem value="ungrouped">Ungrouped</SelectItem>
                {groups.length > 0 && <Separator className="my-1" />}
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk action bar */}
          {someSelected && canManageServices && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border border-border rounded-xl">
              <span className="text-xs font-semibold text-foreground">{selectedList.length} selected</span>
              <div className="h-4 w-px bg-border" />
              {allSelectedInactive ? (
                <Button size="sm" variant="outline" onClick={() => setBulkActivateOpen(true)} disabled={bulkSubmitting} className="h-7 text-xs gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" /> Activate
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setBulkDeactivateOpen(true)} disabled={bulkSubmitting} className="h-7 text-xs gap-1.5">
                  <Archive className="h-3.5 w-3.5" /> Deactivate
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setBulkHardDeleteOpen(true)} disabled={bulkSubmitting} className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto text-xs h-7" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {/* Table */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      disabled={loading || filtered.length === 0}
                    />
                  </TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Plans</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8} className="py-3 px-4">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : groupedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Package className="h-10 w-10 opacity-25" />
                        <p className="text-sm">
                          {search || statusFilter !== "all" || groupFilter !== "all"
                            ? "No products match your filters"
                            : "No products yet"}
                        </p>
                        {!search && statusFilter === "all" && groupFilter === "all" && canManageServices && (
                          <Button size="sm" asChild>
                            <Link href="/admin/services/new">
                              <Plus className="h-4 w-4 mr-1" /> Add first product
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedRows.map((row, idx) => {
                    if (row.type === "header") {
                      const g = row.group
                      const count = filtered.filter((s) =>
                        g.id ? s.groupId === g.id : !s.groupId
                      ).length
                      return (
                        <TableRow key={`hdr-${g.id ?? "ungrouped"}`}
                          className="bg-muted/50 hover:bg-muted/50 border-t-2 border-border">
                          <TableCell colSpan={8} className="py-2 pl-4">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-semibold">{g.name}</span>
                              <Badge variant="outline" className="text-xs px-1.5 py-0 ml-1">
                                {count}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    const s = row.service
                    const low = lowestPrice(s)
                    return (
                      <TableRow key={s.id} className={selectedIds.has(s.id) ? "bg-primary/5" : ""}>
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={selectedIds.has(s.id)}
                            onCheckedChange={() => toggleSelect(s.id)}
                            aria-label={`Select ${s.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/services/${s.id}`}
                            className="font-medium text-sm hover:underline hover:text-primary"
                          >
                            {s.name}
                          </Link>
                          {s.tagline && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                              {s.tagline}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {s.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground capitalize">
                            {s.moduleType || s.paymentType || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {s.plans?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {low != null ? `$${low.toFixed(2)}/mo` : "—"}
                        </TableCell>
                        <TableCell>{statusBadge(s.active, s.hidden)}</TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" asChild>
                              <Link href={`/admin/services/${s.id}`}>
                                <Settings2 className="h-3.5 w-3.5 mr-1" /> Edit
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/services/${s.id}`} className="flex items-center gap-2">
                                    <ExternalLink className="h-3.5 w-3.5" /> View / Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => handleToggleVisibility(s)}
                                >
                                  {s.hidden
                                    ? <><Eye className="h-3.5 w-3.5" /> Show in store</>
                                    : <><EyeOff className="h-3.5 w-3.5" /> Hide from store</>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {s.active ? (
                                  <DropdownMenuItem
                                    className="gap-2 text-muted-foreground focus:text-foreground"
                                    onClick={() => setDeactivateTarget(s)}
                                  >
                                    <Archive className="h-3.5 w-3.5" /> Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => setActivateTarget(s)}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" /> Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => setHardDeleteTarget(s)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ Groups tab ════════════════════════════════════════════════════ */}
        <TabsContent value="groups" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {groups.length} group{groups.length !== 1 ? "s" : ""} — organize products for your store
            </p>
            <Button variant="outline" asChild>
              <Link href="/admin/services/groups">
                <FolderOpen className="h-4 w-4 mr-2" /> Manage Groups
              </Link>
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Group Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="py-3 px-4">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      No groups configured.{" "}
                      <Link href="/admin/services/groups" className="underline">
                        Create one
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((g) => {
                    const count = services.filter((s) => s.groupId === g.id).length
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="pl-4 font-medium text-sm">{g.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {g.slug}
                          </code>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{count}</TableCell>
                        <TableCell>
                          {g.active !== false
                            ? <Badge variant="outline" className="text-xs text-foreground border-border">Active</Badge>
                            : <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <Link href="/admin/services/groups">
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ Import / Export tab ═══════════════════════════════════════════ */}
        <TabsContent value="batch" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" /> Export Products
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Download all products, plans, and pricing as a JSON backup.
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleExport}
                  disabled={services.length === 0}
                >
                  Export {services.length} product{services.length !== 1 ? "s" : ""}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Import Products
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Import products from a JSON file exported from this or another instance.
                </p>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/admin/services/import">
                    Go to Import
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Confirm dialogs ──────────────────────────────────────────────── */}

      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate product?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deactivateTarget?.name}</strong> will be set to inactive. Existing orders are not affected. You can re-activate it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700">
              {submitting ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!activateTarget} onOpenChange={(o) => !o && setActivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate product?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{activateTarget?.name}</strong> will be set to active and available for new orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} disabled={submitting}>
              {submitting ? "Activating…" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!hardDeleteTarget} onOpenChange={(o) => !o && setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{hardDeleteTarget?.name}</strong> and all its plans, pricing, features, and configuration will be permanently removed. <strong>This cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHardDelete} disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeactivateOpen} onOpenChange={setBulkDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {selectedList.length} product(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected products will be set to inactive. Existing orders are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeactivate} disabled={bulkSubmitting}
              className="bg-amber-600 hover:bg-amber-700">
              {bulkSubmitting ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkActivateOpen} onOpenChange={setBulkActivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate {selectedList.length} product(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected products will be set to active and available for new orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkActivate} disabled={bulkSubmitting}>
              {bulkSubmitting ? "Activating…" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkHardDeleteOpen} onOpenChange={setBulkHardDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedList.length} product(s) permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              All selected products and their plans, pricing, and configuration will be permanently removed. <strong>This cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkHardDelete} disabled={bulkSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkSubmitting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
