"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";
import {
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  HardDrive,
  Calendar,
  TrendingUp,
} from "lucide-react";

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    default: {
      bg: "bg-white dark:bg-gray-900",
      icon: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
      value: "text-gray-900 dark:text-white",
    },
    green: {
      bg: "bg-white dark:bg-gray-900",
      icon: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400",
      value: "text-emerald-700 dark:text-emerald-400",
    },
    red: {
      bg: "bg-white dark:bg-gray-900",
      icon: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
      value: "text-red-700 dark:text-red-400",
    },
    blue: {
      bg: "bg-white dark:bg-gray-900",
      icon: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
      value: "text-blue-700 dark:text-blue-400",
    },
    purple: {
      bg: "bg-white dark:bg-gray-900",
      icon: "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400",
      value: "text-purple-700 dark:text-purple-400",
    },
  };

  const c = colors[color] || colors.default;

  return (
    <div className={`${c.bg} rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`mt-4 text-3xl font-bold ${c.value}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</div>
      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">{subtitle}</div>
    </div>
  );
}

export function ModernStatsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backupApi("/stats")
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Failed to load stats:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm animate-pulse"
          >
            <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="mt-4 h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="mt-2 h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="mt-1 h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Backups"
        value={stats.totalBackups}
        subtitle={`${stats.backupsToday} created today`}
        icon={Database}
        color="default"
      />
      <StatCard
        title="Successful"
        value={stats.successfulBackups}
        subtitle={`${stats.successRate}% success rate`}
        icon={CheckCircle2}
        color="green"
      />
      <StatCard
        title="Failed"
        value={stats.failedBackups}
        subtitle={stats.failedBackups > 0 ? "Requires attention" : "No failures"}
        icon={XCircle}
        color={stats.failedBackups > 0 ? "red" : "default"}
      />
      <StatCard
        title="In Progress"
        value={stats.runningBackups + stats.queuedBackups}
        subtitle={`${stats.runningBackups} running · ${stats.queuedBackups} queued`}
        icon={Loader2}
        color="blue"
      />
      <StatCard
        title="Storage Used"
        value={formatBytes(stats.totalStorageUsedBytes)}
        subtitle={`Avg ${formatBytes(stats.averageBackupSizeBytes)} per backup`}
        icon={HardDrive}
        color="purple"
      />
      <StatCard
        title="This Month"
        value={stats.backupsThisMonth}
        subtitle={`${stats.backupsThisWeek} this week`}
        icon={Calendar}
        color="default"
      />
    </div>
  );
}
