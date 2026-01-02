// ============================================================================
// FILE: app/admin/backups/analytics/page.jsx
// PURPOSE: Detailed analytics page with charts
// ============================================================================

"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { BackupAnalyticsCharts, BackupTypeDistribution } from "@/components/backup-analytics-charts";
import { BackupStatsDashboard } from "@/components/backup-stats-dashboard";

export default function BackupAnalyticsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Backup Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Detailed insights and trends
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <BackupStatsDashboard />

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BackupAnalyticsCharts />
          <BackupTypeDistribution />
        </div>
      </div>
    </div>
  );
}