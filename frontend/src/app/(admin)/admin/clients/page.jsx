"use client"

import { useEffect, useState, useCallback } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import { apiFetch } from "@/lib/api/client"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Users, UserCheck, UserX, ShieldAlert, RefreshCcw, Search,
  MoreHorizontal, Eye, UserMinus, UserPlus, LogOut, KeyRound,
  MonitorSmartphone, Building2, Phone, MapPin, Mail, AlertCircle,
  CheckCircle2, Plus, Package, Radio, AlertTriangle,
} from "lucide-react"
import { StatusBadge } from "@/components/portal/status-badge"

const ClientsAPI = {
  stats: () => apiFetch("/admin/clients/stats"),
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return apiFetch(`/admin/clients${q ? `?${q}` : ""}`)
  },
  get: (id) => apiFetch(`/admin/clients/${id}`),
  create: (body) => apiFetch("/admin/clients", { method: "POST", body: JSON.stringify(body) }),
  updateProfile: (id, body) => apiFetch(`/admin/clients/${id}/profile`, { method: "PUT", body: JSON.stringify(body) }),
  activate: (id) => apiFetch(`/admin/clients/${id}/activate`, { method: "POST" }),
  deactivate: (id, reason) => apiFetch(`/admin/clients/${id}/deactivate`, { method: "POST", body: JSON.stringify({ reason }) }),
  forceLogout: (id) => apiFetch(`/admin/clients/${id}/logout`, { method: "POST" }),
  resetPassword: (id) => apiFetch(`/admin/clients/${id}/reset-password`, { method: "POST" }),
  impersonate: (id, reason) => apiFetch(`/admin/clients/${id}/impersonate`, { method: "POST", body: JSON.stringify({ reason }) }),
}

// ============================================================

