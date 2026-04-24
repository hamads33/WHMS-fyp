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

export function AddStorageModal({ open, onOpenChange, onCreated }) {
  const [providers, setProviders] = useState([])
  const [providerId, setProviderId] = useState("")
  const [schema, setSchema] = useState({})
  const [name, setName] = useState("")
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load providers on mount
  useEffect(() => {
    apiFetch("/api/storage-configs/providers")
      .then((res) => setProviders(res.data || []))
      .catch(() => setError("Failed to load providers"))
  }, [])

  // Reset form and update schema when providerId changes
  useEffect(() => {
    const p = providers.find((x) => x.id === providerId)
    setSchema(p?.schema || {})
    // Only reset config if we have actually selected a new provider
    if (providerId) setConfig({})
  }, [providerId, providers])

  // FIX: Clear errors and reset specific fields when modal closes/opens
  useEffect(() => {
    if (!open) {
      setError(null)
    }
  }, [open])

  const submit = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // FIX: Matches POST /api/storage-configs in storageConfig.controller.js
      await apiFetch("/api/storage-configs", {
        method: "POST",
        body: JSON.stringify({ name, provider: providerId, config }),
      })

      onOpenChange(false)
      onCreated?.()
      
      // FIX: Reset local state after successful creation
      setName("")
      setProviderId("")
      setConfig({})
    } catch (err) {
      // FIX: Capture backend validation errors (e.g., "Test connection failed")
      setError(err.message || "Failed to save storage provider")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Storage Provider</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input 
              value={name} 
              placeholder="e.g. S3 Production"
              onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <Label>Provider Type</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* FIX: Map dynamic configuration fields from provider schema */}
          {Object.keys(schema).map((key) => (
            <div key={key} className="space-y-2">
              <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
              <Input
                // FIX: Ensure value is controlled to prevent cursor jumping
                value={config[key] || ""}
                type={schema[key]?.type === "number" ? "number" : "password"}
                placeholder={`Enter ${key}`}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    [key]:
                      schema[key]?.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={submit} 
            disabled={loading || !providerId || !name}
          >
            {loading ? "Saving…" : "Save Storage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}