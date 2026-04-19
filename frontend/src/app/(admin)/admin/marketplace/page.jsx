"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, CheckCircle2, XCircle, Clock, Eye, Package,
  ChevronRight, AlertTriangle, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import MarketplaceAPI from "@/lib/api/marketplace";
import { formatDate } from "@/lib/utils";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    draft:        { label: "Draft",       cls: "bg-muted text-muted-foreground border-border" },
    submitted:    { label: "Submitted",   cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" },
    under_review: { label: "Under Review",cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" },
    approved:     { label: "Approved",    cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" },
    rejected:     { label: "Rejected",    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

// ── Approve / Reject dialog ───────────────────────────────────────────────────

function ReviewDialog({ plugin, action, open, onClose, onDone }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy]   = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    setBusy(true);
    try {
      if (action === "approve") {
        await MarketplaceAPI.approvePlugin(plugin.id, notes);
        toast({ title: "Plugin approved", description: `${plugin.name} is now live on the marketplace.` });
      } else {
        await MarketplaceAPI.rejectPlugin(plugin.id, notes);
        toast({ title: "Plugin rejected", description: `${plugin.name} has been rejected.` });
      }
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: "Action failed", description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{action} Plugin</DialogTitle>
          <DialogDescription>
            {action === "approve"
              ? `Approve "${plugin?.name}" — it will become publicly visible on the marketplace.`
              : `Reject "${plugin?.name}" — the developer will be notified.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="notes">{action === "approve" ? "Approval notes (optional)" : "Rejection reason (optional)"}</Label>
          <Textarea
            id="notes"
            placeholder={action === "approve" ? "Any notes for the developer…" : "Explain why the plugin was rejected…"}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={busy}
            variant={action === "reject" ? "destructive" : "default"}
            className="gap-2"
          >
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : action === "approve" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Plugin submission row ─────────────────────────────────────────────────────

function SubmissionRow({ plugin, canApprove, onAction }) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-lg font-bold text-muted-foreground">
        {plugin.iconUrl
          ? <img src={plugin.iconUrl} alt={plugin.name} className="h-8 w-8 object-contain rounded" />
          : (plugin.name?.[0] ?? "P")}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">{plugin.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{plugin.slug}</span>
          <StatusBadge status={plugin.status} />
          {plugin.version && <span className="text-xs text-muted-foreground">v{plugin.version}</span>}
        </div>
        {plugin.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plugin.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          Submitted {formatDate(plugin.updatedAt ?? plugin.createdAt, "short")}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canApprove && plugin.status === "under_review" && (
          <>
            <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => onAction(plugin, "approve")}>
              <CheckCircle2 className="h-3.5 w-3.5" />Approve
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onAction(plugin, "reject")}>
              <XCircle className="h-3.5 w-3.5" />Reject
            </Button>
          </>
        )}
        {canApprove && plugin.status === "submitted" && (
          <Button size="sm" variant="outline" className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
            onClick={() => onAction(plugin, "approve")}>
            <Eye className="h-3.5 w-3.5" />Review
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 py-4">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex gap-2 shrink-0">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketplaceManagementPage() {
  const [plugins, setPlugins]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reviewing, setReviewing] = useState(null); // { plugin, action }
  const { canApprovePlugins } = usePermissions();
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MarketplaceAPI.listAllPlugins();
      setPlugins(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Load failed", description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs = {
    pending:  plugins.filter(p => p.status === "submitted" || p.status === "under_review"),
    approved: plugins.filter(p => p.status === "approved"),
    rejected: plugins.filter(p => p.status === "rejected"),
    all:      plugins,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Marketplace Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, approve, and reject plugin submissions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending Review", value: tabs.pending.length,  color: "text-amber-600 dark:text-amber-400" },
            { label: "Approved",       value: tabs.approved.length, color: "text-green-600 dark:text-green-400" },
            { label: "Rejected",       value: tabs.rejected.length, color: "text-red-500" },
            { label: "Total",          value: plugins.length,       color: "text-foreground" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {tabs.pending.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{tabs.pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {Object.entries(tabs).map(([key, list]) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Card>
              <CardContent className="p-0 px-4 divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                ) : list.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No {key === "all" ? "" : key} submissions</p>
                  </div>
                ) : (
                  list.map(plugin => (
                    <SubmissionRow
                      key={plugin.id}
                      plugin={plugin}
                      canApprove={canApprovePlugins}
                      onAction={(p, action) => setReviewing({ plugin: p, action })}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {reviewing && (
        <ReviewDialog
          plugin={reviewing.plugin}
          action={reviewing.action}
          open={!!reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load(); }}
        />
      )}
    </div>
  );
}
