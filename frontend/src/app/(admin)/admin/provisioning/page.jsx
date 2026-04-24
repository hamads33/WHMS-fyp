"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Server, RefreshCw, Loader2, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, Globe, Mail, Database,
  ShieldOff, ShieldCheck, Plus, TestTube2,
  Activity, Clock, Search, MoreHorizontal,
  Zap, Eye, RotateCw, Wifi, WifiOff,
  Terminal, ChevronRight, ArrowLeft, Copy, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ProvisioningAPI } from "@/lib/api/provisioning";
import { apiFetch } from "@/lib/api/client";

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    active:    { label: "Active",    cls: "bg-green-100 text-green-700 border-green-200" },
    suspended: { label: "Suspended", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    pending:   { label: "Pending",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
    deleted:   { label: "Deleted",   cls: "bg-red-100 text-red-700 border-red-200" },
    manual:    { label: "Manual",    cls: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${s.cls}`}>
      {s.label}
    </Badge>
  );
}

function jobStatusBadge(status) {
  const map = {
    pending:   { label: "Pending",   cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    running:   { label: "Running",   cls: "bg-blue-100 text-blue-700 border-blue-200",    spin: true },
    completed: { label: "Success",   cls: "bg-green-100 text-green-700 border-green-200" },
    failed:    { label: "Failed",    cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`text-xs font-medium gap-1 ${s.cls}`}>
      {s.spin
        ? <Loader2 size={10} className="animate-spin" />
        : <span className="opacity-70">●</span>}
      {s.label}
    </Badge>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtBytes(mb) {
  if (mb == null) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function fmtMs(ms) {
  if (ms == null) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtElapsed(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function colorizeLog(line) {
  if (/error|fail|exception/i.test(line)) return "text-red-400";
  if (/success|done|completed/i.test(line)) return "text-green-400";
  if (/running|starting|execut|cyberpanel/i.test(line)) return "text-blue-300";
  return "text-zinc-300";
}

// ── Connection status banner ──────────────────────────────────────────────────

function ConnectionBanner() {
  const [state, setState] = useState("idle");
  const [msg, setMsg] = useState("");

  async function test() {
    setState("testing");
    setMsg("");
    try {
      const data = await ProvisioningAPI.testConnection();
      if (data.connected) { setState("ok"); setMsg(data.message || "Connected"); }
      else { setState("fail"); setMsg(data.error || "Failed"); }
    } catch (e) {
      setState("fail");
      setMsg(e.message || "Connection failed");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {state === "ok" && (
        <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md">
          <Wifi size={12} /> {msg}
        </span>
      )}
      {state === "fail" && (
        <span className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md max-w-[260px] truncate">
          <WifiOff size={12} /> {msg}
        </span>
      )}
      <Button size="sm" variant="outline" onClick={test} disabled={state === "testing"}>
        {state === "testing"
          ? <><Loader2 size={13} className="animate-spin mr-1.5" />Testing…</>
          : <><TestTube2 size={13} className="mr-1.5" />Test SSH</>}
      </Button>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = "text-foreground" }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${color}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Account detail dialog ─────────────────────────────────────────────────────

function AccountDetailDialog({ account, onClose, onRefresh }) {
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [syncing, setSyncing] = useState(false);
  const [sslDomain, setSslDomain] = useState("");
  const [issuingSSL, setIssuingSSL] = useState(false);
  const [domainForm, setDomainForm] = useState({ domain: "", phpVersion: "8.1" });
  const [addingDomain, setAddingDomain] = useState(false);
  const [emailForm, setEmailForm] = useState({ domain: "", account: "", password: "" });
  const [addingEmail, setAddingEmail] = useState(false);
  const [dbForm, setDbForm] = useState({ domain: "", name: "", user: "", password: "" });
  const [addingDb, setAddingDb] = useState(false);

  const domains   = account.domains   ?? [];
  const emails    = account.emails    ?? [];
  const databases = account.databases ?? [];

  async function handleSync() {
    setSyncing(true);
    try {
      await ProvisioningAPI.syncAccount(account.username);
      toast({ title: "Stats synced" });
      onRefresh();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  }

  async function handleIssueSSL() {
    if (!sslDomain) return;
    setIssuingSSL(true);
    try {
      await ProvisioningAPI.issueSSL(account.username, sslDomain);
      toast({ title: "SSL job queued", description: `Let's Encrypt for ${sslDomain}` });
      setSslDomain("");
    } catch (e) {
      toast({ title: "SSL failed", description: e.message, variant: "destructive" });
    } finally { setIssuingSSL(false); }
  }

  async function handleAddDomain() {
    if (!domainForm.domain) return;
    setAddingDomain(true);
    try {
      await ProvisioningAPI.provisionDomainAsync(account.username, domainForm.domain, { phpVersion: domainForm.phpVersion });
      toast({ title: "Domain job queued", description: domainForm.domain });
      setDomainForm({ domain: "", phpVersion: "8.1" });
      onRefresh();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAddingDomain(false); }
  }

  async function handleAddEmail() {
    if (!emailForm.domain || !emailForm.account) return;
    setAddingEmail(true);
    try {
      await ProvisioningAPI.createEmail(account.username, emailForm.domain, emailForm);
      toast({ title: "Email job queued", description: `${emailForm.account}@${emailForm.domain}` });
      setEmailForm({ domain: "", account: "", password: "" });
      onRefresh();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAddingEmail(false); }
  }

  async function handleAddDatabase() {
    if (!dbForm.domain || !dbForm.name) return;
    setAddingDb(true);
    try {
      await ProvisioningAPI.createDatabase(account.username, dbForm.domain, {
        name: dbForm.name, user: dbForm.user || dbForm.name, password: dbForm.password,
      });
      toast({ title: "Database job queued", description: dbForm.name });
      setDbForm({ domain: "", name: "", user: "", password: "" });
      onRefresh();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAddingDb(false); }
  }

  const TABS = ["overview", "domains", "emails", "databases"];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server size={16} />
            {account.username}
            {statusBadge(account.status)}
          </DialogTitle>
          <DialogDescription>
            Control panel: <strong>{account.controlPanel}</strong> · Order: <code className="text-xs bg-muted px-1 rounded">{account.orderId}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b pb-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t}
              {t === "domains"   && domains.length   > 0 && <span className="ml-1 text-[10px]">({domains.length})</span>}
              {t === "emails"    && emails.length     > 0 && <span className="ml-1 text-[10px]">({emails.length})</span>}
              {t === "databases" && databases.length  > 0 && <span className="ml-1 text-[10px]">({databases.length})</span>}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Username",    account.username],
                ["Panel",       account.controlPanel],
                ["Status",      account.status],
                ["Provisioned", fmtDate(account.provisionedAt)],
                ["Disk Used",   fmtBytes(account.diskUsedMB)],
                ["Last Sync",   fmtDate(account.lastSyncedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v ?? "—"}</span>
                </div>
              ))}
            </div>
            {account.suspendReason && (
              <Alert>
                <AlertTriangle size={14} />
                <AlertDescription>Suspended: {account.suspendReason}</AlertDescription>
              </Alert>
            )}
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issue SSL</p>
              <div className="flex gap-2">
                <Input placeholder="domain.com" value={sslDomain} onChange={e => setSslDomain(e.target.value)} className="h-8 text-sm" />
                <Button size="sm" onClick={handleIssueSSL} disabled={issuingSSL || !sslDomain}>
                  {issuingSSL ? <Loader2 size={13} className="animate-spin" /> : "Issue SSL"}
                </Button>
              </div>
            </div>
            <Separator />
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <RotateCw size={13} className="mr-1.5" />}
              Sync Stats
            </Button>
          </div>
        )}

        {tab === "domains" && (
          <div className="space-y-4">
            {domains.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No domains provisioned yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead><TableHead>SSL</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-sm">{d.domain}</TableCell>
                      <TableCell>
                        {d.sslStatus === "active"
                          ? <span className="text-green-600 text-xs">✓ Active</span>
                          : <span className="text-muted-foreground text-xs">None</span>}
                      </TableCell>
                      <TableCell>{statusBadge(d.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(d.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Domain</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input placeholder="example.com" value={domainForm.domain} onChange={e => setDomainForm(p => ({ ...p, domain: e.target.value }))} className="h-8 text-sm" />
              </div>
              <Select value={domainForm.phpVersion} onValueChange={v => setDomainForm(p => ({ ...p, phpVersion: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["8.3","8.2","8.1","8.0","7.4"].map(v => <SelectItem key={v} value={v}>PHP {v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleAddDomain} disabled={addingDomain || !domainForm.domain}>
              {addingDomain ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Plus size={13} className="mr-1" />}
              Add Domain
            </Button>
          </div>
        )}

        {tab === "emails" && (
          <div className="space-y-4">
            {emails.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No email accounts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Email</TableHead><TableHead>Quota</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map(em => (
                    <TableRow key={em.id}>
                      <TableCell className="font-mono text-sm">{em.email}</TableCell>
                      <TableCell className="text-xs">{em.quota} MB</TableCell>
                      <TableCell>{statusBadge(em.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Create Email Account</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="domain.com" value={emailForm.domain} onChange={e => setEmailForm(p => ({ ...p, domain: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="username (before @)" value={emailForm.account} onChange={e => setEmailForm(p => ({ ...p, account: e.target.value }))} className="h-8 text-sm" />
              <Input type="password" placeholder="Password" value={emailForm.password} onChange={e => setEmailForm(p => ({ ...p, password: e.target.value }))} className="h-8 text-sm col-span-2" />
            </div>
            <Button size="sm" onClick={handleAddEmail} disabled={addingEmail || !emailForm.domain || !emailForm.account}>
              {addingEmail ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Plus size={13} className="mr-1" />}
              Create Email
            </Button>
          </div>
        )}

        {tab === "databases" && (
          <div className="space-y-4">
            {databases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No databases yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Name</TableHead><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {databases.map(db => (
                    <TableRow key={db.id}>
                      <TableCell className="font-mono text-sm">{db.name}</TableCell>
                      <TableCell className="font-mono text-sm">{db.dbUser}</TableCell>
                      <TableCell className="text-xs uppercase">{db.type}</TableCell>
                      <TableCell>{statusBadge(db.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Create Database</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Website domain" value={dbForm.domain} onChange={e => setDbForm(p => ({ ...p, domain: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="DB name" value={dbForm.name} onChange={e => setDbForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="DB user (defaults to name)" value={dbForm.user} onChange={e => setDbForm(p => ({ ...p, user: e.target.value }))} className="h-8 text-sm" />
              <Input type="password" placeholder="DB password" value={dbForm.password} onChange={e => setDbForm(p => ({ ...p, password: e.target.value }))} className="h-8 text-sm" />
            </div>
            <Button size="sm" onClick={handleAddDatabase} disabled={addingDb || !dbForm.domain || !dbForm.name}>
              {addingDb ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Plus size={13} className="mr-1" />}
              Create Database
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Live logs panel ───────────────────────────────────────────────────────────

function LiveLogsPanel({ logs = [], open, onToggle, autoScroll, onAutoScrollChange }) {
  const logsRef = useRef(null);

  useEffect(() => {
    if (autoScroll && logsRef.current && open) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs, autoScroll, open]);

  function handleScroll(e) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50;
    onAutoScrollChange(atBottom);
  }

  async function copyLogs() {
    try { await navigator.clipboard.writeText(logs.join("\n")); } catch {}
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 w-full"
      >
        <Terminal size={12} />
        <span className="font-medium">Live Logs</span>
        {logs.length > 0 && <span className="text-[10px] opacity-60">· {logs.length} lines</span>}
        <ChevronDown size={12} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-lg overflow-hidden border border-zinc-800">
          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
            <span className={`text-[10px] font-medium ${autoScroll ? "text-green-400" : "text-yellow-400"}`}>
              {autoScroll ? "↕ Auto-scroll ON" : "↕ Paused — scroll to bottom to resume"}
            </span>
            <button onClick={copyLogs} className="text-zinc-400 hover:text-zinc-200 transition-colors" title="Copy logs">
              <Copy size={12} />
            </button>
          </div>
          <div
            ref={logsRef}
            onScroll={handleScroll}
            className="bg-zinc-950 p-3 overflow-y-auto font-mono text-xs leading-5 space-y-px"
            style={{ height: 200 }}
          >
            {logs.length === 0 ? (
              <span className="text-zinc-600">Waiting for logs…</span>
            ) : (
              logs.map((line, i) => (
                <div key={i} className={colorizeLog(line)}>{line}</div>
              ))
            )}
            <span className="inline-block w-1.5 h-3 bg-zinc-500 animate-pulse ml-0.5 align-middle" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step progress row ─────────────────────────────────────────────────────────

const DEFAULT_STEPS = [
  { name: "website",  label: "Website Creation" },
  { name: "database", label: "Database Setup"   },
  { name: "email",    label: "Email Account"    },
  { name: "ssl",      label: "SSL Certificate"  },
];

function StepRow({ step }) {
  const isRunning   = step.status === "running";
  const isSuccess   = step.status === "completed" || step.status === "success";
  const isFailed    = step.status === "failed";
  const isPending   = step.status === "pending" || !step.status;
  const dur = fmtMs(step.durationMs);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
      isRunning ? "border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20" :
      isFailed  ? "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20" :
      isSuccess ? "border-green-100 dark:border-green-900/50 bg-green-50/20 dark:bg-green-950/10" :
      "border-border bg-muted/20"
    }`}>
      <div className="shrink-0 w-5 flex items-center justify-center">
        {isRunning  && <Loader2 size={16} className="animate-spin text-blue-500" />}
        {isSuccess  && <CheckCircle2 size={16} className="text-green-500" />}
        {isFailed   && <XCircle size={16} className="text-red-500" />}
        {isPending  && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isPending ? "text-muted-foreground" : ""}`}>
          {step.label ?? step.name}
        </p>
        {step.error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">{step.error}</p>
        )}
      </div>
      {isRunning && (
        <div className="w-16 h-1 bg-blue-100 dark:bg-blue-900 rounded-full overflow-hidden shrink-0">
          <div className="h-full bg-blue-500 rounded-full w-3/5 animate-pulse" />
        </div>
      )}
      {dur && !isRunning && (
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{dur}</span>
      )}
    </div>
  );
}

// ── Job monitor dialog ────────────────────────────────────────────────────────

function JobMonitorDialog({ jobId, orderInfo, onClose, onRefresh }) {
  const [job, setJob]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [logsOpen, setLogsOpen]   = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [elapsed, setElapsed]     = useState(0);
  const intervalRef = useRef(null);
  const timerRef    = useRef(null);

  const isDone = job?.status === "completed" || job?.status === "failed";

  const poll = useCallback(async () => {
    try {
      const data = await ProvisioningAPI.getJobStatus(jobId);
      setJob(data);
      setLoading(false);
      if (data?.status === "completed" || data?.status === "failed") {
        clearInterval(intervalRef.current);
        clearInterval(timerRef.current);
        onRefresh?.();
      }
    } catch {
      setLoading(false);
    }
  }, [jobId, onRefresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    poll();
    intervalRef.current = setInterval(poll, 3000);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [poll]);

  const steps = (job?.steps?.length ? job.steps : DEFAULT_STEPS.map(d => ({ ...d, status: "pending" })));
  const logs  = job?.logs ?? [];
  const overallStatus = job?.status ?? "pending";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Activity size={16} className={overallStatus === "running" ? "text-blue-500" : ""} />
            <span>Provisioning Job</span>
            {jobStatusBadge(overallStatus)}
          </DialogTitle>
          <DialogDescription>
            {orderInfo?.serviceName ?? "Service"}{orderInfo?.planName ? ` · ${orderInfo.planName}` : ""} · Elapsed: {fmtElapsed(elapsed)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Fetching job status…</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Step rows */}
            <div className="space-y-2">
              {steps.map((step, i) => (
                <StepRow key={step.name ?? i} step={step} />
              ))}
            </div>

            {/* Overall error */}
            {overallStatus === "failed" && job?.error && (
              <Alert variant="destructive">
                <AlertTriangle size={14} />
                <AlertDescription className="text-xs font-mono break-all">{job.error}</AlertDescription>
              </Alert>
            )}

            {/* Success message */}
            {overallStatus === "completed" && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 px-4 py-3">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  Provisioning completed in {fmtElapsed(elapsed)}
                </p>
              </div>
            )}

            <Separator />

            {/* Live logs */}
            <LiveLogsPanel
              logs={logs}
              open={logsOpen}
              onToggle={() => setLogsOpen(p => !p)}
              autoScroll={autoScroll}
              onAutoScrollChange={setAutoScroll}
            />
          </div>
        )}

        <DialogFooter>
          {isDone ? (
            <Button onClick={() => { onRefresh?.(); onClose(); }}>
              {overallStatus === "completed"
                ? <><CheckCircle2 size={13} className="mr-1.5" />Done</>
                : <><XCircle size={13} className="mr-1.5" />Close</>}
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Minimize (job continues in background)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Provision wizard dialog ───────────────────────────────────────────────────

const WIZARD_STEPS = [
  { n: 1, label: "Select Client" },
  { n: 2, label: "Pick Order"    },
  { n: 3, label: "Confirm"       },
];

function ProvisionWizardDialog({ onClose, onStarted }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1
  const [clientSearch, setClientSearch]     = useState("");
  const [clientResults, setClientResults]   = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Step 2
  const [orders, setOrders]           = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder]  = useState(null);

  // Step 3
  const [starting, setStarting] = useState(false);

  // Debounced client search
  useEffect(() => {
    if (!clientSearch.trim()) { setClientResults([]); return; }
    const timer = setTimeout(async () => {
      setClientsLoading(true);
      try {
        const data = await apiFetch(`/admin/clients?q=${encodeURIComponent(clientSearch)}&limit=8`);
        setClientResults(data?.users ?? []);
      } catch {
        setClientResults([]);
      } finally {
        setClientsLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // Load client orders
  useEffect(() => {
    if (!selectedClient) return;
    setOrdersLoading(true);
    setOrders([]);
    setSelectedOrder(null);
    apiFetch(`/admin/clients/${selectedClient.id}`)
      .then(data => {
        const all = data?.orders ?? [];
        setOrders(all.filter(o => !["terminated", "cancelled"].includes(o.status)));
      })
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [selectedClient]);

  async function handleStart() {
    if (!selectedOrder) return;
    setStarting(true);
    try {
      const data = await ProvisioningAPI.provisionAsync(selectedOrder.id);
      onStarted?.(data.jobId ?? data.id, {
        orderId:     selectedOrder.id,
        serviceName: selectedOrder.service ?? selectedOrder.snapshot?.service?.name ?? "Service",
        planName:    selectedOrder.plan    ?? selectedOrder.snapshot?.planData?.name ?? "",
      });
      onClose();
    } catch (e) {
      toast({ title: "Failed to start provisioning", description: e.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  }

  function selectClient(c) {
    setSelectedClient(c);
    setStep(2);
  }

  function selectOrder(o) {
    setSelectedOrder(o);
    setStep(3);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Provisioning Job</DialogTitle>
          <DialogDescription>Select a client order to provision on CyberPanel.</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-1 flex-1 min-w-0">
              <button
                onClick={() => step > s.n && setStep(s.n)}
                disabled={step <= s.n}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors truncate ${
                  step === s.n
                    ? "bg-primary text-primary-foreground"
                    : step > s.n
                    ? "bg-muted text-foreground cursor-pointer hover:bg-muted/80"
                    : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  step > s.n ? "bg-green-500 text-white" : step === s.n ? "bg-white/20" : "bg-muted-foreground/20"
                }`}>
                  {step > s.n ? "✓" : s.n}
                </span>
                <span className="hidden sm:inline truncate">{s.label}</span>
              </button>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={`flex-1 h-px min-w-2 ${step > s.n ? "bg-green-300 dark:bg-green-700" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* ── Step 1: Select Client ── */}
        {step === 1 && (
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Search by email or name</Label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="client@example.com…"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="pl-7"
                autoFocus
              />
            </div>
            <div className="min-h-[120px] space-y-1.5 max-h-60 overflow-y-auto">
              {clientsLoading && (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Searching…</span>
                </div>
              )}
              {!clientsLoading && clientSearch.trim() && clientResults.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No clients found.</p>
              )}
              {!clientSearch.trim() && (
                <p className="text-sm text-muted-foreground py-4 text-center">Start typing to search clients.</p>
              )}
              {clientResults.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectClient(c)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 uppercase">
                    {c.email.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.email}</p>
                    {c.profile?.company && (
                      <p className="text-xs text-muted-foreground truncate">{c.profile.company}</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Select Order ── */}
        {step === 2 && (
          <div className="space-y-3">
            {selectedClient && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 border">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center uppercase shrink-0">
                  {selectedClient.email.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selectedClient.email}</p>
                  {selectedClient.profile?.company && (
                    <p className="text-xs text-muted-foreground">{selectedClient.profile.company}</p>
                  )}
                </div>
              </div>
            )}
            <Label className="text-xs text-muted-foreground">Select an order to provision</Label>
            <div className="min-h-[120px] space-y-1.5 max-h-64 overflow-y-auto">
              {ordersLoading && (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Loading orders…</span>
                </div>
              )}
              {!ordersLoading && orders.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No active orders found for this client.</p>
              )}
              {orders.map(o => {
                const svcName  = o.service ?? o.snapshot?.service?.name ?? "Service";
                const planName = o.plan    ?? o.snapshot?.planData?.name ?? "";
                return (
                  <button
                    key={o.id}
                    onClick={() => selectOrder(o)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{svcName}</p>
                        {planName && <span className="text-xs text-muted-foreground shrink-0">{planName}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{o.id.slice(-12)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {statusBadge(o.status)}
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && selectedOrder && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Provisioning Summary</p>
              {[
                ["Client",   selectedClient?.email],
                ["Order ID", selectedOrder.id.slice(-14)],
                ["Service",  selectedOrder.service ?? selectedOrder.snapshot?.service?.name ?? "—"],
                ["Plan",     selectedOrder.plan    ?? selectedOrder.snapshot?.planData?.name ?? "—"],
                ["Status",   selectedOrder.status],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium font-mono text-xs">{value ?? "—"}</span>
                </div>
              ))}
            </div>
            <Alert>
              <Zap size={14} />
              <AlertDescription className="text-xs">
                This will provision a CyberPanel hosting account via SSH: create website, database, email, and issue SSL certificate. The job runs asynchronously.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex items-center gap-2">
          {step > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="mr-auto gap-1">
              <ArrowLeft size={13} /> Back
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {step === 3 && (
            <Button onClick={handleStart} disabled={starting || !selectedOrder}>
              {starting
                ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Starting…</>
                : <><Zap size={13} className="mr-1.5" />Start Provisioning</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Account row actions ───────────────────────────────────────────────────────

function AccountRowActions({ account, onRefresh, onViewDetail }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function act(fn, successMsg) {
    setLoading(true);
    try {
      await fn();
      toast({ title: successMsg });
      onRefresh();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={loading}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <MoreHorizontal size={14} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onViewDetail}>
          <Eye size={13} className="mr-2" /> View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => act(() => ProvisioningAPI.syncAccount(account.username), "Stats synced")}>
          <RotateCw size={13} className="mr-2" /> Sync Stats
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {account.status !== "suspended" && (
          <DropdownMenuItem
            onClick={() => act(() => ProvisioningAPI.suspendDirect(account.username, "admin-action"), "Account suspended")}
            className="text-yellow-600"
          >
            <ShieldOff size={13} className="mr-2" /> Suspend
          </DropdownMenuItem>
        )}
        {account.status === "suspended" && (
          <DropdownMenuItem
            onClick={() => act(() => ProvisioningAPI.unsuspendDirect(account.username), "Account unsuspended")}
            className="text-green-600"
          >
            <ShieldCheck size={13} className="mr-2" /> Unsuspend
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProvisioningPage() {
  const { toast } = useToast();
  const [accounts, setAccounts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showWizard, setShowWizard]     = useState(false);
  const [activeJob, setActiveJob]       = useState(null); // { jobId, orderInfo }
  const [syncingAll, setSyncingAll]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ProvisioningAPI.listAccounts({ limit: 200 });
      setAccounts(Array.isArray(data) ? data : data.accounts ?? []);
    } catch (e) {
      toast({ title: "Failed to load accounts", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      const result = await ProvisioningAPI.syncAll();
      toast({ title: "Sync complete", description: `${result.synced ?? 0} synced, ${result.failed ?? 0} failed` });
      load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncingAll(false);
    }
  }

  function handleJobStarted(jobId, orderInfo) {
    setActiveJob({ jobId, orderInfo });
  }

  const total     = accounts.length;
  const active    = accounts.filter(a => a.status === "active").length;
  const suspended = accounts.filter(a => a.status === "suspended").length;
  const pending   = accounts.filter(a => a.status === "pending").length;
  const totalDomains = accounts.reduce((sum, acc) => sum + (acc.domains?.length ?? 0), 0);
  const totalEmails = accounts.reduce((sum, acc) => sum + (acc.emails?.length ?? 0), 0);
  const totalDatabases = accounts.reduce((sum, acc) => sum + (acc.databases?.length ?? 0), 0);
  const sslActive = accounts.reduce(
    (sum, acc) => sum + (acc.domains?.filter((domain) => domain.sslStatus === "active").length ?? 0),
    0
  );

  const filtered = accounts.filter(a => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || a.username?.toLowerCase().includes(q) || a.orderId?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Server size={14} className="text-primary" />
            </div>
            <span className="text-sm font-semibold">Provisioning</span>
            <span className="hidden sm:block text-xs text-muted-foreground/60">/ Hosting Accounts</span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionBanner />
            <Button size="sm" variant="outline" onClick={handleSyncAll} disabled={syncingAll}>
              {syncingAll
                ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Syncing…</>
                : <><RotateCw size={13} className="mr-1.5" />Sync All</>}
            </Button>
            <Button size="sm" onClick={() => setShowWizard(true)}>
              <Zap size={13} className="mr-1.5" />Provision
            </Button>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          <StatCard label="Total Accounts" value={total}     icon={Server}       />
          <StatCard label="Active"          value={active}    icon={CheckCircle2} color="text-green-600" />
          <StatCard label="Suspended"       value={suspended} icon={ShieldOff}    color="text-yellow-600" />
          <StatCard label="Pending"         value={pending}   icon={Clock}        color="text-blue-600" />
          <StatCard label="Domains"         value={totalDomains} icon={Globe}     color="text-cyan-600" />
          <StatCard label="SSL Active"      value={sslActive} icon={ShieldCheck}  color="text-emerald-600" />
          <StatCard label="Databases"       value={totalDatabases} icon={Database} color="text-violet-600" />
          <StatCard label="Emails"          value={totalEmails} icon={Mail}        color="text-fuchsia-600" />
        </div>

        {/* Accounts table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Hosting Accounts</CardTitle>
                <CardDescription>All provisioned hosting accounts across orders</CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search username or order ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 h-8 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading accounts…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Server size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {search || statusFilter !== "all" ? "No accounts match your filters." : "No hosting accounts provisioned yet."}
                </p>
                {!search && statusFilter === "all" && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowWizard(true)}>
                    <Zap size={13} className="mr-1.5" />Provision First Account
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Panel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Domains</TableHead>
                    <TableHead>Disk</TableHead>
                    <TableHead>Provisioned</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(acc => (
                    <TableRow
                      key={acc.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedAccount(acc)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-medium">{acc.username}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">{acc.orderId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{acc.controlPanel}</Badge>
                      </TableCell>
                      <TableCell>{statusBadge(acc.status)}</TableCell>
                      <TableCell className="text-sm">{acc.domains?.length ?? 0}</TableCell>
                      <TableCell className="text-sm">{fmtBytes(acc.diskUsedMB)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(acc.provisionedAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(acc.lastSyncedAt)}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <AccountRowActions
                          account={acc}
                          onRefresh={load}
                          onViewDetail={() => setSelectedAccount(acc)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Alert>
          <Activity size={14} />
          <AlertDescription className="text-xs">
            Provisioning jobs run asynchronously via BullMQ. Suspend/unsuspend use the CyberPanel web API
            (port 8090) since the CLI has no suspend command — configure the admin password in{" "}
            <a href="/admin/settings#provisioning" className="underline font-medium">Settings → Provisioning</a>.
          </AlertDescription>
        </Alert>
      </div>

      {/* Modals */}
      {selectedAccount && (
        <AccountDetailDialog
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onRefresh={load}
        />
      )}

      {showWizard && (
        <ProvisionWizardDialog
          onClose={() => setShowWizard(false)}
          onStarted={handleJobStarted}
        />
      )}

      {activeJob && (
        <JobMonitorDialog
          jobId={activeJob.jobId}
          orderInfo={activeJob.orderInfo}
          onClose={() => setActiveJob(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
