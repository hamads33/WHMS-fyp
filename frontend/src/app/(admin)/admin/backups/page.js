// ============================================================================
// FILE: app/admin/backups/page.jsx
// PURPOSE: Beautiful main backup dashboard with all features
// ============================================================================

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Play, BarChart3 } from "lucide-react";
import { BackupStatsDashboard } from "@/components/backup-stats-dashboard";
import { BackupAnalyticsCharts, BackupTypeDistribution } from "@/components/backup-analytics-charts";
import { BackupHealthStatus } from "@/components/backup-health-status";
import { BackupRetentionSummary } from "@/components/backup-retention-summary";
import { EnhancedBackupList } from "@/components/enhanced-backup-list";
import { CreateBackupModal } from "@/components/create-backup-modal";
import { backupApi } from "@/lib/api/backupClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function BackupDashboard() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const runBackupNow = async () => {
    try {
      setRunning(true);
      await backupApi("", {
        method: "POST",
        body: JSON.stringify({
          name: `Quick Backup ${new Date().toLocaleString()}`,
          type: "full",
          retentionDays: 30,
        }),
      });
      toast.success("Backup started successfully");
    } catch (err) {
      toast.error(err.message || "Failed to start backup");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Backup Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage, monitor, and restore your backups
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/backups/analytics")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            <Button
              variant="outline"
              onClick={runBackupNow}
              disabled={running}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {running ? "Running..." : "Quick Backup"}
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4" />
              Create Backup
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <BackupStatsDashboard />

        {/* Charts and Health Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BackupAnalyticsCharts />
          </div>
          <div className="space-y-6">
            <BackupHealthStatus />
            <BackupRetentionSummary />
          </div>
        </div>

        {/* Type Distribution */}
        <BackupTypeDistribution />

        {/* Backup List */}
        <EnhancedBackupList />

        {/* Create Modal */}
        <CreateBackupModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => toast.success("Backup created successfully")}
        />
      </div>
    </div>
  );
}