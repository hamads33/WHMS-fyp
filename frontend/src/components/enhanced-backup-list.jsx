// ============================================================================
// FILE: components/enhanced-backup-list.jsx
// PURPOSE: Beautiful backup list with search, filter, and actions
// ============================================================================

"use client";

import { useState } from "react";
import { useBackups } from "@/hooks/useBackups";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { formatBytes, formatRelativeTime, getStatusColor } from "@/lib/utils";
import {
  Download,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  Copy,
  FileCheck,
  XCircle,
  Search,
} from "lucide-react";
import { BackupVerifyModal } from "./backup-verify-modal";
import { toast } from "sonner";

export function EnhancedBackupList() {
  const { backups, loading, deleteBackup, cancelBackup, cloneBackup, refresh } = useBackups({
    autoRefresh: true,
    refreshInterval: 10000,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifyBackup, setVerifyBackup] = useState(null);

  // Filter backups
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
      toast.success("Backup deleted successfully");
    } catch (err) {
      toast.error(err.message || "Failed to delete backup");
    }
  };

  const handleCancel = async (backup) => {
    try {
      await cancelBackup(backup.id);
      toast.success("Backup cancelled");
    } catch (err) {
      toast.error(err.message || "Failed to cancel backup");
    }
  };

  const handleClone = async (backup) => {
    try {
      await cloneBackup(backup.id);
      toast.success("Backup cloned successfully");
    } catch (err) {
      toast.error(err.message || "Failed to clone backup");
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backups</CardTitle>
              <CardDescription>
                {filteredBackups.length} of {backups.length} backups
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search backups..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
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
        </CardHeader>
        <CardContent>
          {loading && backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading backups...
            </div>
          ) : filteredBackups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all"
                ? "No backups match your filters"
                : "No backups found"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBackups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">
                      {backup.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {backup.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(backup.status)}>
                        {backup.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {backup.sizeBytes
                        ? formatBytes(backup.sizeBytes)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {formatRelativeTime(backup.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
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
                            className="gap-2 text-red-600"
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
        </CardContent>
      </Card>

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