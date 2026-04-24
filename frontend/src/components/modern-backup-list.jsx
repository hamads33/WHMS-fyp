"use client";

import { useState } from "react";
import { useBackups } from "@/hooks/useBackups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import {
  Download,
  MoreHorizontal,
  Trash2,
  Copy,
  FileCheck,
  XCircle,
  Search,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { BackupVerifyModal } from "./backup-verify-modal";
import { toast } from "sonner";

const STATUS_CONFIG = {
  success: {
    label: "Success",
    icon: CheckCircle2,
    className: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  running: {
    label: "Running",
    icon: Loader2,
    className: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    animate: true,
  },
  queued: {
    label: "Queued",
    icon: Clock,
    className: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
};

const TYPE_LABELS = { full: "Full", database: "Database", files: "Files", config: "Config" };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
      <Icon className={`h-3 w-3 ${cfg.animate ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

const FILTERS = ["all", "success", "failed", "running", "queued"];

export function ModernBackupList({ onUpdate }) {
  const { backups, loading, deleteBackup, cancelBackup, cloneBackup } = useBackups({
    autoRefresh: true,
    refreshInterval: 10000,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifyBackup, setVerifyBackup] = useState(null);
  const [showFailedBackups, setShowFailedBackups] = useState(false);

  const filtered = backups.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const isNotFailed = showFailedBackups || b.status !== "failed";
    return matchSearch && matchStatus && isNotFailed;
  });

  const handleDelete = async (backup) => {
    if (!confirm(`Delete "${backup.name}"? This cannot be undone.`)) return;
    try {
      await deleteBackup(backup.id);
      toast.success("Backup deleted");
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || "Failed to delete backup");
    }
  };

  const handleCancel = async (backup) => {
    try {
      await cancelBackup(backup.id);
      toast.success("Backup cancelled");
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || "Failed to cancel");
    }
  };

  const handleClone = async (backup) => {
    try {
      await cloneBackup(backup.id);
      toast.success("Backup cloned");
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || "Failed to clone");
    }
  };

  const handleDownload = (backup) => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/api/backups/${backup.id}/download`,
      "_blank"
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Backups
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {filtered.length} of {backups.length} backup{backups.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search backups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 w-52 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </div>

            {/* Hide failed backups toggle */}
            <Button
              variant={showFailedBackups ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFailedBackups(!showFailedBackups)}
              className="h-8 text-xs whitespace-nowrap border-gray-200 dark:border-gray-700"
            >
              {showFailedBackups ? "✓ Show Failed" : "Hide Failed"}
            </Button>

            {/* Status filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                >
                  {statusFilter === "all" ? "All statuses" : STATUS_CONFIG[statusFilter]?.label}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {FILTERS.map((f) => (
                  <DropdownMenuItem
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`text-sm gap-2 ${statusFilter === f ? "font-medium" : ""}`}
                  >
                    {f === "all" ? "All statuses" : STATUS_CONFIG[f]?.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Body */}
        {loading && backups.length === 0 ? (
          <div className="py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading backups...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <Database className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {search || statusFilter !== "all" ? "No backups match your filters" : "No backups yet"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Create your first backup to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-6">Name</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Size</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Retention</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((backup) => (
                  <TableRow
                    key={backup.id}
                    className="border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <TableCell className="pl-6">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {backup.name}
                      </div>
                      {backup.errorMessage && (
                        <div className="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title={backup.errorMessage}>
                          {backup.errorMessage}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {TYPE_LABELS[backup.type] || backup.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={backup.status} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {backup.sizeBytes ? formatBytes(backup.sizeBytes) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {backup.retentionDays ? `${backup.retentionDays}d` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(backup.createdAt)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {backup.status === "success" && (
                            <>
                              <DropdownMenuItem onClick={() => handleDownload(backup)} className="gap-2 text-sm">
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setVerifyBackup(backup)} className="gap-2 text-sm">
                                <FileCheck className="h-3.5 w-3.5" />
                                Verify
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleClone(backup)} className="gap-2 text-sm">
                                <Copy className="h-3.5 w-3.5" />
                                Clone
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {(backup.status === "running" || backup.status === "queued") && (
                            <>
                              <DropdownMenuItem onClick={() => handleCancel(backup)} className="gap-2 text-sm">
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(backup)}
                            className="gap-2 text-sm text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {verifyBackup && (
        <BackupVerifyModal
          backup={verifyBackup}
          open={!!verifyBackup}
          onOpenChange={(open) => !open && setVerifyBackup(null)}
        />
      )}
    </>
  );
}
