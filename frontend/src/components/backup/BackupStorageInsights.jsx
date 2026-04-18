"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HardDrive, TrendingUp } from "lucide-react";

// Use shadcn chart tokens for segment colors
const SEGMENT_SHADES = [
  "hsl(var(--foreground))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function DistributionBar({ items }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="h-2 w-full flex rounded-full overflow-hidden gap-px">
      {items.map((item, i) => (
        <div
          key={item.name}
          className="h-full transition-all duration-700"
          style={{
            width:      `${(item.value / total) * 100}%`,
            background: SEGMENT_SHADES[i % SEGMENT_SHADES.length],
          }}
          title={`${item.name}: ${item.value}`}
        />
      ))}
    </div>
  );
}

export function BackupStorageInsights() {
  const [typeData, setTypeData] = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      backupApi("/analytics/type-distribution"),
      backupApi("/stats"),
    ]).then(([tRes, sRes]) => {
      if (tRes.status === "fulfilled") {
        const raw = tRes.value.data || [];
        setTypeData(raw.map((d) => ({ name: d.type, value: d.count, sizeBytes: d.totalSizeBytes || 0 })));
      }
      if (sRes.status === "fulfilled") setStats(sRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const providerData = stats?.storageProviderBreakdown
    ? Object.entries(stats.storageProviderBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const totalBytes = stats?.totalStorageUsedBytes ?? 0;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-secondary border border-border">
            <HardDrive className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">Storage Intelligence</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Capacity & distribution analysis</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted/30 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Total KPI */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Stored</p>
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  {formatBytes(totalBytes)}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-background border border-border">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
            </div>

            {/* By type */}
            {typeData.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">By Type</p>
                <DistributionBar items={typeData} />
                <div className="space-y-1.5">
                  {typeData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: SEGMENT_SHADES[i % SEGMENT_SHADES.length] }} />
                      <span className="text-xs text-muted-foreground capitalize flex-1 truncate">{item.name}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{item.value}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{formatBytes(item.sizeBytes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By provider */}
            {providerData.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">By Provider</p>
                <DistributionBar items={providerData} />
                <div className="space-y-1.5">
                  {providerData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: SEGMENT_SHADES[i % SEGMENT_SHADES.length] }} />
                      <span className="text-xs text-muted-foreground capitalize flex-1 truncate">{item.name}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats row */}
            {stats && (
              <div className="grid grid-cols-2 gap-2 mt-auto">
                {[
                  { label: "Avg Size",    value: formatBytes(stats.averageBackupSizeBytes || 0) },
                  { label: "This Month",  value: stats.backupsThisMonth ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 rounded-xl bg-secondary border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
