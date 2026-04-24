"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, AlertCircle, Clock, Loader2,
  PlayCircle, Activity, Archive, RefreshCw
} from "lucide-react";

const EVENT_CFG = {
  success: { label: "Completed", icon: CheckCircle2, dot: "bg-foreground",  badge: "border-border text-foreground"                            },
  failed:  { label: "Failed",    icon: AlertCircle,  dot: "bg-destructive", badge: "border-destructive/30 bg-destructive/10 text-destructive" },
  running: { label: "Running",   icon: Loader2,      dot: "bg-foreground animate-pulse", badge: "border-border text-foreground"               },
  queued:  { label: "Queued",    icon: Clock,        dot: "bg-muted-foreground",          badge: "border-border text-muted-foreground"         },
};

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function BackupActivityTimeline() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    backupApi("/analytics/timeline-events?limit=20")
      .then((r) => setEvents(r.data?.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary border border-border">
              <Activity className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Real-Time Activity Timeline</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recent backup operations & events</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-muted/30 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-48 bg-muted/30 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted/20 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Archive className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">No backup activity yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
            {events.map((event, idx) => {
              const cfg      = EVENT_CFG[event.status] || EVENT_CFG.queued;
              const Icon     = cfg.icon;
              const isLast   = idx === events.length - 1;
              const duration = formatDuration(event.duration);

              return (
                <div key={event.id} className="flex gap-3 group">
                  {/* Dot + line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center ring-4 ring-background shrink-0",
                      cfg.dot
                    )}>
                      <Icon className={cn(
                        "h-3.5 w-3.5 text-background",
                        event.status === "running" && "animate-spin"
                      )} />
                    </div>
                    {!isLast && <div className="w-px flex-1 mt-1 mb-1 bg-border min-h-[20px]" />}
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate leading-tight">{event.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", cfg.badge)}>
                            {cfg.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground capitalize">{event.type}</span>
                          {event.sizeBytes > 0 && (
                            <span className="text-[10px] text-muted-foreground">{formatBytes(event.sizeBytes)}</span>
                          )}
                          {duration && <span className="text-[10px] text-muted-foreground">{duration}</span>}
                        </div>
                        {event.errorMessage && (
                          <p className="text-[10px] text-destructive mt-1 truncate">{event.errorMessage}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                        {timeAgo(event.createdAt)}
                      </span>
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
