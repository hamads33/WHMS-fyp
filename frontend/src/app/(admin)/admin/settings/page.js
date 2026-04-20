"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield, ShieldCheck, ShieldOff, KeyRound, RefreshCw,
  Copy, Check, AlertTriangle, Loader2, Eye, EyeOff,
  Key, Plus, Trash2, Clock, Calendar, ChevronDown, ChevronUp,
  Palette, RotateCcw, Sun, Moon, Monitor,
  Mail, Server, Send, CheckCircle2, XCircle, Zap,
  Percent, Globe, MapPin, Tag, Pencil,
  Database, TestTube2, ExternalLink,
  FileText, DollarSign, Hash, CreditCard,
  Webhook,
  HardDrive, FolderOpen, Info,
} from "lucide-react";
import { WebhooksAPI } from "@/lib/webhooks";
import { AdminBillingAPI } from "@/lib/api/billing";
import { Switch } from "@/components/ui/switch";
import { EmailSettingsAPI } from "@/lib/api/email-settings";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AuthAPI } from "@/lib/api/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { useTheme } from "next-themes";
import {
  useAdminTheme,
  COLOR_PRESETS, RADIUS_PRESETS, FONT_SCALES, STYLE_PRESETS, DESIGN_STYLES,
} from "@/lib/context/ThemeContext";

// ── MFA Setup Flow ──────────────────────────────────────────────────────────

