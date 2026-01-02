// ============================================================================
// FILE: components/backup-stats-dashboard.jsx
// PURPOSE: Beautiful statistics dashboard with cards and metrics
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import {
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  TrendingUp,
  Activity,
  Calendar,
} from "lucide-react";

export function BackupStatsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await backupApi("/stats");
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Backups",
      value: stats.totalBackups,
      icon: Database,
      description: `${stats.backupsToday} created today`,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      icon: CheckCircle2,
      description: `${stats.successfulBackups} successful`,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Failed",
      value: stats.failedBackups,
      icon: XCircle,
      description: "Need attention",
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      title: "Running",
      value: stats.runningBackups,
      icon: Activity,
      description: "In progress",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Total Storage",
      value: formatBytes(stats.totalStorageUsedBytes),
      icon: HardDrive,
      description: `Avg: ${formatBytes(stats.averageBackupSizeBytes)}`,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "This Week",
      value: stats.backupsThisWeek,
      icon: TrendingUp,
      description: `${stats.backupsThisMonth} this month`,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "Last Backup",
      value: formatRelativeTime(stats.lastBackupAt),
      icon: Clock,
      description: stats.lastBackupAt
        ? new Date(stats.lastBackupAt).toLocaleString()
        : "Never",
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/20",
    },
    {
      title: "Oldest Backup",
      value: formatRelativeTime(stats.oldestBackupAt),
      icon: Calendar,
      description: stats.oldestBackupAt
        ? new Date(stats.oldestBackupAt).toLocaleString()
        : "None",
      color: "text-gray-600",
      bgColor: "bg-gray-100 dark:bg-gray-900/20",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow duration-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}