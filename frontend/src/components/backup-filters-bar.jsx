"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, Grid2X2, List, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackupFiltersBar({
  onTypeChange,
  onStatusChange,
  onRetentionChange,
  onSearchChange,
  onViewChange,
  view = "table",
}) {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");

  const handleSearch = (value) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const handleDateRange = (value) => {
    setDateRange(value);
  };

  return (
    <div className="space-y-4">
      {/* Main filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          {/* Backup Type */}
          <Select onValueChange={onTypeChange}>
            <SelectTrigger className="w-full sm:w-40 h-9 text-sm rounded-lg border-muted/40 bg-white/70 dark:bg-zinc-900/60">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="files">Files</SelectItem>
              <SelectItem value="config">Config</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto h-9 gap-2 text-sm rounded-lg border-muted/40 bg-white/70 dark:bg-zinc-900/60"
              >
                <Calendar className="h-4 w-4" />
                {dateRange === "all" ? "Date Range" : dateRange}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="start">
              <div className="space-y-2">
                {[
                  { label: "Last 7 days", value: "7d" },
                  { label: "Last 30 days", value: "30d" },
                  { label: "Last 90 days", value: "90d" },
                  { label: "All time", value: "all" },
                ].map((item) => (
                  <Button
                    key={item.value}
                    variant={dateRange === item.value ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleDateRange(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Select onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-40 h-9 text-sm rounded-lg border-muted/40 bg-white/70 dark:bg-zinc-900/60">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
            </SelectContent>
          </Select>

          {/* Retention Filter */}
          <Select onValueChange={onRetentionChange}>
            <SelectTrigger className="w-full sm:w-40 h-9 text-sm rounded-lg border-muted/40 bg-white/70 dark:bg-zinc-900/60">
              <SelectValue placeholder="All Retentions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Retentions</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right side: Search + View Toggle */}
        <div className="flex gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search backups..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-9 text-sm rounded-lg border-muted/40 bg-white/70 dark:bg-zinc-900/60"
            />
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/20 border border-muted/30">
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0 rounded",
                view === "table"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onViewChange?.("table")}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0 rounded",
                view === "grid"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onViewChange?.("grid")}
              title="Grid view"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active filters summary */}
      <div className="text-xs text-muted-foreground">
        Showing filtered backups • Click filters to adjust
      </div>
    </div>
  );
}
