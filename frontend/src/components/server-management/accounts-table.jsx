"use client"

import { useState } from "react"
import { Ban, Trash2, Plus, Loader2, X } from "lucide-react"
import { AccountStatusBadge } from "./status-badge"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useServerAccounts, useServerAccountsActions, useCreateAccount } from "@/lib/api/servers"

const thCls = "px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"

// ── Create Account Modal ─────────────────────────────────────────────────────

function CreateAccountModal({ open, onOpenChange, serverId }) {
  const { mutate: createAccount, isPending } = useCreateAccount(serverId)

  const empty = { userId: "", domain: "", username: "", password: "" }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.userId.trim()) e.userId = "User ID is required (UUID)"
    if (!form.domain.trim()) e.domain = "Domain is required"
    if (!form.username.trim()) e.username = "Username is required"
    if (form.password.length < 8) e.password = "Password must be at least 8 characters"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!validate()) return
    createAccount(form, {
      onSuccess: () => {
        setForm(empty)
        setErrors({})
        onOpenChange(false)
      }
    })
  }

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    setErrors(p => ({ ...p, [field]: undefined }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Provision Account</DialogTitle>
          <DialogDescription>Create a new hosting account on this server.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ca-userId" className="text-xs">User ID (UUID)</Label>
            <Input id="ca-userId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.userId} onChange={set("userId")} disabled={isPending} className={errors.userId ? "border-destructive" : ""} />
            {errors.userId && <p className="text-xs text-destructive">{errors.userId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ca-domain" className="text-xs">Domain</Label>
            <Input id="ca-domain" placeholder="example.com" value={form.domain} onChange={set("domain")} disabled={isPending} className={errors.domain ? "border-destructive" : ""} />
            {errors.domain && <p className="text-xs text-destructive">{errors.domain}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ca-username" className="text-xs">Username</Label>
              <Input id="ca-username" placeholder="username" value={form.username} onChange={set("username")} disabled={isPending} className={errors.username ? "border-destructive" : ""} />
              {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca-password" className="text-xs">Password</Label>
              <Input id="ca-password" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} disabled={isPending} className={errors.password ? "border-destructive" : ""} />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-2">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Provision
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Accounts Table ───────────────────────────────────────────────────────────

export function AccountsTable({ serverId }) {
  const { data: accounts = [], isLoading } = useServerAccounts(serverId)
  const { suspend, terminate, suspendPending, terminatePending } = useServerAccountsActions(serverId)
  const [showCreate, setShowCreate] = useState(false)

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11px] text-muted-foreground tabular-nums">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-[oklch(0.6_0.2_250/0.4)] bg-[oklch(0.6_0.2_250/0.1)] hover:bg-[oklch(0.6_0.2_250/0.2)] text-[oklch(0.6_0.2_250)] transition-colors"
        >
          <Plus size={12} />
          New Account
        </button>
      </div>

      {/* Table */}
      <Table>
        <TableHeader className="bg-secondary/40">
          <TableRow className="border-b border-border">
            <TableHead className={thCls}>Domain</TableHead>
            <TableHead className={`${thCls} hidden md:table-cell`}>Username</TableHead>
            <TableHead className={thCls}>Status</TableHead>
            <TableHead className={`${thCls} hidden lg:table-cell`}>Created</TableHead>
            <TableHead className={thCls}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/60">
          {isLoading && Array(3).fill(0).map((_, i) => (
            <TableRow key={i}>
              {Array(5).fill(0).map((__, j) => (
                <TableCell key={j} className="px-3 py-2"><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}

          {!isLoading && accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                No accounts provisioned on this server.
              </TableCell>
            </TableRow>
          )}

          {!isLoading && accounts.map(account => (
            <TableRow key={account.id} className="hover:bg-secondary/30 transition-colors">
              <TableCell className="px-3 py-2">
                <div className="font-medium text-foreground text-xs">{account.domain}</div>
              </TableCell>
              <TableCell className="px-3 py-2 hidden md:table-cell">
                <div className="text-xs text-muted-foreground font-mono">{account.username ?? "—"}</div>
              </TableCell>
              <TableCell className="px-3 py-2">
                <AccountStatusBadge status={account.status} />
              </TableCell>
              <TableCell className="px-3 py-2 hidden lg:table-cell">
                <div className="text-xs text-muted-foreground">{formatDate(account.createdAt)}</div>
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <button
                    title="Suspend account"
                    disabled={account.status !== "active" || suspendPending}
                    onClick={() => suspend(account.id)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      account.status === "active"
                        ? "text-[oklch(0.72_0.18_70)] hover:bg-[oklch(0.72_0.18_70/0.15)]"
                        : "text-muted-foreground/30 cursor-not-allowed"
                    )}
                  >
                    <Ban size={13} />
                  </button>
                  <button
                    title="Terminate account"
                    disabled={account.status === "terminated" || terminatePending}
                    onClick={() => terminate(account.id)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      account.status !== "terminated"
                        ? "text-[oklch(0.52_0.22_25)] hover:bg-[oklch(0.52_0.22_25/0.15)]"
                        : "text-muted-foreground/30 cursor-not-allowed"
                    )}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateAccountModal open={showCreate} onOpenChange={setShowCreate} serverId={serverId} />
    </>
  )
}
