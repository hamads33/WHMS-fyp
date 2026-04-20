"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  ChevronLeft, ChevronUp, ChevronDown, Plus, RefreshCcw,
  MoreHorizontal, Pencil, Trash2, Eye, EyeOff, FolderOpen,
  BarChart3, Archive, CheckCircle, Layers, Hash, Activity, X,
} from "lucide-react"
import { AdminServicesAPI } from "@/lib/api/services"
import { toast } from "sonner"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap(res, key) {
  return res?.[key] ?? (Array.isArray(res) ? res : [])
}

function StatusBadge({ active, hidden }) {
  if (active === false)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        Inactive
      </span>
    )
  if (hidden)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Hidden
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function GroupAvatar({ icon, name, active }) {
  const letter = name?.[0]?.toUpperCase() ?? "G"
  const isEmoji = icon && /\p{Emoji}/u.test(icon)
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border
      ${active === false
        ? "bg-muted text-muted-foreground border-border"
        : "bg-muted text-foreground border-border"
      }`}>
      {isEmoji ? icon : (icon ? <span className="text-sm font-semibold">{icon.slice(0, 2).toUpperCase()}</span> : <span className="text-sm font-semibold">{letter}</span>)}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ServiceGroupsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupStats, setGroupStats] = useState({})
  const [createOpen, setCreateOpen] = useState(false)
  const [editGroup, setEditGroup] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [activateTarget, setActivateTarget] = useState(null)
  const [statsTarget, setStatsTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false)
  const [bulkActivateOpen, setBulkActivateOpen] = useState(false)
  const [bulkHideOpen, setBulkHideOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setSelectedIds(new Set())
    try {
      const res = await AdminServicesAPI.listGroups()
      setGroups(unwrap(res, "groups"))
    } catch {
      toast.error("Failed to load groups")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Single handlers ────────────────────────────────────────────────────────

  const handleToggleVisibility = async (group) => {
    try {
      await AdminServicesAPI.toggleGroupVisibility(group.id)
      toast.success(`Group ${group.hidden ? "shown" : "hidden"}`)
      load()
    } catch {
      toast.error("Failed to update visibility")
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.updateGroup(deactivateTarget.id, { active: false })
      toast.success("Group deactivated")
      setDeactivateTarget(null)
      load()
    } catch (err) {
      toast.error(err.message || "Failed to deactivate group")
    } finally { setSubmitting(false) }
  }

  const handleActivate = async () => {
    if (!activateTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.updateGroup(activateTarget.id, { active: true })
      toast.success("Group activated")
      setActivateTarget(null)
      load()
    } catch (err) {
      toast.error(err.message || "Failed to activate group")
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await AdminServicesAPI.deleteGroup(deleteTarget.id)
      toast.success("Group deleted")
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message || "Failed to delete group")
    } finally { setSubmitting(false) }
  }

  const handleReorder = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= groups.length) return
    const newGroups = [...groups]
    ;[newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]]
    setGroups(newGroups)
    try {
      await AdminServicesAPI.reorderGroups(newGroups.map((g) => g.id))
    } catch {
      toast.error("Failed to save order")
      load()
    }
  }

  // ── Selection helpers ──────────────────────────────────────────────────────

  const allSelected = groups.length > 0 && groups.every((g) => selectedIds.has(g.id))
  const someSelected = groups.some((g) => selectedIds.has(g.id))
  const selectedList = [...selectedIds]
  const allSelectedInactive = selectedList.length > 0 && selectedList.every(
    (id) => groups.find((g) => g.id === id)?.active === false
  )
  const allSelectedHidden = selectedList.length > 0 && selectedList.every(
    (id) => groups.find((g) => g.id === id)?.hidden === true
  )

  const toggleSelect = (id) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(groups.map((g) => g.id)))

  // ── Bulk handlers ──────────────────────────────────────────────────────────

  const handleBulkActivate = async () => {
    setBulkSubmitting(true)
    try {
      await AdminServicesAPI.bulkUpdateGroups(selectedList, { active: true })
      toast.success(`${selectedList.length} group(s) activated`)
      setBulkActivateOpen(false)
      load()
    } catch { toast.error("Bulk activate failed") }
    finally { setBulkSubmitting(false) }
  }

  const handleBulkDeactivate = async () => {
    setBulkSubmitting(true)
    try {
      await AdminServicesAPI.bulkUpdateGroups(selectedList, { active: false })
      toast.success(`${selectedList.length} group(s) deactivated`)
      setBulkDeactivateOpen(false)
      load()
    } catch { toast.error("Bulk deactivate failed") }
    finally { setBulkSubmitting(false) }
  }

  const handleBulkHide = async () => {
    setBulkSubmitting(true)
    const hidden = !allSelectedHidden
    try {
      await AdminServicesAPI.bulkUpdateGroups(selectedList, { hidden })
      toast.success(`${selectedList.length} group(s) ${hidden ? "hidden" : "unhidden"}`)
      setBulkHideOpen(false)
      load()
    } catch { toast.error("Bulk hide failed") }
    finally { setBulkSubmitting(false) }
  }

  const handleBulkDelete = async () => {
    setBulkSubmitting(true)
    try {
      await AdminServicesAPI.bulkDeleteGroups(selectedList)
      toast.success(`${selectedList.length} group(s) permanently deleted`)
      setBulkDeleteOpen(false)
      load()
    } catch (err) { toast.error(err.message || "Bulk delete failed") }
    finally { setBulkSubmitting(false) }
  }

  const loadStats = async (group) => {
    if (groupStats[group.id]) { setStatsTarget({ group, stats: groupStats[group.id] }); return }
    try {
      const res = await AdminServicesAPI.getGroupStats(group.id)
      const stats = res?.stats ?? res
      setGroupStats((prev) => ({ ...prev, [group.id]: stats }))
      setStatsTarget({ group, stats })
    } catch { toast.error("Failed to load stats") }
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalActive = groups.filter((g) => g.active !== false && !g.hidden).length
  const totalHidden = groups.filter((g) => g.hidden).length
  const totalInactive = groups.filter((g) => g.active === false).length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/services"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Services
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Service Groups</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize services into catalog categories</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Group
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: groups.length, icon: Hash },
          { label: "Active", value: totalActive, icon: Activity },
          { label: "Hidden", value: totalHidden, icon: EyeOff },
          { label: "Inactive", value: totalInactive, icon: Archive },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-7 w-8" /> : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Bulk action bar ── */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-lg border bg-muted/40">
          <span className="text-sm font-medium">{selectedList.length} selected</span>
          <Separator orientation="vertical" className="h-4" />
          {allSelectedInactive ? (
            <Button size="sm" variant="outline"
              className="h-7 gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => setBulkActivateOpen(true)} disabled={bulkSubmitting}>
              <CheckCircle className="h-3.5 w-3.5" /> Activate
            </Button>
          ) : (
            <Button size="sm" variant="outline"
              className="h-7 gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
              onClick={() => setBulkDeactivateOpen(true)} disabled={bulkSubmitting}>
              <Archive className="h-3.5 w-3.5" /> Deactivate
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 gap-1.5"
            onClick={() => setBulkHideOpen(true)} disabled={bulkSubmitting}>
            {allSelectedHidden
              ? <><Eye className="h-3.5 w-3.5" /> Unhide</>
              : <><EyeOff className="h-3.5 w-3.5" /> Hide</>}
          </Button>
          <Button size="sm" variant="outline"
            className="h-7 gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
            onClick={() => setBulkDeleteOpen(true)} disabled={bulkSubmitting}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1"
            onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      )}

      {/* ── Table card ── */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="pb-0 px-6 pt-5 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            {loading ? <Skeleton className="h-5 w-24" /> : `${groups.length} group${groups.length !== 1 ? "s" : ""}`}
          </CardTitle>
          {!loading && groups.length > 0 && (
            <span className="text-xs text-muted-foreground">Drag ↑↓ to reorder</span>
          )}
        </CardHeader>
        <CardContent className="px-0 pt-3 pb-0">
          {loading ? (
            <div className="space-y-0 divide-y">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <FolderOpen className="h-8 w-8 opacity-50" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">No groups yet</p>
                <p className="text-sm mt-0.5">Create your first group to organize services</p>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="mt-1">
                <Plus className="h-4 w-4 mr-2" /> Create first group
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 pl-6">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead className="w-20 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Order</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Group</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Services</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</TableHead>
                  <TableHead className="w-12 pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group, index) => (
                  <TableRow
                    key={group.id}
                    className={`group border-b last:border-0 transition-colors
                      ${selectedIds.has(group.id) ? "bg-violet-50 hover:bg-violet-50" : "hover:bg-muted/30"}`}
                  >
                    <TableCell className="pl-6">
                      <Checkbox
                        checked={selectedIds.has(group.id)}
                        onCheckedChange={() => toggleSelect(group.id)}
                        aria-label={`Select ${group.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleReorder(index, "up")} disabled={index === 0}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleReorder(index, "down")} disabled={index === groups.length - 1}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <GroupAvatar icon={group.icon} name={group.name} active={group.active} />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{group.name}</p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-52">{group.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {group.services?.length ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={group.active} hidden={group.hidden} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setEditGroup(group)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" /> Edit group
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => loadStats(group)}>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" /> View stats
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleToggleVisibility(group)}>
                            {group.hidden
                              ? <><Eye className="h-4 w-4 text-muted-foreground" /> Show in catalog</>
                              : <><EyeOff className="h-4 w-4 text-muted-foreground" /> Hide from catalog</>}
                          </DropdownMenuItem>
                          {group.active !== false ? (
                            <DropdownMenuItem className="gap-2 cursor-pointer text-orange-600 focus:text-orange-600"
                              onClick={() => setDeactivateTarget(group)}>
                              <Archive className="h-4 w-4" /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-600"
                              onClick={() => setActivateTarget(group)}>
                              <CheckCircle className="h-4 w-4" /> Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(group)}>
                            <Trash2 className="h-4 w-4" /> Delete permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}
      <GroupFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => { setCreateOpen(false); load() }}
      />
      <GroupFormDialog
        open={!!editGroup}
        onOpenChange={(o) => !o && setEditGroup(null)}
        group={editGroup}
        onSaved={() => { setEditGroup(null); load() }}
      />

      {/* Stats dialog */}
      <Dialog open={!!statsTarget} onOpenChange={(o) => !o && setStatsTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <GroupAvatar icon={statsTarget?.group?.icon} name={statsTarget?.group?.name} active={statsTarget?.group?.active} />
              <div>
                <DialogTitle className="text-base">{statsTarget?.group?.name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Group statistics</p>
              </div>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {statsTarget?.stats ? (
              Object.entries(statsTarget.stats)
                .filter(([k]) => k !== "groupId")
                .map(([k, v]) => (
                  <div key={k} className="rounded-xl border bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground capitalize mb-1">
                      {k.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{String(v)}</p>
                  </div>
                ))
            ) : (
              <div className="col-span-2 text-center py-6 text-muted-foreground text-sm">No stats available</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation dialogs ── */}
      <ConfirmDialog
        open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}
        title="Deactivate group?"
        description={<>
          <strong>{deactivateTarget?.name}</strong> will be set to inactive and hidden from clients.
          Services in this group are not affected. You can reactivate it any time.
        </>}
        actionLabel="Deactivate"
        actionClass="bg-orange-600 hover:bg-orange-700 text-white"
        onAction={handleDeactivate}
        loading={submitting}
      />
      <ConfirmDialog
        open={!!activateTarget} onOpenChange={(o) => !o && setActivateTarget(null)}
        title="Activate group?"
        description={<><strong>{activateTarget?.name}</strong> will be set to active and visible to clients.</>}
        actionLabel="Activate"
        actionClass="bg-emerald-600 hover:bg-emerald-700 text-white"
        onAction={handleActivate}
        loading={submitting}
      />
      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Permanently delete group?"
        description={<>
          <strong>{deleteTarget?.name}</strong> will be <strong>permanently removed</strong>.
          Services in this group will become ungrouped. <strong>This cannot be undone.</strong>
        </>}
        actionLabel="Delete Permanently"
        actionClass="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        onAction={handleDelete}
        loading={submitting}
        danger
      />

      {/* ── Bulk confirm dialogs ── */}
      <ConfirmDialog
        open={bulkActivateOpen} onOpenChange={setBulkActivateOpen}
        title={`Activate ${selectedList.length} group(s)?`}
        description="The selected groups will be set to active and visible to clients."
        actionLabel={`Activate ${selectedList.length}`}
        actionClass="bg-emerald-600 hover:bg-emerald-700 text-white"
        onAction={handleBulkActivate}
        loading={bulkSubmitting}
      />
      <ConfirmDialog
        open={bulkDeactivateOpen} onOpenChange={setBulkDeactivateOpen}
        title={`Deactivate ${selectedList.length} group(s)?`}
        description="The selected groups will be set to inactive and hidden from clients. This can be undone."
        actionLabel={`Deactivate ${selectedList.length}`}
        actionClass="bg-orange-600 hover:bg-orange-700 text-white"
        onAction={handleBulkDeactivate}
        loading={bulkSubmitting}
      />
      <ConfirmDialog
        open={bulkHideOpen} onOpenChange={setBulkHideOpen}
        title={`${allSelectedHidden ? "Unhide" : "Hide"} ${selectedList.length} group(s)?`}
        description={allSelectedHidden
          ? "The selected groups will be made visible in the client catalog."
          : "The selected groups will be hidden from the client catalog. Services inside them remain unchanged."}
        actionLabel={`${allSelectedHidden ? "Unhide" : "Hide"} ${selectedList.length}`}
        actionClass={allSelectedHidden ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-700 hover:bg-slate-800 text-white"}
        onAction={handleBulkHide}
        loading={bulkSubmitting}
      />
      <ConfirmDialog
        open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}
        title={`Permanently delete ${selectedList.length} group(s)?`}
        description={<>All selected groups will be <strong>permanently removed</strong>. Services inside them will become ungrouped. <strong>This cannot be undone.</strong></>}
        actionLabel={`Delete ${selectedList.length} permanently`}
        actionClass="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        onAction={handleBulkDelete}
        loading={bulkSubmitting}
        danger
      />
    </div>
  )
}

// ─── Reusable confirm dialog ──────────────────────────────────────────────────

function ConfirmDialog({ open, onOpenChange, title, description, actionLabel, actionClass, onAction, loading, danger }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        {danger && (
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-2">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
        )}
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2 mt-2">
          <AlertDialogCancel disabled={loading} className="min-w-24">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onAction}
            disabled={loading}
            className={`min-w-24 ${actionClass}`}
          >
            {loading ? "Please wait…" : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Group Form Dialog ────────────────────────────────────────────────────────

function GroupFormDialog({ open, onOpenChange, group, onSaved }) {
  const isEdit = !!group
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {
        name: group.name ?? "",
        description: group.description ?? "",
        icon: group.icon ?? "",
        position: group.position ?? "",
        active: group.active ?? true,
        hidden: group.hidden ?? false,
      } : { name: "", description: "", icon: "", position: "" })
    }
  }, [open, group, isEdit])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.description) delete payload.description
      if (!payload.icon) delete payload.icon
      if (payload.position === "") delete payload.position
      else if (payload.position !== "") payload.position = Number(payload.position)
      if (isEdit) {
        await AdminServicesAPI.updateGroup(group.id, payload)
        toast.success("Group updated")
      } else {
        await AdminServicesAPI.createGroup(payload)
        toast.success("Group created")
      }
      onSaved()
    } catch (err) {
      toast.error(err.message || "Failed to save group")
    } finally { setSaving(false) }
  }

  const isEmoji = form.icon && /\p{Emoji}/u.test(form.icon)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-muted border flex items-center justify-center">
              {isEmoji
                ? <span className="text-xl">{form.icon}</span>
                : <FolderOpen className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <DialogTitle>{isEdit ? "Edit Group" : "Create Group"}</DialogTitle>
              <DialogDescription className="text-xs mt-0">
                {isEdit ? `Editing ${group?.name}` : "Add a new catalog category"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <Field label="Name *">
            <Input
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              maxLength={255}
              placeholder="e.g., Web Hosting"
              className="focus-visible:ring-violet-500"
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              maxLength={500}
              placeholder="Optional description shown in catalog"
              className="resize-none focus-visible:ring-violet-500"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Icon" hint="emoji or short text">
              <Input
                value={form.icon ?? ""}
                onChange={(e) => set("icon", e.target.value)}
                maxLength={100}
                placeholder="🌐"
                className="focus-visible:ring-violet-500"
              />
            </Field>
            <Field label="Position" hint="lower = first">
              <Input
                type="number"
                min={0}
                value={form.position ?? ""}
                onChange={(e) => set("position", e.target.value)}
                placeholder="Auto"
                className="focus-visible:ring-violet-500"
              />
            </Field>
          </div>

          {isEdit && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                {[{ key: "active", label: "Active", desc: "Visible to clients" }, { key: "hidden", label: "Hidden", desc: "Hidden in catalog" }].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center justify-between rounded-xl border px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={!!form[key]}
                      onCheckedChange={(v) => set(key, v)}
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
