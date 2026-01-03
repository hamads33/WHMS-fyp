// ============================================================================
// FILE: components/modern-backup-list.jsx
// PURPOSE: Clean black & white backup table
// ============================================================================

"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { BackupVerifyModal } from "./backup-verify-modal";
import { toast } from "sonner";

export function ModernBackupList({ onUpdate }) {
  const { backups, loading, deleteBackup, cancelBackup, cloneBackup } =
    useBackups({
      autoRefresh: true,
      refreshInterval: 10000,
    });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifyBackup, setVerifyBackup] = useState(null);

  const filteredBackups = backups.filter((backup) => {
    const matchesSearch = backup.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || backup.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (backup) => {
    if (!confirm(`Delete backup "${backup.name}"?`)) return;

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

  const getStatusBadge = (status) => {
    const styles = {
      success: "bg-black dark:bg-white text-white dark:text-black",
      failed: "bg-gray-300 dark:bg-gray-700 text-black dark:text-white",
      running: "bg-gray-200 dark:bg-gray-800 text-black dark:text-white",
      queued: "bg-gray-100 dark:bg-gray-900 text-black dark:text-white",
    };
    return styles[status] || styles.queued;
  };

  return (
    <>
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-black">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Backups
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredBackups.length} of {backups.length} backups
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px] bg-white dark:bg-black border-gray-200 dark:border-gray-800"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-200 dark:border-gray-800"
                  >
                    Status: {statusFilter === "all" ? "All" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("success")}>
                    Success
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("failed")}>
                    Failed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("running")}>
                    Running
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading && backups.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Loading backups...
            </div>
          ) : filteredBackups.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {search || statusFilter !== "all"
                ? "No backups match your filters"
                : "No backups found"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-500 dark:text-gray-400">
                    Name
                  </TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">
                    Type
                  </TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">
                    Status
                  </TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">
                    Size
                  </TableHead>
                  <TableHead className="text-gray-500 dark:text-gray-400">
                    Created
                  </TableHead>
                  <TableHead className="text-right text-gray-500 dark:text-gray-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBackups.map((backup) => (
                  <TableRow
                    key={backup.id}
                    className="border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <TableCell className="font-medium text-black dark:text-white">
                      {backup.name}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize text-gray-600 dark:text-gray-400">
                        {backup.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadge(
                          backup.status
                        )}`}
                      >
                        {backup.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {backup.sizeBytes ? formatBytes(backup.sizeBytes) : "-"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {formatRelativeTime(backup.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {backup.status === "success" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleDownload(backup)}
                                className="gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setVerifyBackup(backup)}
                                className="gap-2"
                              >
                                <FileCheck className="h-4 w-4" />
                                Verify
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleClone(backup)}
                                className="gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Clone
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          {(backup.status === "running" ||
                            backup.status === "queued") && (
                            <DropdownMenuItem
                              onClick={() => handleCancel(backup)}
                              className="gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => handleDelete(backup)}
                            className="gap-2 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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