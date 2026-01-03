// ============================================================================
// FILE: components/backup-verify-modal.jsx
// PURPOSE: Modern black & white verification modal
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
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-black border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-black dark:text-white">
            Verify Backup Integrity
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Check if backup file exists and size matches records
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Backup Info */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Backup Name
              </span>
              <span className="font-medium text-black dark:text-white">
                {backup.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Recorded Size
              </span>
              <span className="font-medium text-black dark:text-white">
                {formatBytes(backup.sizeBytes)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Status
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-black dark:bg-white text-white dark:text-black">
                {backup.status}
              </span>
            </div>
          </div>

          {/* Verification Result */}
          {result && (
            <div
              className={`rounded-lg border p-4 space-y-3 ${
                result.exists && result.matches
                  ? "border-black dark:border-white bg-gray-50 dark:bg-gray-950"
                  : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.exists && result.matches ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-black dark:text-white" />
                    <span className="font-medium text-black dark:text-white">
                      Verification Successful
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Verification Failed
                    </span>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    File Exists:
                  </span>
                  <span
                    className={`font-medium ${
                      result.exists
                        ? "text-black dark:text-white"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {result.exists ? "Yes" : "No"}
                  </span>
                </div>

                {result.exists && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">
                        Actual Size:
                      </span>
                      <span className="font-medium text-black dark:text-white">
                        {formatBytes(result.size)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">
                        Size Matches:
                      </span>
                      <span
                        className={`font-medium ${
                          result.matches
                            ? "text-black dark:text-white"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {result.matches ? "Yes" : "No"}
                      </span>
                    </div>
                  </>
                )}

                {result.error && (
                  <div className="mt-2 p-2 rounded bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs border border-gray-200 dark:border-gray-800">
                    {result.error}
                  </div>
                )}
              </div>

              {!result.matches && result.exists && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Size mismatch detected. The backup file may be corrupted or
                    incomplete.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          {!result && !verifying && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
              <FileCheck className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium mb-1 text-black dark:text-white">
                  What is verification?
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Verification checks if the backup file exists in storage and
                  if its size matches the recorded size. This helps detect
                  corrupted or missing backups.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-200 dark:border-gray-800"
          >
            Close
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifying}
            className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
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