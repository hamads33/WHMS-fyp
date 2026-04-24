"use client";

import { useState, useEffect } from "react";
import {
  Key, Plus, Trash2, Copy, Check, AlertTriangle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AuthAPI } from "@/lib/api/auth";

export const ALL_SCOPES = [
  { value: "plans.read",      label: "plans.read",      desc: "Read active plans" },
  { value: "clients.create",  label: "clients.create",  desc: "Register new clients" },
  { value: "auth.login",      label: "auth.login",      desc: "Client login & /me" },
  { value: "orders.create",   label: "orders.create",   desc: "Create orders" },
  { value: "invoices.read",   label: "invoices.read",   desc: "Read invoices" },
];

function CreateKeyDialog({ open, onClose, onCreate }) {
  const { toast } = useToast();
  const [name,       setName]       = useState("");
  const [scopes,     setScopes]     = useState([]);
  const [expiry,     setExpiry]     = useState("365");
  const [loading,    setLoading]    = useState(false);

  function toggleScope(s) {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function selectAll() { setScopes(ALL_SCOPES.map(s => s.value)); }
  function clearAll()  { setScopes([]); }

  async function handleCreate() {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }
    setLoading(true);
    try {
      const data = await AuthAPI.createApiKey(
        name.trim(),
        scopes,
        expiry === "never" ? undefined : Number(expiry),
      );
      onCreate(data);
      onClose();
      setName(""); setScopes([]); setExpiry("365");
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to create key", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a public key for embedding billing widgets. Use <code className="text-xs bg-muted px-1 rounded font-mono">pk_</code> keys in frontend code only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Key name</Label>
            <Input
              id="key-name"
              placeholder="e.g. Website Widget"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Scopes</Label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-primary hover:underline">All</button>
                <span className="text-xs text-muted-foreground">·</span>
                <button onClick={clearAll}  className="text-xs text-muted-foreground hover:underline">None</button>
              </div>
            </div>
            <div className="rounded-lg border divide-y">
              {ALL_SCOPES.map(s => (
                <label key={s.value} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox
                    checked={scopes.includes(s.value)}
                    onCheckedChange={() => toggleScope(s.value)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium text-sm">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave all unchecked for an unrestricted key (not recommended for production).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Expires in</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Key className="mr-2 h-4 w-4" />
            Create key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewKeyReveal({ rawKey, onDismiss }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "API key copied to clipboard." });
  }

  return (
    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <Key className="h-4 w-4 text-green-600" />
      <AlertDescription className="space-y-3">
        <p className="font-semibold text-green-800 dark:text-green-200">
          Key created — copy it now. It will not be shown again.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-white dark:bg-black border rounded px-3 py-1.5 text-sm font-mono break-all select-all">
            {rawKey}
          </code>
          <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="text-green-700 dark:text-green-300 px-0 h-auto hover:bg-transparent">
          I&apos;ve saved it — dismiss
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function RevokeDialog({ open, keyName, onClose, onRevoke }) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try { await onRevoke(); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            Revoke <strong>{keyName}</strong>? Any application using this key will immediately lose access. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handle} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Revoke key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApiKeysPanel() {
  const { toast } = useToast();
  const [keys,         setKeys]        = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [showCreate,   setShowCreate]  = useState(false);
  const [newRawKey,    setNewRawKey]   = useState(null);
  const [revokeTarget, setRevokeTarget]= useState(null);
  const [expanded,     setExpanded]    = useState({});

  async function loadKeys() {
    setLoading(true);
    try {
      const data = await AuthAPI.listApiKeys();
      setKeys(data.keys || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load keys", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadKeys(); }, []);

  function handleCreated(data) {
    setNewRawKey(data.rawKey);
    loadKeys();
    toast({ title: "API key created", description: `"${data.name || "New key"}" is ready to use.` });
  }

  async function handleRevoke() {
    try {
      await AuthAPI.revokeApiKey(revokeTarget.id);
      setRevokeTarget(null);
      loadKeys();
      toast({ title: "Key revoked", description: `"${revokeTarget.name}" has been revoked.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Revoke failed", description: err.message });
    }
  }

  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function isExpired(k) {
    return k.expiresAt && new Date(k.expiresAt) < new Date();
  }

  return (
    <div className="space-y-4">
      {newRawKey && (
        <NewKeyReveal rawKey={newRawKey} onDismiss={() => setNewRawKey(null)} />
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {keys.length === 0 && !loading
            ? "No API keys yet."
            : `${keys.length} key${keys.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New key
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : keys.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map(k => {
                const scopeList = (k.scopes || []).map(s =>
                  typeof s === "string" ? s : s.scope
                );
                const exp = isExpired(k);
                const isOpen = expanded[k.id];

                return (
                  <TableRow key={k.id} className={exp ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm">{k.name}</span>
                        {exp && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Expired</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {scopeList.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Unrestricted</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            {(isOpen ? scopeList : scopeList.slice(0, 2)).map(s => (
                              <Badge key={s} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">{s}</Badge>
                            ))}
                            {!isOpen && scopeList.length > 2 && (
                              <button
                                onClick={() => setExpanded(p => ({ ...p, [k.id]: true }))}
                                className="text-[10px] text-primary hover:underline"
                              >
                                +{scopeList.length - 2} more
                              </button>
                            )}
                            {isOpen && scopeList.length > 2 && (
                              <button
                                onClick={() => setExpanded(p => ({ ...p, [k.id]: false }))}
                                className="text-[10px] text-muted-foreground hover:underline"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(k.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {k.expiresAt ? (
                        <span className={exp ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {fmtDate(k.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {k.lastUsedAt ? fmtDate(k.lastUsedAt) : <span className="italic text-xs">Never</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRevokeTarget({ id: k.id, name: k.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Key className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No API keys</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Create a key to start embedding billing widgets on external sites.
          </p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first key
          </Button>
        </div>
      )}

      <CreateKeyDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreated}
      />

      <RevokeDialog
        open={!!revokeTarget}
        keyName={revokeTarget?.name}
        onClose={() => setRevokeTarget(null)}
        onRevoke={handleRevoke}
      />
    </div>
  );
}
