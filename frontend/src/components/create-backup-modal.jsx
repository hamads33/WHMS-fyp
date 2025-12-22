"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/api/client"

export function CreateBackupModal({ open, onOpenChange, onCreated }) {
  const [providers, setProviders] = useState([])
  const [form, setForm] = useState({
    name: "",
    type: "full",
    storageConfigId: "",
    retentionDays: 30,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return;
    // FIX: Include /api prefix to match backend index.js mount point
    apiFetch("/api/storage-configs")
      .then((r) => setProviders(r.data || []))
      .catch(() => setError("Failed to load storage configurations"))
  }, [open])

  const submit = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // FIX: Path must match backend controller mount point /api/backups
      await apiFetch("/api/backups", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          // FIX: Ensure numeric values are sent as Numbers to pass Zod/Joi validation
          retentionDays: Number(form.retentionDays),
          storageConfigId: form.storageConfigId ? Number(form.storageConfigId) : null,
        }),
      })
      
      onOpenChange(false)
      onCreated?.()
      // Reset form on success
      setForm({ name: "", type: "full", storageConfigId: "", retentionDays: 30 })
    } catch (err) {
      // FIX: Capture and display the "Validation failed" or "API_ERROR" messages
      setError(err.message || "Failed to create backup")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Backup</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              placeholder="e.g. Weekly Production Backup"
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="db">Database</SelectItem>
                <SelectItem value="files">Files</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Storage</Label>
            <Select
              value={form.storageConfigId}
              onValueChange={(v) =>
                setForm({ ...form, storageConfigId: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select storage" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Retention (days)</Label>
            <Input
              type="number"
              value={form.retentionDays}
              onChange={(e) =>
                setForm({ ...form, retentionDays: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || !form.name}>
            {loading ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}