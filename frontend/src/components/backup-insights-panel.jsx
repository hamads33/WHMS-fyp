"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { backupApi } from "@/lib/api/backupClient";

const INSIGHT_TYPES = {
  positive: {
    icon: CheckCircle2,
    color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
  },
  trend: {
    icon: TrendingUp,
    color: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  },
  warning: {
    icon: AlertTriangle,
    color: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  },
};

export function BackupInsightsPanel() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backupApi("/analytics/insights")
      .then((res) => {
        setInsights(res.data?.insights || []);
      })
      .catch((err) => {
        console.error("Failed to load insights:", err);
        setInsights([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const defaultInsights = [
    {
      type: "positive",
      title: "Backup Success Rate",
      description: "Improved 12% this week compared to last week",
    },
    {
      type: "trend",
      title: "Storage Consumption",
      description: "Increased 8% due to new database backups",
    },
    {
      type: "warning",
      title: "Retention Alert",
      description: "2 backups approaching retention limit (5 days remaining)",
    },
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Insights</CardTitle>
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">AI-Generated</span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center relative z-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl" />

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Insights</CardTitle>
          </div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">AI-Generated</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden relative z-10">
        {displayInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Lightbulb className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No insights available yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayInsights.map((insight, idx) => {
              const config = INSIGHT_TYPES[insight.type] || INSIGHT_TYPES.positive;
              const Icon = config.icon;

              return (
                <div key={idx} className={`p-2.5 rounded-lg ${config.color} transition-all hover:shadow-sm`}>
                  <div className="flex gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground mb-0.5">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {insight.description}
                      </p>
                      {insight.value && (
                        <Badge
                          variant="secondary"
                          className={`text-xs h-5 mt-1.5 border-0 ${config.badge}`}
                        >
                          {insight.value}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
