"use client"

import { useState } from "react"
import { Plus, Trash2, Star, Link2, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  useServerGroups, useServers, useCreateGroup, useDeleteGroup,
  useAssignServerToGroup, useSetDefaultServer,
} from "@/lib/api/servers"

// ── Create / Edit Group Modal ────────────────────────────────────────────────

function GroupFormModal({ open, onOpenChange, initialName = "", initialDesc = "", onSubmit, isPending, title }) {
  const [name, setName] = useState(initialName)
  const [desc, setDesc] = useState(initialDesc)
  const [err,  setErr]  = useState("")

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!name.trim()) { setErr("Group name is required"); return }
    onSubmit({ name: name.trim(), description: desc.trim() || null })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Server groups let you organise and route provisioning.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input placeholder="US East" value={name} onChange={e => { setName(e.target.value); setErr("") }} disabled={isPending} className={err ? "border-destructive" : ""} />
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Input placeholder="Primary east-coast cluster" value={desc} onChange={e => setDesc(e.target.value)} disabled={isPending} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-2">
              {isPending && <Loader2 size={13} className="animate-spin" />}Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Assign Server Modal ──────────────────────────────────────────────────────

function AssignServerModal({ open, onOpenChange, group, servers, onAssign, isPending }) {
  const [serverId, setServerId] = useState("")

  const unassigned = servers.filter(s => s.groupId !== group?.id)

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!serverId) return
    onAssign({ groupId: group.id, serverId }, {
      onSuccess: () => { setServerId(""); onOpenChange(false) }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Assign Server</DialogTitle>
          <DialogDescription>Add a server to <strong>{group?.name}</strong></DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Server</Label>
            <select
              value={serverId}
              onChange={e => setServerId(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select a server…</option>
              {unassigned.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!serverId || isPending} className="gap-2">
              {isPending && <Loader2 size={13} className="animate-spin" />}Assign
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({ group, servers, onAssign, onSetDefault, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const members = servers.filter(s => s.groupId === group.id)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={13} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={13} className="text-muted-foreground flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{group.name}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-secondary text-[10px] text-muted-foreground tabular-nums">
              {members.length}
            </span>
          </div>
          {group.description && (
            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{group.description}</p>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            title="Assign server"
            onClick={() => onAssign(group)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-[oklch(0.6_0.2_250)] hover:bg-[oklch(0.6_0.2_250/0.1)] transition-colors"
          >
            <Link2 size={12} />
          </button>
          <button
            title="Delete group"
            onClick={() => onDelete(group)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-[oklch(0.52_0.22_25)] hover:bg-[oklch(0.52_0.22_25/0.1)] transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </button>

      {/* Members */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border/60">
          {members.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground/60 text-center">No servers in this group.</p>
          ) : (
            members.map(server => (
              <div key={server.id} className="flex items-center gap-2 px-4 py-2">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  server.status === "active" ? "bg-[oklch(0.64_0.2_145)]" :
                  server.status === "maintenance" ? "bg-[oklch(0.72_0.18_70)]" :
                  "bg-[oklch(0.52_0.22_25)]"
                )} />
                <span className="text-xs text-foreground flex-1 truncate">{server.name}</span>
                {server.isDefault && (
                  <span className="text-[10px] text-[oklch(0.6_0.2_250)]">default</span>
                )}
                {!server.isDefault && (
                  <button
                    title="Set as default"
                    onClick={() => onSetDefault({ groupId: group.id, serverId: server.id })}
                    className="p-1 rounded text-muted-foreground/40 hover:text-[oklch(0.72_0.18_70)] transition-colors"
                  >
                    <Star size={11} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export function ServerGroupsPanel() {
  const { data: groups  = [], isLoading: groupsLoading } = useServerGroups()
  const { data: servers = [] } = useServers()

  const { mutate: createGroup,  isPending: createPending  } = useCreateGroup()
  const { mutate: deleteGroup,  isPending: deletePending  } = useDeleteGroup()
  const { mutate: assignServer, isPending: assignPending  } = useAssignServerToGroup()
  const { mutate: setDefault } = useSetDefaultServer()

  const [showCreate,   setShowCreate]   = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {groups.length} group{groups.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-[oklch(0.6_0.2_250/0.4)] bg-[oklch(0.6_0.2_250/0.1)] hover:bg-[oklch(0.6_0.2_250/0.2)] text-[oklch(0.6_0.2_250)] transition-colors"
        >
          <Plus size={12} />
          New Group
        </button>
      </div>

      {/* Group list */}
      {groupsLoading ? (
        <p className="text-xs text-center text-muted-foreground py-4">Loading groups…</p>
      ) : groups.length === 0 ? (
        <p className="text-xs text-center text-muted-foreground/60 py-4">No groups yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              servers={servers}
              onAssign={setAssignTarget}
              onSetDefault={setDefault}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <GroupFormModal
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Create Group"
        isPending={createPending}
        onSubmit={(data) => createGroup(data, { onSuccess: () => setShowCreate(false) })}
      />

      {/* Assign modal */}
      <AssignServerModal
        open={!!assignTarget}
        onOpenChange={(v) => !v && setAssignTarget(null)}
        group={assignTarget}
        servers={servers}
        onAssign={assignServer}
        isPending={assignPending}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>{deleteTarget?.name}</strong>. Servers in this group will be unassigned but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroup(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
              disabled={deletePending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
