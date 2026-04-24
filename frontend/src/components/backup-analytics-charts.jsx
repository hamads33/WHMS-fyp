// ============================================================================
// FILE: components/backup-analytics-charts.jsx
// PURPOSE: Beautiful charts for backup analytics (no external chart library)
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";

export function BackupAnalyticsCharts() {
  const [timeline, setTimeline] = useState([]);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await backupApi(`/analytics/timeline?period=${period}`);
        setTimeline(res.data?.timeline || []);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const maxTotal = Math.max(...timeline.map((d) => d.total), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup Timeline</CardTitle>
        <CardDescription>Backup activity over time</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="mb-4">
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="space-y-4">
            {/* Bar Chart */}
            <div className="space-y-2">
              {timeline.map((item, index) => {
                const successWidth = (item.successful / maxTotal) * 100;
                const failedWidth = (item.failed / maxTotal) * 100;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.date}</span>
                      <span>{item.total} backups</span>
                    </div>
                    <div className="flex gap-1 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {item.successful > 0 && (
                        <div
                          className="bg-green-500 hover:bg-green-600 transition-all duration-200 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${successWidth}%` }}
                          title={`${item.successful} successful`}
                        >
                          {item.successful > 0 && item.successful}
                        </div>
                      )}
                      {item.failed > 0 && (
                        <div
                          className="bg-red-500 hover:bg-red-600 transition-all duration-200 flex items-center justify-center text-xs text-white font-medium"
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

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {timeline.reduce((sum, d) => sum + d.successful, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {timeline.reduce((sum, d) => sum + d.failed, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatBytes(
                    timeline.reduce((sum, d) => sum + d.storageUsedBytes, 0)
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Total Size</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function BackupTypeDistribution() {
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await backupApi("/analytics/type-distribution");
        setDistribution(res.data || []);
      } catch (err) {
        console.error("Failed to load distribution:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || distribution.length === 0) return null;

  const total = distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup Types</CardTitle>
        <CardDescription>Distribution by backup type</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {distribution.map((item, index) => {
          const percentage = ((item.count / total) * 100).toFixed(1);
          const colors = [
            "bg-blue-500",
            "bg-green-500",
            "bg-purple-500",
            "bg-orange-500",
          ];

          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium capitalize">{item.type}</span>
                <span className="text-muted-foreground">
                  {item.count} ({percentage}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors[index % colors.length]} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{item.successRate}% success rate</span>
                <span>{formatBytes(item.totalSizeBytes)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}