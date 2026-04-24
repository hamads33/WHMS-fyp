"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { Database, FolderOpen, Cloud, AlertCircle, Loader2, X, Plus, Settings } from "lucide-react";

const TYPE_OPTIONS = [
  {
    value: "full",
    label: "Full Backup",
    description: "Database + files",
    icon: Database,
  },
  {
    value: "database",
    label: "Database Only",
    description: "PostgreSQL dump",
    icon: Database,
  },
  {
    value: "files",
    label: "Files Only",
    description: "Selected directories",
    icon: FolderOpen,
  },
  {
    value: "config",
    label: "Config Only",
    description: "Configuration files",
    icon: Settings,
  },
];

export function CreateBackupModal({ open, onOpenChange, onCreated }) {
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({
    name: "",
    type: "full",
    storageConfigId: "none",
    retentionDays: 30,
    filePaths: [""],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    apiFetch("/storage-configs")
      .then((r) => setProviders(r.data || []))
      .catch(() => {});
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    setError(null);
    setForm({ name: "", type: "full", storageConfigId: "none", retentionDays: 30, filePaths: [""] });
  };

  const submit = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        type: form.type,
      };

      // Add optional fields if provided
      if (form.name && form.name.trim()) {
        payload.name = form.name.trim();
      }
      if (form.storageConfigId && form.storageConfigId !== "none") {
        payload.storageConfigId = Number(form.storageConfigId);
      }
      if (form.retentionDays) {
        payload.retentionDays = Number(form.retentionDays);
      }

      // Add files for file-type, config, and full backups
      if (form.type === "files" || form.type === "full" || form.type === "config") {
        payload.files = form.filePaths
          .filter((p) => p.trim())
          .map((p) => ({ path: p.trim() }));
      }

      const response = await apiFetch("/backups", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to create backup");
      }

      handleClose();
      onCreated?.();
    } catch (err) {
      const errorMsg = err.message || "Failed to create backup";
      // Check if it's a validation error with details
      let displayError = errorMsg;
      if (errorMsg === "Validation failed" || errorMsg.includes("Validation")) {
        displayError = "Validation failed. Please check your inputs and ensure file paths are provided for file/config-type backups.";
      }
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Create Backup</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Configure and start a new backup job.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-5 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Backup Name
            </Label>
            <Input
              value={form.name}
              placeholder="e.g. Weekly Production Backup"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Backup Type
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = form.type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: opt.value })}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
                      active
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{opt.label}</span>
                    <span className={`text-[10px] ${active ? "opacity-70" : "text-gray-400"}`}>
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Paths (for files, config, and full type) */}
          {(form.type === "files" || form.type === "full" || form.type === "config") && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Directories / Files to Back Up
              </Label>
              <div className="space-y-2">
                {form.filePaths.map((path, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      value={path}
                      placeholder="/var/www/uploads"
                      onChange={(e) => {
                        const newPaths = [...form.filePaths];
                        newPaths[idx] = e.target.value;
                        setForm({ ...form, filePaths: newPaths });
                      }}
                      className="h-9 text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (form.filePaths.length > 1) {
                          setForm({
                            ...form,
                            filePaths: form.filePaths.filter((_, i) => i !== idx),
                          });
                        }
                      }}
                      disabled={form.filePaths.length === 1}
                      className={`p-2 rounded border transition-colors ${
                        form.filePaths.length === 1
                          ? "border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400"
                      }`}
                      title={form.filePaths.length === 1 ? "At least one path is required" : "Remove path"}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, filePaths: [...form.filePaths, ""] })}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Path
                </button>
              </div>
            </div>
          )}

          {/* Storage */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Storage Provider
            </Label>
            <Select
              value={form.storageConfigId}
              onValueChange={(v) => setForm({ ...form, storageConfigId: v })}
            >
              <SelectTrigger className="h-9">
                <div className="flex items-center gap-2">
                  <Cloud className="h-3.5 w-3.5 text-gray-400" />
                  <SelectValue placeholder="Local storage (default)" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Local storage (default)</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Retention */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Retention Period
              </Label>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {form.retentionDays} days
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="range"
                min={1}
                max={365}
                value={form.retentionDays}
                onChange={(e) => setForm({ ...form, retentionDays: Number(e.target.value) })}
                className="h-1.5 flex-1 accent-black dark:accent-white cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>1 day</span>
              <span>1 year</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} className="h-9 text-sm" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={loading}
            className="h-9 text-sm bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 gap-2"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? "Creating..." : "Create Backup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
