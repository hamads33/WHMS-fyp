"use client";

import { useState, useEffect } from "react";
import {
  Mail, Server, Send, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Zap, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmailSettingsAPI } from "@/lib/api/email-settings";

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

export default function EmailSettingsPanel() {
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

      {isDirty && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            You have unsaved changes. Save settings before running tests.
          </AlertDescription>
        </Alert>
      )}

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> Save Settings</CardTitle>
          <CardDescription>Persist your configuration. Save before running connection or delivery tests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSave} disabled={saving}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            aria-busy={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Settings"}
          </Button>
          {!isDirty && savedCfg && !submitted && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Settings are up to date.
            </p>
          )}
        </CardContent>
      </Card>

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