export default function AdminClientsPage() {
  const perms = usePermissions()

  const [clients, setClients] = useState([])
  const [stats, setStats] = useState(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const LIMIT = 20

  const [detailClient, setDetailClient] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [showImpersonate, setShowImpersonate] = useState(false)
  const [impersonateTarget, setImpersonateTarget] = useState(null)
  const [showConfirmLogout, setShowConfirmLogout] = useState(false)
  const [logoutTarget, setLogoutTarget] = useState(null)

  const [actionLoading, setActionLoading] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit: LIMIT }
      if (search) params.q = search
      if (statusFilter !== "all") params.status = statusFilter

      const [listRes, statsRes] = await Promise.all([
        ClientsAPI.list(params),
        ClientsAPI.stats(),
      ])

      setClients(listRes.users || [])
      setTotal(listRes.total || 0)
      setStats(statsRes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => { loadData() }, [loadData])

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3500)
  }

  const openDetail = async (client) => {
    setDetailLoading(true)
    setShowDetail(true)
    try {
      const data = await ClientsAPI.get(client.id)
      setDetailClient(data)
    } catch (err) {
      setError(err.message)
      setShowDetail(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const doAction = async (id, action, extra = {}) => {
    setActionLoading(`${id}-${action}`)
    try {
      switch (action) {
        case "activate":   await ClientsAPI.activate(id); break
        case "deactivate": await ClientsAPI.deactivate(id, extra.reason); break
        case "logout": {
          // Show logout confirmation dialog
          const client = clients.find(c => c.id === id)
          setLogoutTarget(client)
          setShowConfirmLogout(true)
          setActionLoading(null)
          return
        }
        case "reset":      await ClientsAPI.resetPassword(id); break
        case "impersonate": {
          // Show impersonate dialog to get reason
          const client = clients.find(c => c.id === id)
          setImpersonateTarget(client)
          setShowImpersonate(true)
          setActionLoading(null)
          return
        }
      }
      flash(`Action "${action}" completed`)
      await loadData()
      if (showDetail && detailClient?.id === id) {
        const updated = await ClientsAPI.get(id)
        setDetailClient(updated)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl border border-border bg-primary flex items-center justify-center shadow-sm shrink-0">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Clients</h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-border bg-secondary text-foreground">
                  <Radio className="h-2.5 w-2.5" /> {loading ? "Loading" : `${total} total`}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Account management, access control &amp; client operations</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-border bg-card shadow-sm shrink-0">
            <Button onClick={loadData} variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
              <RefreshCcw className="w-3.5 h-3.5" /> Refresh
            </Button>
            {perms.canViewUsers && (
              <>
                <div className="h-5 w-px bg-border" />
                <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5 h-8 text-xs rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> New Client
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Inline filters */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name or company…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-border bg-secondary">
          <CheckCircle2 className="w-4 h-4 text-foreground" />
          <AlertDescription className="text-foreground">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Clients"  value={stats.total}    icon={Users}      meta="All time" />
          <StatCard label="Active"         value={stats.active}   icon={UserCheck}  meta="Enabled" />
          <StatCard label="Disabled"       value={stats.disabled} icon={UserX}      meta="Locked" destructive={stats.disabled > 0} />
          <StatCard label="Email Verified" value={stats.verified} icon={ShieldAlert} meta="Verified" />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="flex justify-center py-14">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </CardContent>
        </Card>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 gap-3">
            <Users className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No clients found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <ClientRow
                      key={c.id}
                      client={c}
                      onView={() => openDetail(c)}
                      onAction={(action, extra) => doAction(c.id, action, extra)}
                      onEditProfile={() => { setEditTarget(c); setShowEditProfile(true) }}
                      isLoading={actionLoading?.startsWith(c.id)}
                      canManage={perms.canViewUsers}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} ({total} clients)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <ClientDetailDialog
        open={showDetail}
        loading={detailLoading}
        client={detailClient}
        onClose={() => { setShowDetail(false); setDetailClient(null) }}
        onAction={(action, extra) => doAction(detailClient?.id, action, extra)}
        onEditProfile={() => { setEditTarget(detailClient); setShowEditProfile(true) }}
        actionLoading={actionLoading}
        canManage={perms.canViewUsers}
      />

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); loadData(); flash("Client created successfully") }}
        onError={(msg) => setError(msg)}
      />

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={showEditProfile}
        client={editTarget}
        onClose={() => { setShowEditProfile(false); setEditTarget(null) }}
        onSaved={() => {
          setShowEditProfile(false)
          setEditTarget(null)
          loadData()
          flash("Profile updated")
        }}
        onError={(msg) => setError(msg)}
      />

      {/* Impersonate Dialog */}
      <ImpersonateDialog
        open={showImpersonate}
        client={impersonateTarget}
        onClose={() => { setShowImpersonate(false); setImpersonateTarget(null) }}
        onConfirm={async (reason) => {
          try {
            await ClientsAPI.impersonate(impersonateTarget.id, reason)
            setShowImpersonate(false)
            setImpersonateTarget(null)
            // Redirect after successful impersonation
            window.location.href = "/client/dashboard"
          } catch (err) {
            setError(err.message)
          }
        }}
        onError={(msg) => setError(msg)}
      />

      {/* Confirm Logout Dialog */}
      <ConfirmLogoutDialog
        open={showConfirmLogout}
        client={logoutTarget}
        onClose={() => { setShowConfirmLogout(false); setLogoutTarget(null) }}
        onConfirm={async () => {
          try {
            await ClientsAPI.forceLogout(logoutTarget.id)
            setShowConfirmLogout(false)
            setLogoutTarget(null)
            flash("Client logged out successfully")
            await loadData()
            if (showDetail && detailClient?.id === logoutTarget.id) {
              const updated = await ClientsAPI.get(logoutTarget.id)
              setDetailClient(updated)
            }
          } catch (err) {
            setError(err.message)
          }
        }}
      />
    </div>
  )
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ label, value, icon: Icon, meta, destructive }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
        {meta && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">{meta}</span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-3xl font-bold tracking-tight leading-none ${destructive ? "text-destructive" : "text-foreground"}`}>
          {value ?? "—"}
        </p>
        <div className="p-1.5 rounded-lg bg-secondary border border-border mb-0.5">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CLIENT ROW
// ============================================================

function ClientRow({ client, onView, onAction, onEditProfile, isLoading, canManage }) {
  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold select-none">
            {client.email.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium truncate max-w-[200px]">{client.email}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {client.profile?.company || <span className="text-border">—</span>}
      </TableCell>
      <TableCell>
        <StatusBadge status={client.disabled ? "disabled" : "active"} />
      </TableCell>
      <TableCell>
        <StatusBadge status={client.emailVerified ? "verified" : "unverified"} />
      </TableCell>
      <TableCell className="text-sm">{client.orderCount ?? 0}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{fmt(client.createdAt)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{fmt(client.lastLogin)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isLoading}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onView} className="gap-2">
              <Eye className="w-4 h-4" /> View Details
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuItem onClick={onEditProfile} className="gap-2">
                  <Building2 className="w-4 h-4" /> Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {client.disabled ? (
                  <DropdownMenuItem onClick={() => onAction("activate")} className="gap-2">
                    <UserPlus className="w-4 h-4" /> Activate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onAction("deactivate")} className="gap-2 text-muted-foreground focus:text-foreground">
                    <UserMinus className="w-4 h-4" /> Deactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onAction("logout")} className="gap-2">
                  <LogOut className="w-4 h-4" /> Force Logout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction("reset")} className="gap-2">
                  <KeyRound className="w-4 h-4" /> Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction("impersonate")} className="gap-2">
                  <MonitorSmartphone className="w-4 h-4" /> Impersonate
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// ============================================================
// CLIENT DETAIL DIALOG
// ============================================================

function ClientDetailDialog({ open, loading, client, onClose, onAction, onEditProfile, actionLoading, canManage }) {
  const fmt = (d) => d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Details</DialogTitle>
          <DialogDescription>Full profile, orders and session info</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : client ? (
          <div className="space-y-5">
            {/* Identity */}
            <section className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm"><Mail className="w-4 h-4" />Account</h3>
              <div className="grid grid-cols-2 gap-3 bg-muted rounded-lg p-4 text-sm">
                <Field label="Email" value={client.email} />
                <Field label="Status" value={client.disabled ? "Disabled" : "Active"} />
                <Field label="Email Verified" value={client.emailVerified ? "Yes" : "No"} />
                <Field label="Joined" value={fmt(client.createdAt)} />
                <Field label="Last Login" value={fmt(client.lastLogin)} />
              </div>
            </section>

            <Separator />

            {/* Profile */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-sm"><Building2 className="w-4 h-4" />Profile</h3>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={onEditProfile}>Edit Profile</Button>
                )}
              </div>
              {client.profile ? (
                <div className="grid grid-cols-2 gap-3 bg-muted rounded-lg p-4 text-sm">
                  <Field label="Company" value={client.profile.company} />
                  <Field label="Phone" value={client.profile.phone} />
                  <Field label="Address" value={client.profile.address} />
                  <Field label="City" value={client.profile.city} />
                  <Field label="Country" value={client.profile.country} />
                  <Field label="Postal" value={client.profile.postal} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No profile data.</p>
              )}
            </section>

            <Separator />

            {/* Orders */}
            <section className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm"><Package className="w-4 h-4" />Recent Orders ({client.orders?.length || 0})</h3>
              {client.orders?.length > 0 ? (
                <div className="space-y-2">
                  {client.orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between bg-muted rounded-lg px-4 py-2 text-sm">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}…</span>
                        <span className="ml-2">{o.service || "—"} / {o.plan || "—"}</span>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No orders.</p>
              )}
            </section>

            <Separator />

            {/* Sessions */}
            <section className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm"><MonitorSmartphone className="w-4 h-4" />Active Sessions ({client.sessions?.length || 0})</h3>
              {client.sessions?.length > 0 ? (
                <div className="space-y-1">
                  {client.sessions.map((s) => (
                    <div key={s.id} className="text-sm bg-muted rounded px-3 py-2 text-muted-foreground">
                      {s.userAgent?.slice(0, 60) || "Unknown device"} — {fmt(s.createdAt)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active sessions.</p>
              )}
            </section>

            {/* Actions */}
            {canManage && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {client.disabled ? (
                    <Button size="sm" onClick={() => onAction("activate")} disabled={!!actionLoading}>
                      <UserPlus className="w-4 h-4 mr-1" /> Activate
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onAction("deactivate")} disabled={!!actionLoading}>
                      <UserMinus className="w-4 h-4 mr-1" /> Deactivate
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onAction("logout")} disabled={!!actionLoading}>
                    <LogOut className="w-4 h-4 mr-1" /> Force Logout
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onAction("reset")} disabled={!!actionLoading}>
                    <KeyRound className="w-4 h-4 mr-1" /> Reset Password
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onAction("impersonate")} disabled={!!actionLoading}>
                    <MonitorSmartphone className="w-4 h-4 mr-1" /> Impersonate
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// CREATE CLIENT DIALOG
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY_FORM = { email: "", password: "", company: "", phone: "", address: "", country: "", city: "", postal: "" }

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="text-xs text-destructive mt-0.5">{msg}</p>
}

function CreateClientDialog({ open, onClose, onCreated, onError }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (fieldErrors[k]) setFieldErrors((fe) => ({ ...fe, [k]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!form.email.trim())          errs.email    = "Email is required"
    else if (!EMAIL_RE.test(form.email)) errs.email = "Must be a valid email address"
    if (!form.password)              errs.password = "Password is required"
    else if (form.password.length < 8)  errs.password = "Must be at least 8 characters"
    return errs
  }

  const submit = async (e) => {
    e.preventDefault()
    const clientErrs = validate()
    if (Object.keys(clientErrs).length > 0) { setFieldErrors(clientErrs); return }

    setLoading(true)
    setFieldErrors({})
    try {
      await ClientsAPI.create(form)
      setForm(EMPTY_FORM)
      onCreated()
    } catch (err) {
      if (err.fields) {
        setFieldErrors(err.fields)
      } else {
        onError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Client</DialogTitle>
          <DialogDescription>Add a new client account to the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="client@example.com" maxLength={254} disabled={loading} aria-invalid={!!fieldErrors.email} />
              <FieldError msg={fieldErrors.email} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={set("password")} placeholder="Minimum 8 characters" maxLength={128} disabled={loading} aria-invalid={!!fieldErrors.password} />
              <FieldError msg={fieldErrors.password} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Company</Label>
              <Input value={form.company} onChange={set("company")} placeholder="Company name" maxLength={100} disabled={loading} aria-invalid={!!fieldErrors.company} />
              <FieldError msg={fieldErrors.company} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={set("phone")} placeholder="+1 555 0000" maxLength={30} disabled={loading} aria-invalid={!!fieldErrors.phone} />
              <FieldError msg={fieldErrors.phone} />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={form.country} onChange={set("country")} placeholder="US" maxLength={3} disabled={loading} aria-invalid={!!fieldErrors.country} />
              <FieldError msg={fieldErrors.country} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Address</Label>
              <Input value={form.address} onChange={set("address")} placeholder="Street address" maxLength={255} disabled={loading} aria-invalid={!!fieldErrors.address} />
              <FieldError msg={fieldErrors.address} />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={form.city} onChange={set("city")} placeholder="City" maxLength={100} disabled={loading} aria-invalid={!!fieldErrors.city} />
              <FieldError msg={fieldErrors.city} />
            </div>
            <div className="space-y-1">
              <Label>Postal Code</Label>
              <Input value={form.postal} onChange={set("postal")} placeholder="10001" maxLength={20} disabled={loading} aria-invalid={!!fieldErrors.postal} />
              <FieldError msg={fieldErrors.postal} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// EDIT PROFILE DIALOG
// ============================================================

function EditProfileDialog({ open, client, onClose, onSaved, onError }) {
  const [form, setForm] = useState({ company: "", phone: "", address: "", country: "", city: "", postal: "" })
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (client?.profile) {
      setForm({
        company: client.profile.company || "",
        phone: client.profile.phone || "",
        address: client.profile.address || "",
        country: client.profile.country || "",
        city: client.profile.city || "",
        postal: client.profile.postal || "",
      })
      setFieldErrors({})
    }
  }, [client])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (fieldErrors[k]) setFieldErrors((fe) => ({ ...fe, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    try {
      await ClientsAPI.updateProfile(client.id, form)
      onSaved()
    } catch (err) {
      if (err.fields) {
        setFieldErrors(err.fields)
      } else {
        onError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Client Profile</DialogTitle>
          <DialogDescription>{client?.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Company</Label>
              <Input value={form.company} onChange={set("company")} placeholder="Company name" maxLength={100} disabled={loading} aria-invalid={!!fieldErrors.company} />
              <FieldError msg={fieldErrors.company} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={set("phone")} placeholder="+1 555 0000" maxLength={30} disabled={loading} aria-invalid={!!fieldErrors.phone} />
              <FieldError msg={fieldErrors.phone} />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={form.country} onChange={set("country")} placeholder="US" maxLength={3} disabled={loading} aria-invalid={!!fieldErrors.country} />
              <FieldError msg={fieldErrors.country} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Address</Label>
              <Input value={form.address} onChange={set("address")} placeholder="Street address" maxLength={255} disabled={loading} aria-invalid={!!fieldErrors.address} />
              <FieldError msg={fieldErrors.address} />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={form.city} onChange={set("city")} placeholder="City" maxLength={100} disabled={loading} aria-invalid={!!fieldErrors.city} />
              <FieldError msg={fieldErrors.city} />
            </div>
            <div className="space-y-1">
              <Label>Postal Code</Label>
              <Input value={form.postal} onChange={set("postal")} placeholder="10001" maxLength={20} disabled={loading} aria-invalid={!!fieldErrors.postal} />
              <FieldError msg={fieldErrors.postal} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// IMPERSONATE DIALOG
// ============================================================

function ImpersonateDialog({ open, client, onClose, onConfirm, onError }) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setReason("")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for impersonation")
      return
    }

    setLoading(true)
    try {
      await onConfirm(reason.trim())
    } catch (err) {
      setError(err.message || "Failed to impersonate client")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Impersonation</DialogTitle>
          <DialogDescription>
            You are about to impersonate <span className="font-semibold text-foreground">{client?.email}</span>. This action will be logged for security and audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="impersonate-reason">
              Reason for Impersonation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="impersonate-reason"
              placeholder="e.g., Troubleshooting billing issue, Customer support request, Account recovery assistance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Provide a clear reason for audit trail purposes. This will be logged and monitored.
            </p>
          </div>

          {client && (
            <div className="bg-muted rounded-lg p-3 space-y-2 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">CLIENT DETAILS</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Email:</span> {client.email}</p>
                {client.profile?.company && (
                  <p className="text-sm"><span className="text-muted-foreground">Company:</span> {client.profile.company}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
          >
            {loading ? "Impersonating…" : "Confirm Impersonation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// CONFIRM LOGOUT DIALOG
// ============================================================

function ConfirmLogoutDialog({ open, client, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Confirm Force Logout
          </DialogTitle>
          <DialogDescription>
            This action will terminate all active sessions for <span className="font-semibold text-foreground">{client?.email}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-destructive/10 border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive font-medium">
              The client will be immediately logged out from all devices. They will need to log in again to access their account.
            </AlertDescription>
          </Alert>

          {client && (
            <div className="bg-muted rounded-lg p-3 space-y-2 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">CLIENT DETAILS</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Email:</span> {client.email}</p>
                {client.profile?.company && (
                  <p className="text-sm"><span className="text-muted-foreground">Company:</span> {client.profile.company}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Logging out…" : "Force Logout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// HELPERS
// ============================================================

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  )
}
