"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SearchEndpoints } from "./SearchEndpoints";
import { cn } from "@/lib/utils";
import { BookOpen, Lock, Globe } from "lucide-react";

export function DocsSidebar({ groups, activeTag, onTagClick, search, onSearchChange, spec }) {
  const totalEndpoints = groups.reduce((acc, g) => acc + g.endpoints.length, 0);

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-card h-screen sticky top-0 flex flex-col overflow-hidden">
      {/* Branding */}
      <div className="px-4 pt-5 pb-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <BookOpen className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">API Reference</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              v{spec?.info?.version || "1.0.0"}
            </p>
          </div>
        </div>

        <SearchEndpoints value={search} onChange={onSearchChange} />
      </div>

      {/* Tag list */}
      <ScrollArea className="flex-1 min-h-0 py-2">
        <div className="px-2 space-y-0.5">
          {groups.map(({ tag, endpoints }) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className={cn(
                "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-left transition-all duration-150",
                activeTag === tag
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="truncate">{tag}</span>
              <span
                className={cn(
                  "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-mono flex-shrink-0 tabular-nums",
                  activeTag === tag
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {endpoints.length}
              </span>
            </button>
          ))}
        </div>

        <Separator className="my-3 mx-2" />

        {/* Integration Guides link */}
        <div className="px-2 mb-1">
          <a
            href="/docs/integrations"
            className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
          >
            <Globe className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Integration Guides</span>
          </a>
        </div>

        <Separator className="my-3 mx-2" />

        {/* Auth badge */}
        {spec?.components?.securitySchemes?.BearerAuth && (
          <div className="mx-3 rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Auth</p>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Bearer token via{" "}
              <code className="font-mono bg-muted rounded px-1">Authorization</code> header
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mx-3 mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 border border-border p-2 text-center">
            <p className="text-base font-bold text-foreground tabular-nums">{groups.length}</p>
            <p className="text-[10px] text-muted-foreground">Groups</p>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-2 text-center">
            <p className="text-base font-bold text-foreground tabular-nums">{totalEndpoints}</p>
            <p className="text-[10px] text-muted-foreground">Endpoints</p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
