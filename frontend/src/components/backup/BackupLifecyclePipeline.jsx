"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GitBranch, Plus, Archive, Shield, AlertTriangle, Trash2, ArrowRight } from "lucide-react";

const STAGES = [
  { key: "created",  label: "Created",  icon: Plus          },
  { key: "stored",   label: "Stored",   icon: Archive       },
  { key: "retained", label: "Retained", icon: Shield        },
  { key: "expiring", label: "Expiring", icon: AlertTriangle, warn: true },
  { key: "deleted",  label: "Deleted",  icon: Trash2,        destructive: true },
];

export function BackupLifecyclePipeline() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backupApi("/analytics/lifecycle-stats")
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxVal = stats ? Math.max(...STAGES.map((s) => stats[s.key] || 0), 1) : 1;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-secondary border border-border">
            <GitBranch className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">Backup Lifecycle</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Storage lifecycle intelligence</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between gap-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {STAGES.map((stage, idx) => {
                const count = stats?.[stage.key] ?? 0;
                const pct   = Math.round((count / maxVal) * 100);
                const Icon  = stage.icon;

                return (
                  <div key={stage.key}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all hover:scale-[1.01]",
                      stage.destructive && count > 0
                        ? "bg-destructive/8 border-destructive/20"
                        : stage.warn && count > 0
                          ? "bg-secondary border-border"
                          : "bg-secondary border-border"
                    )}>
                      <div className="p-1.5 rounded-lg bg-background border border-border">
                        <Icon className={cn(
                          "h-3.5 w-3.5",
                          stage.destructive && count > 0 ? "text-destructive"
                            : stage.warn && count > 0 ? "text-foreground"
                            : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                          <span className={cn(
                            "text-sm font-bold tabular-nums",
                            stage.destructive && count > 0 ? "text-destructive" : "text-foreground"
                          )}>{count.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              stage.destructive && count > 0 ? "bg-destructive"
                                : "bg-foreground"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {idx < STAGES.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {stats && (
              <div className={cn(
                "flex items-start gap-2 p-3 rounded-xl border text-[11px] font-semibold",
                (stats.expiring > 0 || stats.deleted > 0)
                  ? "bg-destructive/8 border-destructive/20 text-destructive"
                  : "bg-secondary border-border text-muted-foreground"
              )}>
                {(stats.expiring > 0 || stats.deleted > 0)
                  ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  : <Shield className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>
                  {stats.expiring > 0
                    ? `${stats.expiring} backup${stats.expiring > 1 ? "s" : ""} expiring soon — review retention policy`
                    : "Retention lifecycle healthy"}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
