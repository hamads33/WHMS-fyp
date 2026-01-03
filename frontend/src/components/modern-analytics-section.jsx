// ============================================================================
// FILE: components/modern-analytics-section.jsx
// PURPOSE: Integrated analytics with black & white theme
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";
import { TrendingUp, BarChart3, Activity } from "lucide-react";

export function ModernAnalyticsSection() {
  const [timeline, setTimeline] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [timelineRes, healthRes] = await Promise.all([
          backupApi("/analytics/timeline?period=7d"),
          backupApi("/stats/health"),
        ]);
        setTimeline(timelineRes.data?.timeline || []);
        setHealth(healthRes.data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 animate-pulse"
          >
            <div className="h-48 bg-gray-100 dark:bg-gray-900 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const maxTotal = Math.max(...timeline.map((d) => d.total), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Timeline Chart */}
      <div className="lg:col-span-2 border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-black">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-black dark:text-white">
            7-Day Activity
          </h3>
        </div>

        <div className="space-y-3">
          {timeline.slice(-7).map((item, index) => {
            const successWidth = (item.successful / maxTotal) * 100;
            const failedWidth = (item.failed / maxTotal) * 100;

            return (
              <div key={index}>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                  <span>{item.total} backups</span>
                </div>
                <div className="flex gap-1 h-6 rounded overflow-hidden bg-gray-100 dark:bg-gray-900">
                  {item.successful > 0 && (
                    <div
                      className="bg-black dark:bg-white transition-all duration-200 flex items-center justify-center text-xs text-white dark:text-black font-medium"
                      style={{ width: `${successWidth}%` }}
                      title={`${item.successful} successful`}
                    >
                      {item.successful > 0 && item.successful}
                    </div>
                  )}
                  {item.failed > 0 && (
                    <div
                      className="bg-gray-400 dark:bg-gray-600 transition-all duration-200 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${failedWidth}%` }}
                      title={`${item.failed} failed`}
                    >
                      {item.failed > 0 && item.failed}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-black dark:text-white">
              {timeline.reduce((sum, d) => sum + d.successful, 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Successful
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">
              {timeline.reduce((sum, d) => sum + d.failed, 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Failed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-black dark:text-white">
              {formatBytes(
                timeline.reduce((sum, d) => sum + d.storageUsedBytes, 0)
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Storage Used
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-black">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-black dark:text-white">
            System Health
          </h3>
        </div>

        {health && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Overall Status
              </span>
              <span
                className={`text-sm font-medium ${
                  health.status === "healthy"
                    ? "text-black dark:text-white"
                    : "text-gray-400"
                }`}
              >
                {health.status === "healthy" ? "✓ Healthy" : "⚠ Degraded"}
              </span>
            </div>

            {Object.entries(health.checks || {}).map(([key, check]) => (
              <div
                key={key}
                className="flex items-center justify-between"
              >
                <span className="text-sm capitalize text-gray-600 dark:text-gray-300">
                  {key}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    check.status === "up" || check.status === "healthy"
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {check.status}
                </span>
              </div>
            ))}

            {health.checks?.queue && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Active Jobs
                  </span>
                  <span className="font-medium text-black dark:text-white">
                    {health.checks.queue.activeJobs}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Pending Jobs
                  </span>
                  <span className="font-medium text-black dark:text-white">
                    {health.checks.queue.pendingJobs}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}