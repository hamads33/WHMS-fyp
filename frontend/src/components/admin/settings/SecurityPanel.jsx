"use client";

import { useState, useRef } from "react";
import {
  Copy, Check, AlertTriangle, Loader2, KeyRound, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AuthAPI } from "@/lib/api/auth";

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

export function DisableMFADialog({ open, onClose, onDisabled }) {
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

export function BackupCodesPanel() {
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

// ── Main Security Panel for Tab ───────────────────────────────────────────────

export default function SecurityPanel({ mfaEnabled, onMFAEnabled, showDisableMFA, onShowDisableMFA, onMFADisabled }) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
        {mfaEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">MFA is enabled</p>
                <p className="text-sm text-green-700 dark:text-green-300">Your account is protected with two-factor authentication</p>
              </div>
              <Button variant="destructive" onClick={() => onShowDisableMFA(true)}>
                Disable MFA
              </Button>
            </div>
            <BackupCodesPanel />
          </div>
        ) : (
          <MFASetupFlow onEnabled={onMFAEnabled} />
        )}
      </div>
    </div>
  );
}
