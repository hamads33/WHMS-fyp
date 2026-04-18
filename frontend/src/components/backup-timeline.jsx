"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Trash2,
  Database,
  PlayCircle2,
  Archive,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { backupApi } from "@/lib/api/backupClient";

const EVENT_TYPES = {
  started: {
    label: "Backup Started",
    icon: PlayCircle2,
    color: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    badge: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  },
  completed: {
    label: "Backup Completed",
    icon: CheckCircle2,
    color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
  },
  failed: {
    label: "Backup Failed",
    icon: AlertCircle,
    color: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
    badge: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
  },
  retention: {
    label: "Retention Cleanup",
    icon: Archive,
    color: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  },
  manual: {
    label: "Manual Backup",
    icon: Database,
    color: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
    badge: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  },
};

export function BackupTimeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = () => {
    backupApi("/analytics/timeline-events?limit=10")
      .then((res) => {
        setEvents(res.data?.events || []);
      })
      .catch((err) => {
        console.error("Failed to load timeline events:", err);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleClearTimeline = () => {
    setEvents([]);
  };

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">System Generated</span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearTimeline}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              title="Clear timeline"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">System Generated</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No events yet</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {events.filter(event => event.type !== 'failed').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No successful events</p>
                </div>
              ) : (
                events
                  .filter(event => event.type !== 'failed')
                  .map((event, idx) => {
                    const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.completed;
                    const Icon = eventType.icon;

                    return (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-muted/20 last:border-0 last:pb-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${eventType.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-foreground">
                              {eventType.label}
                            </span>
                            {event.status && (
                              <Badge
                                variant="secondary"
                                className={`text-xs h-5 ${eventType.badge} border-0`}
                              >
                                {event.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(event.timestamp)}
                          </p>
                          {event.duration && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Duration: {event.duration}
                            </p>
                          )}
                          {event.details && (
                            <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">
                              {event.details}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