function MFASetupFlow({ onEnabled }) {
  const { toast } = useToast();
  const [step, setStep] = useState("idle"); // idle | qr | done
  const [qrData, setQrData] = useState(null);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  async function startSetup() {
    setLoading(true);
    try {
      const data = await AuthAPI.setupMFA();
      setQrData(data);
      setStep("qr");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      toast({ variant: "destructive", title: "Setup failed", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(index, value) {
    if (value && !/^\d$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (index === 5 && value && next.every(d => d !== "")) {
      confirmSetup(next.join(""));
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasted)) {
      setCode(pasted.split(""));
      confirmSetup(pasted);
    }
  }

  async function confirmSetup(fullCode) {
    setLoading(true);
    try {
      await AuthAPI.verifyMFA(fullCode);
      toast({ title: "MFA enabled", description: "Two-factor authentication is now active." });
      setStep("done");
      onEnabled();
    } catch (err) {
      toast({ variant: "destructive", title: "Invalid code", description: err.message });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  if (step === "idle") {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Use an authenticator app (Google Authenticator, Authy, etc.) to scan the QR code
          and generate time-based one-time passwords.
        </p>
        <Button onClick={startSetup} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enable MFA
        </Button>
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
          </p>
          {qrData?.qrImage && (
            <img
              src={qrData.qrImage}
              alt="MFA QR Code"
              className="rounded-lg border border-border p-2 bg-white w-48 h-48"
            />
          )}
          {qrData?.secret && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs text-muted-foreground">Manual entry key:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono tracking-widest select-all">
                {qrData.secret}
              </code>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-2 items-center">
          <Label className="text-center">Enter 6-digit code to confirm</Label>
          <div className="flex gap-2" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <Input
                key={i}
                ref={el => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                className="w-11 h-11 text-center text-lg font-semibold"
              />
            ))}
          </div>
          <Button
            className="mt-2 w-full max-w-xs"
            disabled={loading || code.some(d => d === "")}
            onClick={() => confirmSetup(code.join(""))}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Activate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setStep("idle"); setCode(["","","","","",""]); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Disable MFA Dialog ──────────────────────────────────────────────────────

function DisableMFADialog({ open, onClose, onDisabled }) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDisable() {
    if (!code || code.length !== 6) return;
    setLoading(true);
    try {
      await AuthAPI.disableMFA(code);
      toast({ title: "MFA disabled", description: "Two-factor authentication has been turned off." });
      onDisabled();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to disable", description: err.message });
    } finally {
      setLoading(false);
      setCode("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Disable MFA</DialogTitle>
          <DialogDescription>
            Enter your current authenticator code to disable two-factor authentication.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="disable-code">Authenticator Code</Label>
          <Input
            id="disable-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg tracking-widest font-mono"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDisable} disabled={loading || code.length !== 6}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disable MFA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Backup Codes Panel ──────────────────────────────────────────────────────

function BackupCodesPanel() {
  const { toast } = useToast();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const data = await AuthAPI.generateBackupCodes();
      setCodes(data.backupCodes || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to generate", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "Backup codes copied to clipboard." });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Backup codes can be used once each to sign in if you lose access to your authenticator.
        Store them somewhere safe.
      </p>

      {codes.length > 0 ? (
        <>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These codes are shown only once. Save them now — they cannot be retrieved again.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 gap-2">
            {codes.map((c, i) => (
              <code
                key={i}
                className="bg-muted text-sm font-mono rounded px-3 py-1.5 text-center tracking-widest"
              >
                {c}
              </code>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={copyAll} className="self-start">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied!" : "Copy All"}
          </Button>
          <Button variant="ghost" size="sm" onClick={generate} disabled={loading} className="self-start">
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate Codes
          </Button>
        </>
      ) : (
        <Button onClick={generate} disabled={loading} variant="outline">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <KeyRound className="mr-2 h-4 w-4" />
          Generate Backup Codes
        </Button>
      )}
    </div>
  );
}

// ── API Keys ─────────────────────────────────────────────────────────────────

const ALL_SCOPES = [
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
  const [expiry,     setExpiry]     = useState("365"); // "never" = no expiry
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
      setName(""); setScopes([]); setExpiry("365"); // reset
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
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Key name</Label>
            <Input
              id="key-name"
              placeholder="e.g. Website Widget"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Scopes */}
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

          {/* Expiry */}
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
          Key created — copy it now. It won't be shown again.
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
          I've saved it — dismiss
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

function ApiKeysPanel() {
  const { toast } = useToast();
  const [keys,         setKeys]        = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [showCreate,   setShowCreate]  = useState(false);
  const [newRawKey,    setNewRawKey]   = useState(null);
  const [revokeTarget, setRevokeTarget]= useState(null); // { id, name }
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
      {/* New key reveal banner */}
      {newRawKey && (
        <NewKeyReveal rawKey={newRawKey} onDismiss={() => setNewRawKey(null)} />
      )}

      {/* Header row */}
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

      {/* Keys table */}
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

// ── Appearance Panel ─────────────────────────────────────────────────────────

function SectionLabel({ children, hint }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold">{children}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const {
    colorTheme,  setColorTheme,
    radius,      setRadius,
    fontScale,   setFontScale,
    designStyle, setDesignStyle,
    applyPreset, resetTheme,
    activePresetId, mounted,
  } = useAdminTheme();
  const { toast } = useToast();

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading theme settings…
      </div>
    );
  }

  function handleReset() {
    resetTheme();
    setTheme("system");
    toast({ title: "Theme reset", description: "Appearance restored to defaults." });
  }

  return (
    <div className="space-y-8">

      {/* ── 1. Style Presets ──────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="One-click combinations of color, radius, and font size.">
          Style Presets
        </SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {STYLE_PRESETS.map(preset => {
            const swatch = COLOR_PRESETS[preset.color]?.swatch ?? "#71717a";
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                aria-pressed={isActive}
                className={[
                  "group relative flex flex-col items-start rounded-xl border-2 overflow-hidden text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-primary/50 hover:shadow-sm",
                ].join(" ")}
              >
                {/* Color stripe */}
                <div
                  className="w-full h-8 shrink-0"
                  style={{ backgroundColor: swatch, opacity: 0.9 }}
                />
                {/* Label */}
                <div className="px-3 py-2 w-full">
                  <p className={`text-xs font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                    {preset.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate leading-tight">
                    {preset.description}
                  </p>
                </div>
                {/* Active checkmark */}
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 2. Mode ───────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Light, dark, or follow your system setting.">
          Mode
        </SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { value: "light",  label: "Light",  Icon: Sun },
            { value: "dark",   label: "Dark",   Icon: Moon },
            { value: "system", label: "System", Icon: Monitor },
          ].map(({ value, label, Icon }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={isActive}
                className={[
                  "flex flex-col items-center gap-2 rounded-xl border-2 py-4 px-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                ].join(" ")}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 3. Design Style ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Changes the visual language of the entire interface — shadows, surfaces, and effects.">
          Design Style
        </SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DESIGN_STYLES.map(style => {
            const isActive = designStyle === style.id;
            const isDark   = theme === "dark";
            const preview  = isDark ? (style.previewDark ?? style.preview) : style.preview;
            return (
              <button
                key={style.id}
                onClick={() => setDesignStyle(style.id)}
                aria-pressed={isActive}
                className={[
                  "group relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-primary/50",
                ].join(" ")}
              >
                {/* Mini preview area */}
                <div
                  className="w-full h-16 relative overflow-hidden"
                  style={{
                    background: isDark ? "#111" : "#f8fafc",
                    backgroundImage: style.id === "glass"
                      ? (isDark
                          ? "radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.3), transparent)"
                          : "radial-gradient(ellipse at 30% 40%, rgba(196,181,253,0.5), transparent)")
                      : undefined,
                  }}
                >
                  {/* Fake card inside preview */}
                  <div
                    className="absolute inset-3"
                    style={{
                      background:     preview.background,
                      border:         preview.border,
                      boxShadow:      preview.boxShadow,
                      backdropFilter: preview.backdropFilter,
                      backgroundImage: preview.backgroundImage,
                      borderRadius:   "6px",
                    }}
                  >
                    {/* Fake content lines */}
                    <div className="absolute left-2.5 top-2.5 space-y-1">
                      <div
                        className="h-1.5 w-10 rounded-full"
                        style={{ background: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)" }}
                      />
                      <div
                        className="h-1 w-7 rounded-full"
                        style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Label */}
                <div className="px-3 py-2.5">
                  <p className={`text-xs font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                    {style.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {style.description}
                  </p>
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 5. Accent Color ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Sets the primary accent color used on buttons, links, and active states.">
          Accent Color
        </SectionLabel>
        <div className="grid grid-cols-7 gap-2">
          {Object.entries(COLOR_PRESETS).map(([key, preset]) => {
            const isActive = colorTheme === key;
            return (
              <button
                key={key}
                onClick={() => setColorTheme(key)}
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={isActive}
                className={[
                  "group flex flex-col items-center gap-1.5 rounded-lg py-2 px-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-primary/8" : "hover:bg-muted/60",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-all",
                    isActive ? "ring-2 ring-primary scale-110" : "ring-1 ring-black/10 group-hover:scale-105",
                  ].join(" ")}
                  style={{ backgroundColor: preset.swatch }}
                />
                <span className={`text-[10px] font-medium leading-none ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 6. Border Radius ──────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Controls the roundness of buttons, cards, and input fields.">
          Border Radius
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          {RADIUS_PRESETS.map(preset => {
            const isActive = radius === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => setRadius(preset.value)}
                aria-pressed={isActive}
                title={preset.description}
                className={[
                  "flex items-center gap-2 rounded-lg border-2 px-3.5 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                ].join(" ")}
              >
                <span
                  className="h-5 w-5 border-2 border-current shrink-0"
                  style={{ borderRadius: preset.value }}
                />
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 7. Font Size ──────────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Scales the entire interface proportionally using rem units.">
          Font Size
        </SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          {FONT_SCALES.map(scale => {
            const isActive = fontScale === scale.value;
            const sizeClass = scale.value === "compact" ? "text-xs" : scale.value === "large" ? "text-base" : "text-sm";
            return (
              <button
                key={scale.value}
                onClick={() => setFontScale(scale.value)}
                aria-pressed={isActive}
                className={[
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 px-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                ].join(" ")}
              >
                <span className={`font-bold leading-none ${sizeClass} ${isActive ? "text-primary" : "text-foreground"}`}>Aa</span>
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{scale.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{scale.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── 8. Live Preview ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel hint="Reflects all your customizations in real time.">
          Live Preview
        </SectionLabel>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {/* Buttons row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="outline">Outline</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="ghost">Ghost</Button>
            <Button size="sm" variant="destructive">Danger</Button>
          </div>
          {/* Elements row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Input className="h-8 w-40 text-xs" placeholder="Input field…" readOnly />
          </div>
          {/* Mini card */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Sample Card</p>
              <p className="text-xs text-muted-foreground">This is how cards will look.</p>
            </div>
            <Button size="sm" variant="outline">Action</Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── 9. Reset ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Reset to Defaults</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Restores the Default preset — zinc accent, shadcn style, balanced radius, default font size, and system mode.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

    </div>
  );
}

// ── Email Settings Panel ─────────────────────────────────────────────────────

const PROVIDERS = [
  { value: "smtp",     label: "SMTP",       desc: "Mailtrap, Gmail, or any SMTP server" },
  { value: "sendgrid", label: "SendGrid",   desc: "SendGrid transactional email API" },
  { value: "mailgun",  label: "Mailgun",    desc: "Mailgun email delivery API" },
  { value: "ses",      label: "Amazon SES", desc: "AWS Simple Email Service" },
  { value: "postmark", label: "Postmark",   desc: "Postmark transactional email" },
];

function emailValidate(cfg) {
  const errs = {};
  const p = cfg.email_provider;
  if (p === "smtp") {
    if (!cfg.smtp_host.trim())  errs.smtp_host = "Host is required";
    if (!cfg.smtp_port)         errs.smtp_port = "Port is required";
    else if (!/^\d+$/.test(cfg.smtp_port) || +cfg.smtp_port < 1 || +cfg.smtp_port > 65535)
      errs.smtp_port = "Enter a valid port (1–65535)";
    if (!cfg.smtp_user.trim())  errs.smtp_user = "Username is required";
    if (!cfg.smtp_pass)         errs.smtp_pass = "Password is required";
  }
  if (p === "sendgrid" && !cfg.sendgrid_key.trim()) errs.sendgrid_key = "API key is required";
  if (p === "mailgun") {
    if (!cfg.mailgun_key.trim())    errs.mailgun_key    = "API key is required";
    if (!cfg.mailgun_domain.trim()) errs.mailgun_domain = "Domain is required";
  }
  if (p === "ses" && !cfg.aws_region.trim()) errs.aws_region = "Region is required";
  if (p === "postmark" && !cfg.postmark_token.trim()) errs.postmark_token = "Server token is required";
  if (!cfg.smtp_from_email.trim()) errs.smtp_from_email = "From email is required";
  if (!cfg.smtp_from_name.trim())  errs.smtp_from_name  = "From name is required";
  if (cfg.smtp_reply_to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.smtp_reply_to))
    errs.smtp_reply_to = "Enter a valid email address";
  return errs;
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1 flex items-center gap-1"><XCircle className="h-3 w-3 flex-shrink-0" />{msg}</p>;
}

function RequiredMark() {
  return <span className="text-destructive ml-0.5" aria-hidden="true">*</span>;
}

// ── Billing & Tax Panel ──────────────────────────────────────────────────────

const TAX_TYPES = ["VAT", "GST", "Sales Tax", "Service Tax", "Custom"];

function TaxRuleDialog({ open, rule, onClose, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!rule;
  const [form, setForm] = useState({
    name: "", rate: "", country: "", region: "", serviceType: "", active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {
        name: rule.name ?? "",
        rate: rule.rate != null ? (Number(rule.rate) * 100).toFixed(2) : "",
        country: rule.country ?? "",
        region: rule.region ?? "",
        serviceType: rule.serviceType ?? "",
        active: rule.active ?? true,
      } : { name: "", rate: "", country: "", region: "", serviceType: "", active: true });
    }
  }, [open, rule, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Name is required" }); return; }
    const rateNum = parseFloat(form.rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast({ variant: "destructive", title: "Rate must be between 0 and 100" }); return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        rate: rateNum / 100,
        country: form.country.trim() || undefined,
        region: form.region.trim() || undefined,
        serviceType: form.serviceType || undefined,
        active: form.active,
      };
      if (isEdit) {
        await AdminBillingAPI.updateTaxRule(rule.id, payload);
        toast({ title: "Tax rule updated" });
      } else {
        await AdminBillingAPI.createTaxRule(payload);
        toast({ title: "Tax rule created" });
      }
      onSaved();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to save", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tax Rule" : "New Tax Rule"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this tax rule's settings." : "Define a tax rate applied to matching services."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Rule Name <RequiredMark /></Label>
            <Input placeholder="e.g., UK VAT 20%" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>
              Tax Rate (%) <RequiredMark />
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="e.g., 20"
                value={form.rate}
                onChange={(e) => set("rate", e.target.value)}
                className="pr-8"
              />
              <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground">Enter as a percentage, e.g., 20 for 20%</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Country</Label>
              <Input placeholder="e.g., GB, US (ISO code)" value={form.country} onChange={(e) => set("country", e.target.value)} maxLength={3} className="uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />State / Region</Label>
              <Input placeholder="e.g., CA, TX" value={form.region} onChange={(e) => set("region", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Service Type</Label>
            <Select value={form.serviceType || "__all"} onValueChange={(v) => set("serviceType", v === "__all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All service types</SelectItem>
                {["hosting", "domain", "ssl", "vps", "dedicated", "custom"].map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">This rule is applied to matching invoices</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Invoice Settings Panel ───────────────────────────────────────────────────

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function InvoiceSettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await AdminBillingAPI.getInvoiceSettings();
      setSettings(data.settings ?? data);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load invoice settings", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function set(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await AdminBillingAPI.updateInvoiceSettings(settings);
      setSettings(data.settings ?? data);
      toast({ title: "Invoice settings saved" });
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading invoice settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Generation ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Invoice Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow
            label="Continuous Invoice Generation"
            description="Generate invoices each cycle even if a previous invoice remains unpaid."
          >
            <Switch checked={!!settings.continuousInvoiceGeneration} onCheckedChange={(v) => set("continuousInvoiceGeneration", v)} />
          </SettingRow>
          <SettingRow
            label="Enable Metric Usage Invoicing"
            description="Include metric usage charges on invoices for all priced product metrics."
          >
            <Switch checked={!!settings.enableMetricUsageInvoicing} onCheckedChange={(v) => set("enableMetricUsageInvoicing", v)} />
          </SettingRow>
          <SettingRow
            label="Store Client Data Snapshot"
            description="Preserve client billing details at invoice creation to prevent profile changes affecting existing invoices."
          >
            <Switch checked={!!settings.storeClientDataSnapshot} onCheckedChange={(v) => set("storeClientDataSnapshot", v)} />
          </SettingRow>
          <SettingRow
            label="Enable Proforma Invoicing"
            description="Generate proforma (draft estimate) invoices for unpaid orders before they are confirmed."
          >
            <Switch checked={!!settings.enableProformaInvoicing} onCheckedChange={(v) => set("enableProformaInvoicing", v)} />
          </SettingRow>
          <SettingRow
            label="Group Similar Line Items"
            description="Automatically combine identical line items into a quantity × description format."
          >
            <Switch checked={!!settings.groupSimilarLineItems} onCheckedChange={(v) => set("groupSimilarLineItems", v)} />
          </SettingRow>
        </CardContent>
      </Card>

      {/* ── PDF ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow
            label="Enable PDF Invoices"
            description="Send PDF versions of invoices as email attachments."
          >
            <Switch checked={!!settings.enablePdfInvoices} onCheckedChange={(v) => set("enablePdfInvoices", v)} />
          </SettingRow>

          {settings.enablePdfInvoices && (
            <>
              <SettingRow label="PDF Paper Size" description="Paper format used when generating PDF files.">
                <Select value={settings.pdfPaperSize} onValueChange={(v) => set("pdfPaperSize", v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow label="PDF Font Family" description="Font used in generated PDF invoices.">
                <div className="flex flex-wrap gap-3">
                  {["Courier", "Freesans", "Helvetica", "Times", "Dejavusans", "Custom"].map((font) => (
                    <label key={font} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="pdfFontFamily"
                        value={font}
                        checked={settings.pdfFontFamily === font}
                        onChange={() => set("pdfFontFamily", font)}
                        className="accent-primary"
                      />
                      {font}
                    </label>
                  ))}
                </div>
              </SettingRow>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Payment ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Options
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow
            label="Enable Mass Payment"
            description="Allow clients to pay multiple invoices at once from the client area."
          >
            <Switch checked={!!settings.enableMassPayment} onCheckedChange={(v) => set("enableMassPayment", v)} />
          </SettingRow>
          <SettingRow
            label="Clients Choose Gateway"
            description="Allow clients to select which payment gateway they pay with."
          >
            <Switch checked={!!settings.clientsChooseGateway} onCheckedChange={(v) => set("clientsChooseGateway", v)} />
          </SettingRow>
          <SettingRow
            label="Cancellation Request Handling"
            description="Automatically cancel outstanding unpaid invoices when a cancellation request is submitted."
          >
            <Switch checked={!!settings.cancellationRequestHandling} onCheckedChange={(v) => set("cancellationRequestHandling", v)} />
          </SettingRow>
          <SettingRow
            label="Automatic Subscription Management"
            description="Auto-cancel existing subscription agreements on upgrade or cancellation."
          >
            <Switch checked={!!settings.automaticSubscriptionManagement} onCheckedChange={(v) => set("automaticSubscriptionManagement", v)} />
          </SettingRow>
          <SettingRow label="Default Payment Terms (days)" description="Number of days until an invoice becomes overdue.">
            <Input
              type="number"
              min={1}
              className="w-24 text-right"
              value={settings.defaultDueDays ?? 7}
              onChange={(e) => set("defaultDueDays", Number(e.target.value))}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* ── Numbering ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" /> Invoice Numbering
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow
            label="Sequential Paid Invoice Numbering"
            description="Enable automatic sequential numbering for paid invoices."
          >
            <Switch checked={!!settings.sequentialPaidInvoiceNumbering} onCheckedChange={(v) => set("sequentialPaidInvoiceNumbering", v)} />
          </SettingRow>

          {settings.sequentialPaidInvoiceNumbering && (
            <>
              <SettingRow
                label="Sequential Invoice Number Format"
                description="Available tags: {YEAR} {MONTH} {DAY} {NUMBER}"
              >
                <Input
                  className="w-48 font-mono text-sm"
                  value={settings.sequentialInvoiceNumberFormat ?? "{NUMBER}"}
                  onChange={(e) => set("sequentialInvoiceNumberFormat", e.target.value)}
                />
              </SettingRow>
              <SettingRow label="Next Paid Invoice Number" description="The next invoice number that will be assigned.">
                <Input
                  type="number"
                  min={1}
                  className="w-28 text-right"
                  value={settings.nextPaidInvoiceNumber ?? 1}
                  onChange={(e) => set("nextPaidInvoiceNumber", Number(e.target.value))}
                />
              </SettingRow>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Late Fees ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Late Fees
          </CardTitle>
          <CardDescription>
            Applied automatically to overdue invoices. Set amount to 0 to disable.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <SettingRow label="Late Fee Type" description="How the late fee is calculated.">
            <div className="flex gap-4">
              {["Percentage", "Fixed"].map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="lateFeeType"
                    value={type}
                    checked={settings.lateFeeType === type}
                    onChange={() => set("lateFeeType", type)}
                    className="accent-primary"
                  />
                  {type === "Percentage" ? "Percentage" : "Fixed Amount"}
                </label>
              ))}
            </div>
          </SettingRow>
          <SettingRow
            label="Late Fee Amount"
            description={settings.lateFeeType === "Percentage" ? "Percentage applied to overdue invoice total (set to 0 to disable)." : "Fixed amount added to overdue invoices (set to 0 to disable)."}
          >
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-28 text-right"
                value={settings.lateFeeAmount ?? 0}
                onChange={(e) => set("lateFeeAmount", parseFloat(e.target.value) || 0)}
              />
              <span className="text-sm text-muted-foreground">{settings.lateFeeType === "Percentage" ? "%" : "$"}</span>
            </div>
          </SettingRow>
          <SettingRow
            label="Late Fee Minimum"
            description="Minimum charge applied even if calculated fee is lower (0 = no minimum)."
          >
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-28 text-right"
                value={settings.lateFeeMinimum ?? 0}
                onChange={(e) => set("lateFeeMinimum", parseFloat(e.target.value) || 0)}
              />
              <span className="text-sm text-muted-foreground">$</span>
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Invoice Settings
        </Button>
      </div>
    </div>
  );
}

function BillingTaxPanel() {
  const { toast } = useToast();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await AdminBillingAPI.listTaxRules();
      setRules(Array.isArray(data) ? data : (data.taxRules ?? data.rules ?? []));
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load tax rules", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditRule(null); setDialogOpen(true); }
  function openEdit(rule) { setEditRule(rule); setDialogOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await AdminBillingAPI.deleteTaxRule(deleteTarget.id);
      toast({ title: "Tax rule deleted" });
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  function fmtRate(rate) {
    return `${(Number(rate) * 100).toFixed(2)}%`;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Tax Rules</CardTitle>
              <CardDescription className="mt-0.5">
                Define tax rates applied to invoices based on country, region, or service type.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Rule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tax rules…
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Percent className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-sm">No tax rules configured</p>
              <p className="text-xs mt-1">Create rules to automatically apply taxes to invoices.</p>
              <Button size="sm" className="mt-4" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Create first rule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="font-mono font-semibold text-primary">{fmtRate(rule.rate)}</TableCell>
                    <TableCell>{rule.country || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{rule.region || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="capitalize">{rule.serviceType || <span className="text-muted-foreground">All</span>}</TableCell>
                    <TableCell>
                      {rule.active
                        ? <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(rule)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How Tax Rules Work</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Rules are matched by <strong>country</strong> and optionally by <strong>region</strong></li>
            <li>A rule with a service type only applies to that service category</li>
            <li>If multiple rules match, the most specific rule wins (region &gt; country &gt; global)</li>
            <li>Rates are stored as decimals — 20% is stored as <code className="font-mono text-xs bg-muted px-1 rounded">0.2000</code></li>
            <li>Services must have <strong>Apply Tax</strong> enabled to use these rules</li>
          </ul>
        </CardContent>
      </Card>

      <TaxRuleDialog
        open={dialogOpen}
        rule={editRule}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { setDialogOpen(false); load(); }}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Tax Rule</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone and may affect future invoice calculations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Domain Registrar Settings Panel ─────────────────────── */
function DomainRegistrarPanel() {
  const { toast } = useToast();

  const asBool = (value, fallback = false) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    return fallback;
  };

  // Porkbun
  const [pbKey,    setPbKey]    = useState("");
  const [pbSecret, setPbSecret] = useState("");
  const [pbEnabled, setPbEnabled] = useState(false);

  // Namecheap
  const [ncUser,    setNcUser]    = useState("");
  const [ncKey,     setNcKey]     = useState("");
  const [ncIp,      setNcIp]      = useState("");
  const [ncSandbox, setNcSandbox] = useState(true);
  const [ncEnabled, setNcEnabled] = useState(false);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null); // "porkbun"|"namecheap"
  const [testing,  setTesting]  = useState(null);
  const [showPbKey,    setShowPbKey]    = useState(false);
  const [showPbSecret, setShowPbSecret] = useState(false);
  const [showNcKey,    setShowNcKey]    = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const json = await apiFetch("/admin/domains/settings");
        if (json.success) {
          const s = json.settings || {};
          setPbKey(s.porkbun_api_key || "");
          setPbSecret(s.porkbun_secret_key || "");
          setPbEnabled(asBool(s.porkbun_enabled));
          setNcUser(s.namecheap_api_user || "");
          setNcKey(s.namecheap_api_key || "");
          setNcIp(s.namecheap_client_ip || "");
          setNcSandbox(asBool(s.namecheap_sandbox, true));
          setNcEnabled(asBool(s.namecheap_enabled));
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  function getRegistrarPayload(registrar) {
    return registrar === "porkbun"
      ? {
          porkbun_api_key: pbKey.trim(),
          porkbun_secret_key: pbSecret.trim(),
          porkbun_enabled: pbEnabled,
        }
      : {
          namecheap_api_user: ncUser.trim(),
          namecheap_api_key: ncKey.trim(),
          namecheap_client_ip: ncIp.trim(),
          namecheap_sandbox: ncSandbox,
          namecheap_enabled: ncEnabled,
        };
  }

  function validateRegistrar(registrar) {
    if (registrar === "porkbun") {
      if (!pbKey.trim()) return "Porkbun API key is required.";
      if (!pbSecret.trim()) return "Porkbun secret API key is required.";
      return null;
    }

    if (!ncUser.trim()) return "Namecheap API username is required.";
    if (!ncKey.trim()) return "Namecheap API key is required.";
    if (!ncIp.trim()) return "Namecheap client IP is required.";
    return null;
  }

  async function save(registrar, { silent = false } = {}) {
    setSaving(registrar);
    const validationError = validateRegistrar(registrar);
    if (validationError) {
      if (!silent) {
        toast({ variant: "destructive", title: "❌ Missing Required Fields", description: validationError });
      }
      setSaving(null);
      return false;
    }

    const body = getRegistrarPayload(registrar);
    try {
      const json = await apiFetch("/admin/domains/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (json.success) {
        if (!silent) {
          toast({ title: "✅ Saved to Database", description: `${registrar === "porkbun" ? "Porkbun" : "Namecheap"} credentials securely saved to database.` });
        }
        return true;
      } else {
        throw new Error(json.error || "Save failed");
      }
    } catch (err) {
      if (!silent) {
        toast({ variant: "destructive", title: "❌ Save Failed", description: `Could not save to database: ${err.message}` });
      } else {
        throw err;
      }
      return false;
    } finally { setSaving(null); }
  }

  async function testConnection(registrar) {
    setTesting(registrar);
    try {
      const validationError = validateRegistrar(registrar);
      if (validationError) {
        toast({ variant: "destructive", title: "❌ Missing Fields", description: validationError });
        return;
      }

      const ok = await save(registrar, { silent: true });
      if (!ok) return;

      const json = await apiFetch(`/admin/domains/settings/test?registrar=${registrar}`, {
        method: "POST",
        body: JSON.stringify({
          registrar,
          settings: getRegistrarPayload(registrar),
        }),
      });
      if (json.success) {
        toast({ title: "✅ Connection Success", description: json.message });
      } else {
        toast({ variant: "destructive", title: "❌ Connection Failed", description: json.message });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "❌ Connection Error", description: err.message });
    } finally { setTesting(null); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Credentials are stored encrypted in the database. They override environment variables when set.
          For <strong>Namecheap sandbox</strong> (free testing), enable sandbox mode and
          create a free account at{" "}
          <a href="https://www.sandbox.namecheap.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
            sandbox.namecheap.com <ExternalLink className="h-3 w-3 inline-block ml-0.5 -mt-0.5" />
          </a>.
        </AlertDescription>
      </Alert>

      {/* ── Namecheap ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" /> Namecheap
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Full lifecycle — availability, registration, renewal, transfer, DNS. Free sandbox available.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={ncEnabled ? "default" : "secondary"} className="text-xs">
                {ncEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <Switch
                checked={ncEnabled}
                onCheckedChange={setNcEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs mb-1.5 block">API Username</Label>
              <Input value={ncUser} onChange={e => setNcUser(e.target.value)} placeholder="your_namecheap_username" className="h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">API Key</Label>
              <div className="relative">
                <Input
                  type={showNcKey ? "text" : "password"}
                  value={ncKey}
                  onChange={e => setNcKey(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-sm font-mono pr-9"
                />
                <button type="button" onClick={() => setShowNcKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNcKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Whitelisted Client IP</Label>
              <Input value={ncIp} onChange={e => setNcIp(e.target.value)} placeholder="203.0.113.1" className="h-9 text-sm font-mono" />
              <p className="text-xs text-muted-foreground mt-1">Must be whitelisted in your Namecheap API settings.</p>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Environment</Label>
              <Select value={ncSandbox ? "true" : "false"} onValueChange={v => setNcSandbox(v === "true")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sandbox (free testing)</SelectItem>
                  <SelectItem value="false">Production (live)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => save("namecheap")} disabled={saving === "namecheap"}>
              {saving === "namecheap" ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => testConnection("namecheap")} disabled={testing === "namecheap" || saving === "namecheap"}>
              {testing === "namecheap" ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5 mr-2" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Porkbun ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" /> Porkbun
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Supports availability check, DNS, nameservers, and domain sync. Registration/renewal via web interface only.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={pbEnabled ? "default" : "secondary"} className="text-xs">
                {pbEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <Switch
                checked={pbEnabled}
                onCheckedChange={setPbEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs mb-1.5 block">API Key</Label>
              <div className="relative">
                <Input
                  type={showPbKey ? "text" : "password"}
                  value={pbKey}
                  onChange={e => setPbKey(e.target.value)}
                  placeholder="pk1_••••••••"
                  className="h-9 text-sm font-mono pr-9"
                />
                <button type="button" onClick={() => setShowPbKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPbKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Secret API Key</Label>
              <div className="relative">
                <Input
                  type={showPbSecret ? "text" : "password"}
                  value={pbSecret}
                  onChange={e => setPbSecret(e.target.value)}
                  placeholder="sk1_••••••••"
                  className="h-9 text-sm font-mono pr-9"
                />
                <button type="button" onClick={() => setShowPbSecret(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPbSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your API keys from{" "}
            <a href="https://porkbun.com/account/api" target="_blank" rel="noopener noreferrer" className="underline">
              Porkbun → Account → API Access <ExternalLink className="h-3 w-3 inline-block ml-0.5 -mt-0.5" />
            </a>
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save("porkbun")} disabled={saving === "porkbun"}>
              {saving === "porkbun" ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => testConnection("porkbun")} disabled={testing === "porkbun" || saving === "porkbun"}>
              {testing === "porkbun" ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5 mr-2" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmailSettingsPanel() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState({
    email_provider: "smtp", smtp_host: "", smtp_port: "587", smtp_secure: "false",
    smtp_user: "", smtp_pass: "", smtp_from_email: "", smtp_from_name: "WHMS",
    smtp_reply_to: "", sendgrid_key: "", mailgun_key: "", mailgun_domain: "",
    aws_region: "us-east-1", postmark_token: "",
  });
  const [savedCfg,   setSavedCfg]   = useState(null);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [sending,    setSending]    = useState(false);
  const [testEmail,  setTestEmail]  = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [connStatus, setConnStatus] = useState(null);
  const [sendStatus, setSendStatus] = useState(null);
  const [touched,    setTouched]    = useState({});
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(() => {
    EmailSettingsAPI.getAll()
      .then(res => {
        if (res?.settings) {
          const merged = { email_provider: "smtp", smtp_host: "", smtp_port: "587", smtp_secure: "false", smtp_user: "", smtp_pass: "", smtp_from_email: "", smtp_from_name: "WHMS", smtp_reply_to: "", sendgrid_key: "", mailgun_key: "", mailgun_domain: "", aws_region: "us-east-1", postmark_token: "", ...res.settings };
          setCfg(merged);
          setSavedCfg(merged);
          setTestEmail(res.settings.smtp_from_email || "");
        }
      })
      .finally(() => setLoadingCfg(false));
  }, []);

  const set = (k, v) => {
    setCfg(p => ({ ...p, [k]: v }));
    setTouched(p => ({ ...p, [k]: true }));
    setConnStatus(null);
    setSendStatus(null);
  };

  const handleTlsToggle = v => {
    const newPort = (cfg.smtp_port === "587" || cfg.smtp_port === "465") ? (v ? "465" : "587") : cfg.smtp_port;
    setCfg(p => ({ ...p, smtp_secure: v ? "true" : "false", smtp_port: newPort }));
    setTouched(p => ({ ...p, smtp_secure: true, smtp_port: true }));
    setConnStatus(null);
  };

  const isDirty = savedCfg !== null && JSON.stringify(cfg) !== JSON.stringify(savedCfg);
  const errors  = emailValidate(cfg);
  const showErr = k => (touched[k] || submitted) ? errors[k] : undefined;
  const errCls  = k => showErr(k) ? "border-destructive focus-visible:ring-destructive" : "";

  const handleSave = async () => {
    setSubmitted(true);
    if (Object.keys(emailValidate(cfg)).length) {
      toast({ variant: "destructive", title: "Fix the highlighted fields before saving" });
      return;
    }
    setSaving(true);
    try {
      await EmailSettingsAPI.update(cfg);
      setSavedCfg({ ...cfg });
      setSubmitted(false);
      toast({ title: "Email settings saved" });
    } catch (e) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    } finally { setSaving(false); }
  };

  const handleTestConn = async () => {
    setTesting(true); setConnStatus(null);
    try {
      const res = await EmailSettingsAPI.testConnection();
      setConnStatus({ ok: res.ok, msg: res.ok ? `Connected to ${res.host || cfg.smtp_host}` : res.error });
    } catch (e) { setConnStatus({ ok: false, msg: e.message }); }
    finally { setTesting(false); }
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSending(true); setSendStatus(null);
    try {
      await EmailSettingsAPI.sendTestEmail(testEmail);
      setSendStatus({ ok: true, msg: `Test email sent to ${testEmail}` });
    } catch (e) { setSendStatus({ ok: false, msg: e.message }); }
    finally { setSending(false); }
  };

  const provider = cfg.email_provider || "smtp";

  if (loadingCfg) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-5">

      {/* Unsaved changes banner */}
      {isDirty && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            You have unsaved changes. Save settings before running tests.
          </AlertDescription>
        </Alert>
      )}

      {/* Provider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-indigo-500" /> Email Provider</CardTitle>
          <CardDescription>Choose how outgoing emails are delivered. Provider-specific credentials will appear below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="email_provider">Provider<RequiredMark /></Label>
          <Select value={provider} onValueChange={v => set("email_provider", v)}>
            <SelectTrigger id="email_provider" className="w-64 mt-1.5">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="font-medium">{p.label}</span>
                  <span className="ml-2 text-muted-foreground text-xs">{p.desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* SMTP */}
      {provider === "smtp" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4 text-slate-500" /> SMTP Configuration</CardTitle>
            <CardDescription>Connection details for your SMTP server. All fields are required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smtp_host">SMTP Host<RequiredMark /></Label>
                <Input id="smtp_host" placeholder="sandbox.smtp.mailtrap.io" value={cfg.smtp_host}
                  onChange={e => set("smtp_host", e.target.value)}
                  onBlur={() => setTouched(p => ({ ...p, smtp_host: true }))}
                  aria-invalid={!!showErr("smtp_host")}
                  className={errCls("smtp_host")}
                />
                <FieldError msg={showErr("smtp_host")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp_port">Port<RequiredMark /></Label>
                <Input id="smtp_port" placeholder="587" value={cfg.smtp_port}
                  onChange={e => set("smtp_port", e.target.value)}
                  onBlur={() => setTouched(p => ({ ...p, smtp_port: true }))}
                  aria-invalid={!!showErr("smtp_port")}
                  className={errCls("smtp_port")}
                />
                <FieldError msg={showErr("smtp_port")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smtp_user">Username<RequiredMark /></Label>
                <Input id="smtp_user" placeholder="smtp-user" value={cfg.smtp_user}
                  onChange={e => set("smtp_user", e.target.value)}
                  onBlur={() => setTouched(p => ({ ...p, smtp_user: true }))}
                  aria-invalid={!!showErr("smtp_user")}
                  className={errCls("smtp_user")}
                />
                <FieldError msg={showErr("smtp_user")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp_pass">Password<RequiredMark /></Label>
                <div className="relative">
                  <Input id="smtp_pass" type={showPass ? "text" : "password"} placeholder="••••••••" value={cfg.smtp_pass}
                    onChange={e => set("smtp_pass", e.target.value)}
                    onBlur={() => setTouched(p => ({ ...p, smtp_pass: true }))}
                    aria-invalid={!!showErr("smtp_pass")}
                    className={`pr-9 ${errCls("smtp_pass")}`}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FieldError msg={showErr("smtp_pass")} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="smtp_secure" checked={cfg.smtp_secure === "true"} onCheckedChange={handleTlsToggle} />
              <Label htmlFor="smtp_secure" className="text-sm font-normal cursor-pointer">
                Use TLS/SSL
                <span className="ml-1.5 text-muted-foreground text-xs">
                  {cfg.smtp_secure === "true" ? "— port 465 recommended" : "— port 587 / STARTTLS recommended"}
                </span>
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SendGrid */}
      {provider === "sendgrid" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SendGrid API Key</CardTitle>
            <CardDescription>Create an API key in your SendGrid dashboard under Settings → API Keys.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="sendgrid_key">API Key<RequiredMark /></Label>
              <Input id="sendgrid_key" type="password" placeholder="SG.xxxx" value={cfg.sendgrid_key}
                onChange={e => set("sendgrid_key", e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, sendgrid_key: true }))}
                aria-invalid={!!showErr("sendgrid_key")}
                className={errCls("sendgrid_key")}
              />
              <FieldError msg={showErr("sendgrid_key")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mailgun */}
      {provider === "mailgun" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mailgun Configuration</CardTitle>
            <CardDescription>Find your API key and sending domain in the Mailgun dashboard under Sending → Domains.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mailgun_key">API Key<RequiredMark /></Label>
              <Input id="mailgun_key" type="password" placeholder="key-xxxx" value={cfg.mailgun_key}
                onChange={e => set("mailgun_key", e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, mailgun_key: true }))}
                aria-invalid={!!showErr("mailgun_key")}
                className={errCls("mailgun_key")}
              />
              <FieldError msg={showErr("mailgun_key")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mailgun_domain">Domain<RequiredMark /></Label>
              <Input id="mailgun_domain" placeholder="mg.yourdomain.com" value={cfg.mailgun_domain}
                onChange={e => set("mailgun_domain", e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, mailgun_domain: true }))}
                aria-invalid={!!showErr("mailgun_domain")}
                className={errCls("mailgun_domain")}
              />
              <FieldError msg={showErr("mailgun_domain")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* SES */}
      {provider === "ses" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Amazon SES</CardTitle>
            <CardDescription>AWS access credentials are read from environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY). Specify the region where your SES is configured.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="aws_region">AWS Region<RequiredMark /></Label>
              <Input id="aws_region" placeholder="us-east-1" value={cfg.aws_region}
                onChange={e => set("aws_region", e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, aws_region: true }))}
                aria-invalid={!!showErr("aws_region")}
                className={errCls("aws_region")}
              />
              <FieldError msg={showErr("aws_region")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Postmark */}
      {provider === "postmark" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Postmark Server Token</CardTitle>
            <CardDescription>Find your Server Token in your Postmark account under Servers → API Tokens.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="postmark_token">Server Token<RequiredMark /></Label>
              <Input id="postmark_token" type="password" placeholder="xxxx-xxxx" value={cfg.postmark_token}
                onChange={e => set("postmark_token", e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, postmark_token: true }))}
                aria-invalid={!!showErr("postmark_token")}
                className={errCls("postmark_token")}
              />
              <FieldError msg={showErr("postmark_token")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sender Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" /> Sender Identity</CardTitle>
          <CardDescription>The name and address recipients see in their inbox. The From Email must be verified with your provider.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="smtp_from_name">From Name<RequiredMark /></Label>
              <Input id="smtp_from_name" placeholder="WHMS" value={cfg.smtp_from_name}
                onChange={e => set("smtp_from_name", e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, smtp_from_name: true }))}
                aria-invalid={!!showErr("smtp_from_name")}
                className={errCls("smtp_from_name")}
              />
              <FieldError msg={showErr("smtp_from_name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtp_from_email">From Email<RequiredMark /></Label>
              <Input id="smtp_from_email" type="email" placeholder="no-reply@yourdomain.com" value={cfg.smtp_from_email}
                onChange={e => set("smtp_from_email", e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, smtp_from_email: true }))}
                aria-invalid={!!showErr("smtp_from_email")}
                className={errCls("smtp_from_email")}
              />
              <FieldError msg={showErr("smtp_from_email")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp_reply_to">
              Reply-To <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Input id="smtp_reply_to" type="email" placeholder="support@yourdomain.com" value={cfg.smtp_reply_to}
              onChange={e => set("smtp_reply_to", e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, smtp_reply_to: true }))}
              aria-invalid={!!showErr("smtp_reply_to")}
              className={errCls("smtp_reply_to")}
            />
            <FieldError msg={showErr("smtp_reply_to")} />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Check className="h-4 w-4 text-indigo-500" /> Save Settings</CardTitle>
          <CardDescription>Persist your configuration. Save before running connection or delivery tests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSave} disabled={saving}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            aria-busy={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Settings"}
          </Button>
          {!isDirty && savedCfg && !submitted && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Settings are up to date.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Test */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4 text-green-500" /> Test Configuration</CardTitle>
          <CardDescription>Verify your saved settings by testing the connection and sending a sample email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {isDirty && (
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">Save your settings first before testing.</AlertDescription>
            </Alert>
          )}

          {provider === "smtp" && (
            <div className="space-y-2">
              <Button variant="outline" onClick={handleTestConn} disabled={testing || isDirty} className="gap-2">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                {testing ? "Testing connection…" : "Test SMTP Connection"}
              </Button>
              {connStatus && (
                <Alert className={connStatus.ok ? "border-green-300 bg-green-50 dark:bg-green-950/30" : "border-destructive bg-destructive/5"}>
                  {connStatus.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <AlertDescription className={`text-sm ${connStatus.ok ? "text-green-700 dark:text-green-300" : "text-destructive"}`}>
                    {connStatus.msg}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="test_email">Send a test email</Label>
            <p className="text-xs text-muted-foreground">Sends a real email to verify end-to-end delivery from your configured sender.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Input id="test_email" type="email" placeholder="you@example.com" value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendTest()}
                className="w-64"
              />
              <Button onClick={handleSendTest} disabled={sending || !testEmail || isDirty}
                className="gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50" aria-busy={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending…" : "Send Test Email"}
              </Button>
            </div>
            {sendStatus && (
              <Alert className={sendStatus.ok ? "border-green-300 bg-green-50 dark:bg-green-950/30" : "border-destructive bg-destructive/5"}>
                {sendStatus.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <AlertDescription className={`text-sm ${sendStatus.ok ? "text-green-700 dark:text-green-300" : "text-destructive"}`}>
                  {sendStatus.msg}
                </AlertDescription>
              </Alert>
            )}
          </div>

        </CardContent>
      </Card>

    </div>
  );
}

// ── Notifications Settings Panel ────────────────────────────────────────────

function NotificationsSettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/settings/notifications");
      if (data.success) {
        setNotifications(data.notifications || {});
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(key, value) {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const settingKey = `notifications.${key}`;
      const data = await apiFetch(`/admin/settings/${settingKey}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });
      if (data.success) {
        setNotifications(prev => ({ ...prev, [key]: value }));
        toast({ title: `${key} notification ${value ? "enabled" : "disabled"}` });
      } else {
        throw new Error(data.error || "Failed to update");
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading notification settings...
      </div>
    );
  }

  const groups = {
    service: {
      title: 'Service Events',
      events: [
        { key: 'service.activated', label: 'Service Activated', desc: 'When hosting account provisioning completes' },
        { key: 'service.suspended', label: 'Service Suspended', desc: 'When service is suspended due to non-payment' },
        { key: 'service.terminated', label: 'Service Terminated', desc: 'When service is terminated' },
      ]
    },
    billing: {
      title: 'Billing Events',
      events: [
        { key: 'billing.invoice_created', label: 'Invoice Created', desc: 'New invoice generated' },
        { key: 'billing.payment_received', label: 'Payment Received', desc: 'Payment successfully recorded' },
        { key: 'billing.payment_overdue', label: 'Payment Overdue', desc: 'Invoice payment is overdue' },
        { key: 'billing.refund_issued', label: 'Refund Issued', desc: 'Refund processed' },
      ]
    },
    order: {
      title: 'Order Events',
      events: [
        { key: 'order.placed', label: 'Order Placed', desc: 'New order created' },
      ]
    },
    support: {
      title: 'Support Events',
      events: [
        { key: 'support.ticket_created', label: 'Ticket Created', desc: 'New support ticket opened' },
        { key: 'support.ticket_reply', label: 'Ticket Reply', desc: 'Support staff replies to ticket' },
        { key: 'support.ticket_closed', label: 'Ticket Closed', desc: 'Support ticket resolved' },
      ]
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Control which notifications are sent to clients. All notifications are enabled by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(groups).map(([groupKey, group]) => (
              <div key={groupKey}>
                <h3 className="text-sm font-semibold mb-4">{group.title}</h3>
                <div className="space-y-3">
                  {group.events.map(event => (
                    <div key={event.key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[event.key] ?? true}
                        onCheckedChange={(val) => handleToggle(event.key, val)}
                        disabled={saving[event.key]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Webhooks Panel ──────────────────────────────────────────────────────────

const ALL_EVENTS = [
  "ACCOUNT_CREATED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_TERMINATED",
  "SERVER_DOWN",
  "HIGH_CPU_USAGE",
  "SERVER_ADDED",
];

const EVENT_LABELS = {
  ACCOUNT_CREATED: "Account Created",
  ACCOUNT_SUSPENDED: "Account Suspended",
  ACCOUNT_TERMINATED: "Account Terminated",
  SERVER_DOWN: "Server Down",
  HIGH_CPU_USAGE: "High CPU Usage",
  SERVER_ADDED: "Server Added",
};

function WebhookFormDialog({ open, onClose, onSaved, initial }) {
  const { toast } = useToast();
  const isEdit = Boolean(initial);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [events, setEvents] = useState(initial?.events ?? []);
  const [secret, setSecret] = useState(initial?.secret ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(initial?.url ?? "");
      setEvents(initial?.events ?? []);
      setSecret(initial?.secret ?? "");
      setIsActive(initial?.isActive ?? true);
    }
  }, [open, initial]);

  function toggleEvent(ev) {
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }

  async function handleSave() {
    if (!url) return toast({ variant: "destructive", title: "URL is required" });
    if (!events.length) return toast({ variant: "destructive", title: "Select at least one event" });
    setSaving(true);
    try {
      if (isEdit) {
        await WebhooksAPI.update(initial.id, { url, events, secret: secret || null, isActive });
        toast({ title: "Webhook updated" });
      } else {
        await WebhooksAPI.create({ url, events, secret: secret || null });
        toast({ title: "Webhook created" });
      }
      onSaved();
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
          <DialogDescription>
            Webhooks notify external URLs when system events occur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Endpoint URL <span className="text-destructive">*</span></Label>
            <Input
              placeholder="https://example.com/webhook"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Events <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map(ev => (
                <div key={ev} className="flex items-center gap-2">
                  <Checkbox
                    id={`ev-${ev}`}
                    checked={events.includes(ev)}
                    onCheckedChange={() => toggleEvent(ev)}
                  />
                  <label htmlFor={`ev-${ev}`} className="text-sm cursor-pointer select-none">
                    {EVENT_LABELS[ev]}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Secret (optional)</Label>
            <Input
              placeholder="Used to sign webhook payloads"
              value={secret}
              onChange={e => setSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If set, payloads include an <code>X-Webhook-Secret</code> header for verification.
            </p>
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="wh-active" />
              <label htmlFor="wh-active" className="text-sm">Active</label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Storage Paths Panel ──────────────────────────────────────────────────────

function ProvisioningSettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoProvisioning, setAutoProvisioning] = useState(true);

  // CyberPanel SSH credentials state
  const [cyberHost, setCyberHost] = useState("");
  const [cyberSshPort, setCyberSshPort] = useState("22");
  const [cyberSshUser, setCyberSshUser] = useState("root");
  const [cyberAdminUser, setCyberAdminUser] = useState("admin");
  const [cyberAdminPass, setCyberAdminPass] = useState("");
  const [cyberAdminPassSet, setCyberAdminPassSet] = useState(false);
  const [cyberPanelPort, setCyberPanelPort] = useState("8090");
  const [cyberPrivateKey, setCyberPrivateKey] = useState("");
  const [cyberSshPassword, setCyberSshPassword] = useState("");
  const [showSshPassword, setShowSshPassword] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [cyberConfigured, setCyberConfigured] = useState(false);
  const [cyberAuthType, setCyberAuthType] = useState("none");
  const [cyberSaving, setCyberSaving] = useState(false);
  const [cyberTesting, setCyberTesting] = useState(false);
  const [cyberTestResult, setCyberTestResult] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      // apiFetch returns parsed JSON directly — do NOT call .json() on result
      const [provData, cyberData] = await Promise.all([
        apiFetch("/admin/settings/provisioning"),
        apiFetch("/admin/settings/cyberpanel"),
      ]);

      if (provData.success) setAutoProvisioning(provData.autoProvisioning);

      if (cyberData.success) {
        setCyberHost(cyberData.host || "");
        setCyberSshPort(String(cyberData.sshPort || 22));
        setCyberSshUser(cyberData.sshUser || "root");
        setCyberAdminUser(cyberData.adminUser || "admin");
        setCyberPanelPort(String(cyberData.panelPort || 8090));
        setCyberAdminPassSet(!!cyberData.adminPassSet);
        setCyberConfigured(cyberData.configured);
        setCyberAuthType(cyberData.authType || "none");
      }
    } catch {
      // silently ignore load errors
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(val) {
    setSaving(true);
    try {
      const data = await apiFetch("/admin/settings/provisioning", {
        method: "PUT",
        body: JSON.stringify({ enabled: val }),
      });
      if (data.success) {
        setAutoProvisioning(data.autoProvisioning);
        toast({ title: `Auto-provisioning ${data.autoProvisioning ? "enabled" : "disabled"}` });
      } else {
        throw new Error(data.error || "Failed to update");
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCyberPanel(e) {
    e.preventDefault();

    if (!cyberHost) {
      toast({ title: "Host is required", variant: "destructive" });
      return;
    }
    if (!cyberPrivateKey && !cyberSshPassword && !cyberConfigured) {
      toast({ title: "SSH private key or password is required", variant: "destructive" });
      return;
    }

    setCyberSaving(true);
    setCyberTestResult(null);
    try {
      const payload = {
        host: cyberHost,
        sshPort: Number(cyberSshPort) || 22,
        sshUser: cyberSshUser || "root",
        adminUser: cyberAdminUser || "admin",
        panelPort: Number(cyberPanelPort) || 8090,
      };
      if (cyberPrivateKey) payload.sshPrivateKey = cyberPrivateKey;
      if (cyberSshPassword) payload.sshPassword = cyberSshPassword;
      if (cyberAdminPass) payload.adminPass = cyberAdminPass;

      const data = await apiFetch("/admin/settings/cyberpanel", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!data.success) throw new Error(data.error || "Save failed");
      toast({ title: "CyberPanel credentials saved" });

      // Clear sensitive fields after save
      setCyberPrivateKey("");
      setCyberSshPassword("");
      setCyberAdminPass("");

      // Refresh status
      const refreshed = await apiFetch("/admin/settings/cyberpanel");
      if (refreshed.success) {
        setCyberConfigured(refreshed.configured);
        setCyberAuthType(refreshed.authType || "none");
        setCyberAdminPassSet(!!refreshed.adminPassSet);
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCyberSaving(false);
    }
  }

  async function handleTestCyberPanel() {
    setCyberTesting(true);
    setCyberTestResult(null);
    try {
      const data = await apiFetch("/admin/settings/cyberpanel/test", { method: "POST" });
      if (data.success) {
        setCyberTestResult({ ok: true, message: data.message || "SSH connection verified — CyberPanel is reachable." });
      } else {
        setCyberTestResult({ ok: false, message: data.error || "Connection failed" });
      }
    } catch (err) {
      setCyberTestResult({ ok: false, message: err.message || "Connection failed" });
    } finally {
      setCyberTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading provisioning settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-provisioning toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Provisioning Settings
          </CardTitle>
          <CardDescription>
            Control how hosting accounts are provisioned when orders are activated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Auto-Provisioning</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, hosting accounts are provisioned automatically when an order is activated or an invoice is paid.
                When disabled, orders are queued as <code className="text-xs bg-muted px-1 rounded">pending_manual</code> and must be provisioned manually.
              </p>
            </div>
            <Switch
              checked={autoProvisioning}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>

          {!autoProvisioning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Auto-provisioning is <strong>disabled</strong>. New orders will be queued for manual provisioning.
                Go to <strong>Orders</strong> to manually provision or activate accounts.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* CyberPanel SSH Credentials */}
      {cyberConfigured && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Active Control Panel:</strong> CyberPanel is configured via SSH (auth: <strong>{cyberAuthType}</strong>).
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            CyberPanel SSH Credentials
            {cyberConfigured && (
              <Badge variant="secondary" className="ml-2 text-green-600 bg-green-50 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            CyberPanel has no REST API — provisioning uses SSH to run the <code className="text-xs bg-muted px-1 rounded">cyberpanel</code> CLI on your server. Provide SSH access credentials below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCyberPanel} className="space-y-4">
            {/* Host + SSH Port + Panel Port */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="cyber-host">Server IP / Hostname</Label>
                <Input
                  id="cyber-host"
                  placeholder="209.74.81.196 or server.yourdomain.com"
                  value={cyberHost}
                  onChange={e => setCyberHost(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">IP address or hostname of your CyberPanel VPS</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cyber-ssh-port">SSH Port</Label>
                <Input
                  id="cyber-ssh-port"
                  type="number"
                  min="1"
                  max="65535"
                  placeholder="22"
                  value={cyberSshPort}
                  onChange={e => setCyberSshPort(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Default: 22</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cyber-panel-port">Panel Port</Label>
                <Input
                  id="cyber-panel-port"
                  type="number"
                  min="1"
                  max="65535"
                  placeholder="8090"
                  value={cyberPanelPort}
                  onChange={e => setCyberPanelPort(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Default: 8090</p>
              </div>
            </div>

            {/* SSH User + CyberPanel Admin Username */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cyber-ssh-user">SSH Username</Label>
                <Input
                  id="cyber-ssh-user"
                  placeholder="root"
                  value={cyberSshUser}
                  onChange={e => setCyberSshUser(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">OS user for SSH (usually <code className="bg-muted px-1 rounded">root</code>)</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cyber-admin-user">CyberPanel Admin Username</Label>
                <Input
                  id="cyber-admin-user"
                  placeholder="admin"
                  value={cyberAdminUser}
                  onChange={e => setCyberAdminUser(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Panel owner for websites (usually <code className="bg-muted px-1 rounded">admin</code>)</p>
              </div>
            </div>

            {/* CyberPanel Admin Password — required for suspend/unsuspend */}
            <div className="space-y-1.5">
              <Label htmlFor="cyber-admin-pass">
                CyberPanel Admin Password
                <span className="text-xs text-muted-foreground font-normal ml-1">(required for suspend / unsuspend)</span>
              </Label>
              <div className="relative">
                <Input
                  id="cyber-admin-pass"
                  type={showAdminPass ? "text" : "password"}
                  placeholder={cyberAdminPassSet ? "Leave blank to keep current password" : "CyberPanel web panel admin password"}
                  value={cyberAdminPass}
                  onChange={e => setCyberAdminPass(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAdminPass(v => !v)}
                  tabIndex={-1}
                >
                  {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used for suspend/unsuspend via the CyberPanel web API — the CLI has no suspend command.
                {cyberAdminPassSet && <span className="ml-1 text-green-600 font-medium">✓ Password stored</span>}
              </p>
            </div>

            <Separator />

            {/* SSH Private Key (recommended) */}
            <div className="space-y-1.5">
              <Label htmlFor="cyber-private-key">SSH Private Key <span className="text-xs text-muted-foreground font-normal">(recommended)</span></Label>
              <Textarea
                id="cyber-private-key"
                placeholder={cyberConfigured && cyberAuthType === "key"
                  ? "Leave blank to keep current key"
                  : "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
                value={cyberPrivateKey}
                onChange={e => setCyberPrivateKey(e.target.value)}
                className="font-mono text-xs min-h-[100px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Paste the contents of your <code className="bg-muted px-1 rounded">~/.ssh/id_rsa</code> or <code className="bg-muted px-1 rounded">id_ed25519</code> private key.
                The public key must be in <code className="bg-muted px-1 rounded">~/.ssh/authorized_keys</code> on the server.
              </p>
            </div>

            {/* SSH Password (fallback) */}
            <div className="space-y-1.5">
              <Label htmlFor="cyber-ssh-password">SSH Password <span className="text-xs text-muted-foreground font-normal">(fallback — key auth preferred)</span></Label>
              <div className="relative">
                <Input
                  id="cyber-ssh-password"
                  type={showSshPassword ? "text" : "password"}
                  placeholder={cyberConfigured && cyberAuthType === "password" ? "Leave blank to keep current password" : "SSH password (optional if key provided)"}
                  value={cyberSshPassword}
                  onChange={e => setCyberSshPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSshPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showSshPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {cyberConfigured && (
                <p className="text-xs text-muted-foreground">
                  SSH auth: <code className="bg-muted px-1 rounded">{cyberAuthType}</code>
                  {cyberAuthType === "none" && " — no SSH credentials stored yet"}
                </p>
              )}
            </div>

            {cyberTestResult && (
              <Alert variant={cyberTestResult.ok ? "default" : "destructive"}>
                {cyberTestResult.ok
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <XCircle className="h-4 w-4" />}
                <AlertDescription>{cyberTestResult.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={cyberSaving}>
                {cyberSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save SSH Credentials
              </Button>
              {cyberConfigured && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestCyberPanel}
                  disabled={cyberTesting}
                >
                  {cyberTesting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing SSH...</>
                    : <><TestTube2 className="h-4 w-4 mr-2" />Test SSH Connection</>}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StoragePathsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await AdminBillingAPI.getStoragePaths();
      setSettings(data.settings ?? data);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load storage settings", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function set(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await AdminBillingAPI.updateStoragePaths(settings);
      setSettings(data.settings ?? data);
      toast({ title: "Storage paths saved", description: "Changes take effect on the next upload or backup." });
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading storage settings…
      </div>
    );
  }

  const fields = [
    {
      key: "backupsPath",
      label: "Backup Files Path",
      description: "Where database and file backup archives are stored on disk. Used as the default for local backup storage configs.",
      placeholder: "storage/backups",
    },
    {
      key: "broadcastsPath",
      label: "Broadcast Uploads Path",
      description: "Where files attached to broadcast announcements (PDFs, images, etc.) are stored.",
      placeholder: "storage/broadcasts",
    },
    {
      key: "pluginUploadsPath",
      label: "Plugin Uploads Path",
      description: "Where plugin ZIP files are staged when uploaded through the marketplace.",
      placeholder: "storage/plugin-uploads",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            File Storage Paths
          </CardTitle>
          <CardDescription>
            Configure where uploaded files and backups are stored on the server filesystem.
            Paths can be relative (to the server working directory) or absolute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Changing a path will not move existing files — you must manually migrate them.
              The new path takes effect on the next upload or backup operation.
            </AlertDescription>
          </Alert>

          {fields.map(({ key, label, description, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                {label}
              </Label>
              <Input
                value={settings[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save paths
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WebhooksPanel() {
  const { toast } = useToast();
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Event settings
  const [enabledEvents, setEnabledEvents] = useState(
    Object.fromEntries(ALL_EVENTS.map(e => [e, true]))
  );
  const [savingEvent, setSavingEvent] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [hooksRes, settingsRes] = await Promise.all([
        WebhooksAPI.list(),
        WebhooksAPI.getSettings(),
      ]);
      setHooks(hooksRes.data ?? []);
      if (settingsRes.enabledEvents) setEnabledEvents(settingsRes.enabledEvents);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to load webhooks", description: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleEventToggle(ev) {
    if (savingEvent) return;
    const next = { ...enabledEvents, [ev]: !enabledEvents[ev] };
    setSavingEvent(ev);
    try {
      await WebhooksAPI.updateSettings(next);
      setEnabledEvents(next);
      toast({ title: `${EVENT_LABELS[ev]} ${next[ev] ? "enabled" : "disabled"}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to update settings", description: e.message });
    } finally {
      setSavingEvent(null);
    }
  }

  async function handleToggle(hook) {
    try {
      await WebhooksAPI.update(hook.id, { isActive: !hook.isActive });
      setHooks(prev => prev.map(h => h.id === hook.id ? { ...h, isActive: !h.isActive } : h));
    } catch (e) {
      toast({ variant: "destructive", title: "Update failed", description: e.message });
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await WebhooksAPI.remove(id);
      setHooks(prev => prev.filter(h => h.id !== id));
      toast({ title: "Webhook deleted" });
    } catch (e) {
      toast({ variant: "destructive", title: "Delete failed", description: e.message });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Outgoing Webhooks
            </CardTitle>
            <CardDescription>
              Notify external URLs when system events occur. Payloads are sent as JSON POST requests.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Webhook
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading webhooks…
            </div>
          ) : hooks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border rounded-md bg-muted/30">
              No webhooks configured. Add one to start receiving event notifications.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hooks.map(hook => (
                  <TableRow key={hook.id}>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate" title={hook.url}>
                      {hook.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {hook.events.map(ev => (
                          <Badge key={ev} variant="secondary" className="text-xs">
                            {EVENT_LABELS[ev] ?? ev}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={hook.isActive}
                        onCheckedChange={() => handleToggle(hook)}
                        aria-label="Toggle webhook active"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditing(hook); setDialogOpen(true); }}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(hook.id)}
                          disabled={deleting === hook.id}
                          title="Delete"
                        >
                          {deleting === hook.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Event Settings
              </CardTitle>
              <CardDescription>
                Enable or disable which system events can trigger webhooks. Disabled events will not fire any webhook deliveries.
              </CardDescription>
            </div>
            {savingEvent && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-1 shrink-0" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {ALL_EVENTS.map(ev => (
              <div key={ev} className="flex items-center justify-between gap-3 py-1 border-b last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{EVENT_LABELS[ev]}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{ev}</p>
                </div>
                <Switch
                  checked={enabledEvents[ev] !== false}
                  onCheckedChange={() => handleEventToggle(ev)}
                  disabled={savingEvent === ev}
                  aria-label={`Toggle ${EVENT_LABELS[ev]}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <WebhookFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSaved={load}
        initial={editing}
      />
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { user, loadSession } = useAuth();
  const { toast } = useToast();

  const [mfaEnabled, setMfaEnabled] = useState(null); // null = loading
  const [showDisable, setShowDisable] = useState(false);

  // Fetch real MFA state from /auth/me which includes mfaEnabled
  useEffect(() => {
    AuthAPI.me()
      .then(data => setMfaEnabled(Boolean(data?.user?.mfaEnabled)))
      .catch(() => setMfaEnabled(false));
  }, []);

  function handleMFAEnabled() {
    setMfaEnabled(true);
    loadSession();
  }

  function handleMFADisabled() {
    setMfaEnabled(false);
    loadSession();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account preferences and security settings.
          </p>
        </div>
      </div>

      <Tabs defaultValue="security">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Email</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5"><Percent className="h-3.5 w-3.5" />Billing &amp; Tax</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Invoices</TabsTrigger>
          <TabsTrigger value="domains" className="gap-1.5"><Globe className="h-3.5 w-3.5" />Domains</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" />Webhooks</TabsTrigger>
          <TabsTrigger value="storage" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" />Storage</TabsTrigger>
          <TabsTrigger value="provisioning" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Provisioning</TabsTrigger>
        </TabsList>

        {/* ── Account Tab ──────────────────────────────────── */}
        <TabsContent value="account" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your account identity and role information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                <p className="text-sm font-medium">{user?.email || "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Roles</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {(user?.roles || []).map(r => (
                    <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">User ID</Label>
                <p className="text-xs text-muted-foreground font-mono">{user?.id || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ─────────────────────────────────── */}
        <TabsContent value="security" className="mt-4 space-y-4">

          {/* MFA Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {mfaEnabled
                      ? <ShieldCheck className="h-4 w-4 text-green-500" />
                      : <ShieldOff className="h-4 w-4 text-muted-foreground" />
                    }
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of protection using a time-based one-time password (TOTP).
                  </CardDescription>
                </div>
                {mfaEnabled !== null && (
                  <Badge variant={mfaEnabled ? "default" : "secondary"} className={mfaEnabled ? "bg-green-500 hover:bg-green-600" : ""}>
                    {mfaEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {mfaEnabled === null ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading MFA status…
                </div>
              ) : mfaEnabled ? (
                <div className="flex flex-col gap-4">
                  <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertDescription>
                      MFA is active. Your account requires a verification code on each login.
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="self-start"
                    onClick={() => setShowDisable(true)}
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Disable MFA
                  </Button>
                </div>
              ) : (
                <MFASetupFlow onEnabled={handleMFAEnabled} />
              )}
            </CardContent>
          </Card>

          {/* Backup Codes Card — only shown when MFA is enabled */}
          {mfaEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Backup Codes
                </CardTitle>
                <CardDescription>
                  Single-use codes to recover access if you lose your authenticator device.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackupCodesPanel />
              </CardContent>
            </Card>
          )}

        </TabsContent>

        {/* ── API Keys Tab ─────────────────────────────── */}
        <TabsContent value="apikeys" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage public API keys for embedding billing widgets on external websites.
                Use <code className="text-xs bg-muted px-1 rounded font-mono">pk_</code> keys
                in frontend code — never expose secret keys client-side.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeysPanel />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available scopes</CardTitle>
              <CardDescription>
                Restrict each key to only the endpoints it needs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Scope</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["plans.read",     "GET /public/v1/plans",        "List & fetch active plans"],
                      ["clients.create", "POST /public/v1/clients",     "Register new client accounts"],
                      ["auth.login",     "POST /public/v1/auth/login",  "Authenticate clients, fetch /me"],
                      ["orders.create",  "POST /public/v1/orders",      "Place orders (client token required)"],
                      ["invoices.read",  "GET /public/v1/invoices/:id", "Fetch invoice details (client token required)"],
                    ].map(([scope, endpoint, desc]) => (
                      <TableRow key={scope}>
                        <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{scope}</code></TableCell>
                        <TableCell><code className="text-xs font-mono text-muted-foreground">{endpoint}</code></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance Tab ───────────────────────────── */}
        <TabsContent value="appearance" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the admin interface.
                Changes are saved locally and apply immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppearancePanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email Tab ────────────────────────────────── */}
        <TabsContent value="email" className="mt-4">
          <EmailSettingsPanel />
        </TabsContent>

        {/* ── Notifications Tab ─────────────────────── */}
        <TabsContent value="notifications" className="mt-4">
          <NotificationsSettingsPanel />
        </TabsContent>

        {/* ── Billing & Tax Tab ─────────────────────── */}
        <TabsContent value="billing" className="mt-4">
          <BillingTaxPanel />
        </TabsContent>

        {/* ── Invoices Tab ──────────────────────────── */}
        <TabsContent value="invoices" className="mt-4">
          <InvoiceSettingsPanel />
        </TabsContent>

        {/* ── Domains Tab ───────────────────────────── */}
        <TabsContent value="domains" className="mt-4">
          <DomainRegistrarPanel />
        </TabsContent>

        {/* ── Webhooks Tab ──────────────────────────── */}
        <TabsContent value="webhooks" className="mt-4">
          <WebhooksPanel />
        </TabsContent>

        {/* ── Storage Tab ───────────────────────────── */}
        <TabsContent value="storage" className="mt-4">
          <StoragePathsPanel />
        </TabsContent>

        <TabsContent value="provisioning" className="mt-4">
          <ProvisioningSettingsPanel />
        </TabsContent>

      </Tabs>

      <DisableMFADialog
        open={showDisable}
        onClose={() => setShowDisable(false)}
        onDisabled={handleMFADisabled}
      />
    </div>
  );
}
