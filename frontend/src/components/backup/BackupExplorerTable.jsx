"use client";

import { useEffect, useState, useCallback } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, RefreshCw, MoreHorizontal, Download,
  Trash2, FileText, RotateCcw, ChevronUp, ChevronDown,
  ChevronsUpDown, Database, CheckCircle2, AlertCircle,
  Clock, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  success: { label: "Success", icon: CheckCircle2, badge: "border-border text-foreground"                            },
  failed:  { label: "Failed",  icon: AlertCircle,  badge: "border-destructive/30 bg-destructive/10 text-destructive" },
  running: { label: "Running", icon: Loader2,      badge: "border-border text-foreground"                            },
  queued:  { label: "Queued",  icon: Clock,        badge: "border-border text-muted-foreground"                      },
};

const STATUS_FILTERS = ["all", "success", "failed", "running", "queued"];
const TYPE_FILTERS   = ["all", "full", "incremental", "differential"];

export function BackupExplorerTable({ onUpdate }) {
  const [backups, setBackups]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter]     = useState("all");
  const [sortKey, setSortKey]           = useState("createdAt");
  const [sortDir, setSortDir]           = useState("desc");
  const [selected, setSelected]         = useState(new Set());
  const [page, setPage]                 = useState(0);
  const PAGE_SIZE = 10;

  const load = useCallback(() => {
    setLoading(true);
    backupApi("/")
      .then((r) => setBackups(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this backup?")) return;
    try {
      await backupApi(`/${id}`, { method: "DELETE" });
      toast.success("Backup deleted");
      load(); onUpdate?.();
    } catch (e) { toast.error(e.message || "Delete failed"); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} backups?`)) return;
    try {
      await backupApi("/bulk-delete", { method: "POST", body: JSON.stringify({ backupIds: [...selected] }) });
      toast.success(`${selected.size} backups deleted`);
      setSelected(new Set()); load(); onUpdate?.();
    } catch (e) { toast.error(e.message || "Bulk delete failed"); }
  };

  const filtered = backups
    .filter((b) => {
      const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      const matchType   = typeFilter   === "all" || b.type   === typeFilter;
      return matchSearch && matchStatus && matchType;
    })
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "sizeBytes") { av = Number(av || 0); bv = Number(bv || 0); }
      if (sortKey === "createdAt") { av = new Date(av);    bv = new Date(bv);    }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

  const paginated   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const toggleRow   = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll   = () => selected.size === paginated.length ? setSelected(new Set()) : setSelected(new Set(paginated.map(b => b.id)));

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  const FilterPill = ({ value, current, onClick }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all capitalize",
        current === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {value}
    </button>
  );

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary border border-border">
              <Database className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Backup Explorer</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} records</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={load} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search backups..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 h-8 text-xs rounded-lg"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-secondary">
            {STATUS_FILTERS.map(s => <FilterPill key={s} value={s} current={statusFilter} onClick={() => { setStatusFilter(s); setPage(0); }} />)}
          </div>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-secondary">
            {TYPE_FILTERS.map(t => <FilterPill key={t} value={t} current={typeFilter} onClick={() => { setTypeFilter(t); setPage(0); }} />)}
          </div>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-xl bg-secondary border border-border">
            <span className="text-xs font-semibold text-foreground">{selected.size} selected</span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Selected
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-border bg-secondary/50">
                <th className="w-8 px-4 py-2.5">
                  <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                {[
                  { key: "name",          label: "Name"      },
                  { key: "type",          label: "Type"      },
                  { key: "status",        label: "Status"    },
                  { key: "sizeBytes",     label: "Size"      },
                  { key: "createdAt",     label: "Created"   },
                  { key: "retentionDays", label: "Retention" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1">{label}<SortIcon col={key} /></div>
                  </th>
                ))}
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted/30 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No backups found</p>
                  </td>
                </tr>
              ) : (
                paginated.map((b) => {
                  const cfg       = STATUS_CONFIG[b.status] || STATUS_CONFIG.queued;
                  const Icon      = cfg.icon;
                  const isSelected = selected.has(b.id);
                  const expiresAt  = b.finishedAt || b.createdAt
                    ? new Date(new Date(b.finishedAt || b.createdAt).getTime() + (b.retentionDays || 30) * 86400000)
                    : null;
                  const daysLeft   = expiresAt ? Math.ceil((expiresAt - new Date()) / 86400000) : null;

                  return (
                    <tr key={b.id} className={cn(
                      "border-t border-border transition-colors hover:bg-secondary/50",
                      isSelected && "bg-secondary"
                    )}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleRow(b.id)} onClick={e => e.stopPropagation()} className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground truncate max-w-[200px] block">{b.name}</span>
                        <span className="text-[10px] text-muted-foreground">#{b.id}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{b.type || "full"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-[10px] gap-1", cfg.badge)}>
                          <Icon className={cn("h-3 w-3", b.status === "running" && "animate-spin")} />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground tabular-nums">
                        {b.sizeBytes ? formatBytes(Number(b.sizeBytes)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {new Date(b.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        {daysLeft !== null ? (
                          <span className={cn("text-xs font-semibold", daysLeft <= 0 ? "text-destructive" : "text-muted-foreground")}>
                            {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl">
                            <DropdownMenuItem className="gap-2 text-xs cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> Restore</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs cursor-pointer"><Download className="h-3.5 w-3.5" /> Download</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs cursor-pointer"><FileText className="h-3.5 w-3.5" /> View Logs</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-xs text-destructive cursor-pointer focus:text-destructive" onClick={() => handleDelete(b.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[11px] text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronDown className="h-3.5 w-3.5 rotate-90" />
              </Button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    "h-7 w-7 rounded-lg text-[11px] font-semibold transition-all",
                    page === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >{i + 1}</button>
              ))}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
