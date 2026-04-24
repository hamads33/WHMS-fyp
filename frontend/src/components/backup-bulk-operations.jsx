// ============================================================================
// FILE: components/backup-bulk-operations.jsx
// PURPOSE: Bulk delete/restore operations with selection
// ============================================================================

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { backupApi } from "@/lib/api/backupClient";
import { Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export function BackupBulkOperations({ backups, onComplete }) {
  const [selected, setSelected] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleSelect = (id) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === backups.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(backups.map((b) => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setDeleting(true);
      
      const res = await backupApi("/bulk-delete", {
        method: "POST",
        body: JSON.stringify({
          backupIds: Array.from(selected),
        }),
      });

      if (res.data.deleted > 0) {
        toast.success(`Successfully deleted ${res.data.deleted} backup(s)`);
      }

      if (res.data.failed > 0) {
        toast.error(`Failed to delete ${res.data.failed} backup(s)`);
      }

      setSelected(new Set());
      setDeleteDialogOpen(false);
      onComplete?.();
    } catch (err) {
      toast.error(err.message || "Failed to delete backups");
    } finally {
      setDeleting(false);
    }
  };

  if (backups.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <Checkbox
          checked={selected.size === backups.length}
          onCheckedChange={toggleSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          {selected.size === 0
            ? "Select backups for bulk operations"
            : `${selected.size} backup(s) selected`}
        </span>

        {selected.size > 0 && (
          <div className="flex gap-2 ml-auto">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Add checkboxes to backup rows */}
      <div className="space-y-2">
        {backups.map((backup) => (
          <div
            key={backup.id}
            className={`flex items-center gap-4 p-3 border rounded-lg transition-colors ${
              selected.has(backup.id)
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                : "hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            <Checkbox
              checked={selected.has(backup.id)}
              onCheckedChange={() => toggleSelect(backup.id)}
            />
            <div className="flex-1">
              <div className="font-medium">{backup.name}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(backup.createdAt).toLocaleString()}
              </div>
            </div>
            <Badge className={getStatusBadgeColor(backup.status)}>
              {backup.status}
            </Badge>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} backup(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The backup files will be permanently
              deleted from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getStatusBadgeColor(status) {
  const colors = {
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    queued: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  };
  return colors[status] || colors.queued;
}