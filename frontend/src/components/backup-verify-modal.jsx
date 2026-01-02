// ============================================================================
// FILE: components/backup-verify-modal.jsx
// PURPOSE: Backup integrity verification modal
// ============================================================================

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function BackupVerifyModal({ backup, open, onOpenChange }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setResult(null);

      const res = await backupApi(`/${backup.id}/verify`, {
        method: "POST",
      });

      setResult(res.data);

      if (res.data.exists && res.data.matches) {
        toast.success("Backup verification successful");
      } else {
        toast.error("Backup verification failed");
      }
    } catch (err) {
      toast.error(err.message || "Verification failed");
      setResult({
        exists: false,
        error: err.message,
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Verify Backup Integrity</DialogTitle>
          <DialogDescription>
            Check if backup file exists and size matches records
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Backup Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Backup Name</span>
              <span className="font-medium">{backup.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Recorded Size
              </span>
              <span className="font-medium">
                {formatBytes(backup.sizeBytes)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge>{backup.status}</Badge>
            </div>
          </div>

          {/* Verification Result */}
          {result && (
            <div
              className={`rounded-lg border p-4 space-y-3 ${
                result.exists && result.matches
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.exists && result.matches ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900 dark:text-green-100">
                      Verification Successful
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900 dark:text-red-100">
                      Verification Failed
                    </span>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>File Exists:</span>
                  <Badge
                    variant={result.exists ? "default" : "destructive"}
                  >
                    {result.exists ? "Yes" : "No"}
                  </Badge>
                </div>

                {result.exists && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Actual Size:</span>
                      <span className="font-medium">
                        {formatBytes(result.size)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Size Matches:</span>
                      <Badge
                        variant={result.matches ? "default" : "destructive"}
                      >
                        {result.matches ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </>
                )}

                {result.error && (
                  <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-100 text-xs">
                    {result.error}
                  </div>
                )}
              </div>

              {!result.matches && result.exists && (
                <div className="flex items-start gap-2 mt-3 p-2 rounded bg-yellow-100 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100 text-xs">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Size mismatch detected. The backup file may be corrupted or
                    incomplete.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          {!result && !verifying && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900">
              <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">What is verification?</p>
                <p className="text-xs">
                  Verification checks if the backup file exists in storage and
                  if its size matches the recorded size. This helps detect
                  corrupted or missing backups.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleVerify} disabled={verifying}>
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                Verify Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}