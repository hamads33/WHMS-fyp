// ============================================================================
// FILE: app/admin/backups/page.jsx
// PURPOSE: Modern black & white backup dashboard (FIXED - Unique Keys)
// ============================================================================

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Play, RefreshCw } from "lucide-react";
import { ModernStatsDashboard } from "@/components/modern-stats-dashboard";
import { ModernBackupList } from "@/components/modern-backup-list";
import { ModernAnalyticsSection } from "@/components/modern-analytics-section";
import { CreateBackupModal } from "@/components/create-backup-modal";
import { backupApi } from "@/lib/api/backupClient";
import { toast } from "sonner";

export default function BackupDashboard() {
  const [createOpen, setCreateOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      toast.error(err.message || "Failed to start backup");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              Backup Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage, monitor, and restore your backups
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runBackupNow}
              disabled={running}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {running ? "Running..." : "Quick Backup"}
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <Plus className="h-4 w-4" />
              Create Backup
            </Button>
          </div>
        </div>

        {/* Stats Cards - FIX: Unique key */}
        <ModernStatsDashboard key={`stats-${refreshKey}`} />

        {/* Analytics Section - FIX: Unique key */}
        <ModernAnalyticsSection key={`analytics-${refreshKey}`} />

        {/* Backup List - FIX: Unique key */}
        <ModernBackupList 
          key={`list-${refreshKey}`} 
          onUpdate={() => setRefreshKey(prev => prev + 1)} 
        />

        {/* Create Modal */}
        <CreateBackupModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => {
            toast.success("Backup created successfully");
            setRefreshKey(prev => prev + 1);
          }}
        />
      </div>
    </div>
  );
}