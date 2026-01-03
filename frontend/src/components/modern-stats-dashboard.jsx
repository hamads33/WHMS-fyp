// ============================================================================
// FILE: components/modern-stats-dashboard.jsx
// PURPOSE: Minimal black & white stats cards
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";
import {
  Database,
  CheckCircle2,
  XCircle,
  Activity,
  HardDrive,
  Clock,
} from "lucide-react";

export function ModernStatsDashboard() {
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
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 animate-pulse"
          >
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
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
      subtitle: `${stats.backupsToday} today`,
    },
    {
      title: "Successful",
      value: stats.successfulBackups,
      icon: CheckCircle2,
      subtitle: `${stats.successRate}% success rate`,
    },
    {
      title: "Failed",
      value: stats.failedBackups,
      icon: XCircle,
      subtitle: "Need attention",
    },
    {
      title: "Running",
      value: stats.runningBackups,
      icon: Activity,
      subtitle: "In progress",
    },
    {
      title: "Total Storage",
      value: formatBytes(stats.totalStorageUsedBytes),
      icon: HardDrive,
      subtitle: `Avg: ${formatBytes(stats.averageBackupSizeBytes)}`,
    },
    {
      title: "This Week",
      value: stats.backupsThisWeek,
      icon: Clock,
      subtitle: `${stats.backupsThisMonth} this month`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-black"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </div>
              <Icon className="h-5 w-5 text-gray-400 dark:text-gray-600" />
            </div>
            <div className="text-3xl font-bold text-black dark:text-white mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stat.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
}