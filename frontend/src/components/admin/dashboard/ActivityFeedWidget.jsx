"use client";

import Link from "next/link";
import { ArrowRight, Server, HardDrive, DollarSign, Ticket, Puzzle, Zap, Shield, Settings, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG = {
  infrastructure: { icon: Server,      label: "Infra"      },
  backup:         { icon: HardDrive,   label: "Backup"     },
  billing:        { icon: DollarSign,  label: "Billing"    },
  support:        { icon: Ticket,      label: "Support"    },
  plugin:         { icon: Puzzle,      label: "Plugin"     },
  automation:     { icon: Zap,         label: "Automation" },
  auth:           { icon: Shield,      label: "Auth"       },
  system:         { icon: Settings,    label: "System"     },
};

const SEVERITY_STYLE = {
  success: { dot: "bg-foreground",        ring: "ring-foreground/20"    },
  danger:  { dot: "bg-destructive",       ring: "ring-destructive/20"   },
  warning: { dot: "bg-foreground/60",     ring: "ring-foreground/10"    },
  auth:    { dot: "bg-foreground/80",     ring: "ring-foreground/10"    },
  info:    { dot: "bg-muted-foreground/40", ring: "ring-muted/20"       },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function FeedRow({ entry }) {
  const cat = CATEGORY_CONFIG[entry.category] ?? CATEGORY_CONFIG.system;
  const CatIcon = cat.icon;
  const sev = SEVERITY_STYLE[entry.severity] ?? SEVERITY_STYLE.info;

  return (
    <div className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Icon with severity dot */}
      <div className="relative shrink-0 mt-0.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted group-hover:bg-muted/70 transition-colors">
          <CatIcon className="h-3.5 w-3.5 text-foreground" />
        </div>
        <span className={cn(
          "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card",
          sev.dot
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug truncate">{entry.action}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {entry.actor && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{entry.actor}</span>
          )}
          {entry.ip && (
            <span className="text-[11px] text-muted-foreground/50 hidden sm:inline">· {entry.ip}</span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-4 rounded-sm">
          {cat.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground tabular-nums">{timeAgo(entry.createdAt)}</span>
      </div>
    </div>
  );
}

export function ActivityFeedWidget({ data = [], loading }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              System Activity
              {!loading && data.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                  Live
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Real-time audit trail · {loading ? "—" : `${data.length} events`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
            <Link href="/admin/logs">
              All logs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-14 rounded-sm" />
                    <Skeleton className="h-2.5 w-10 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground/60">Events will appear here as they happen</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.map((entry) => (
                <FeedRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
