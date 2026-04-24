"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { useCreateServer, useServerGroups } from "@/lib/api/servers"

const EMPTY = {
  name: "", hostname: "", ipAddress: "",
  type: "mock-cpanel", groupId: "", tags: "",
}

export function CreateServerModal({ open, onOpenChange }) {
  const { mutate: createServer, isPending } = useCreateServer()
  const { data: groups = [] } = useServerGroups()

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name.trim())      e.name      = "Server name is required"
    if (!form.hostname.trim())  e.hostname  = "Hostname is required"
    if (!form.ipAddress.trim()) e.ipAddress = "IP address is required"
    if (!form.type)             e.type      = "Type is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!validate()) return

    const payload = {
      name:      form.name.trim(),
      hostname:  form.hostname.trim(),
      ipAddress: form.ipAddress.trim(),
      type:      form.type,
      tags:      form.tags.split(",").map(t => t.trim()).filter(Boolean),
      ...(form.groupId ? { groupId: form.groupId } : {}),
    }

    createServer(payload, {
      onSuccess: () => {
        setForm(EMPTY)
        setErrors({})
        onOpenChange(false)
      }
    })
  }

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    setErrors(p => ({ ...p, [field]: undefined }))
  }

  const setDirect = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: undefined }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add New Server</DialogTitle>
          <DialogDescription>Register a new server node in your infrastructure.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cs-name" className="text-xs">Server Name</Label>
            <Input
              id="cs-name"
              placeholder="e.g., us-east-prod-01"
              value={form.name}
              onChange={set("name")}
              disabled={isPending}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Hostname */}
          <div className="space-y-1.5">
            <Label htmlFor="cs-hostname" className="text-xs">Hostname</Label>
            <Input
              id="cs-hostname"
              placeholder="prod01.us-east.example.com"
              value={form.hostname}
              onChange={set("hostname")}
              disabled={isPending}
              className={errors.hostname ? "border-destructive" : ""}
            />
            {errors.hostname && <p className="text-xs text-destructive">{errors.hostname}</p>}
          </div>

          {/* IP Address */}
          <div className="space-y-1.5">
            <Label htmlFor="cs-ip" className="text-xs">IP Address</Label>
            <Input
              id="cs-ip"
              placeholder="192.168.1.10"
              value={form.ipAddress}
              onChange={set("ipAddress")}
              disabled={isPending}
              className={errors.ipAddress ? "border-destructive" : ""}
            />
            {errors.ipAddress && <p className="text-xs text-destructive">{errors.ipAddress}</p>}
          </div>

          {/* Type + Group */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cs-type" className="text-xs">Server Type</Label>
              <select
                id="cs-type"
                value={form.type}
                onChange={e => setDirect("type", e.target.value)}
                disabled={isPending}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="mock-cpanel">cPanel</option>
                <option value="mock-vps">VPS</option>
                <option value="mock-cloud">Cloud</option>
              </select>
              {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cs-group" className="text-xs">Server Group (optional)</Label>
              <select
                id="cs-group"
                value={form.groupId}
                onChange={e => setDirect("groupId", e.target.value)}
                disabled={isPending}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">No group</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="cs-tags" className="text-xs">Tags (optional)</Label>
            <Input
              id="cs-tags"
              placeholder="critical, web, backup (comma-separated)"
              value={form.tags}
              onChange={set("tags")}
              disabled={isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Create Server
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
