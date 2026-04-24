"use client";

import { useState, useEffect } from "react";
import { Globe, Key, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api/client";

export default function DomainRegistrarPanel() {
  const { toast } = useToast();

  const asBool = (value, fallback = false) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" ? true : normalized === "false" ? false : fallback;
    }
    return fallback;
  };

  const [pbKey,    setPbKey]    = useState("");
  const [pbSecret, setPbSecret] = useState("");
  const [pbEnabled, setPbEnabled] = useState(false);

  const [ncUser,    setNcUser]    = useState("");
  const [ncKey,     setNcKey]     = useState("");
  const [ncIp,      setNcIp]      = useState("");
  const [ncSandbox, setNcSandbox] = useState(true);
  const [ncEnabled, setNcEnabled] = useState(false);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null);
  const [testing,  setTesting]  = useState(null);
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

  async function save(registrar) {
    setSaving(registrar);
    const body = registrar === "porkbun"
      ? { porkbun_api_key: pbKey.trim(), porkbun_secret_key: pbSecret.trim(), porkbun_enabled: pbEnabled }
      : { namecheap_api_user: ncUser.trim(), namecheap_api_key: ncKey.trim(), namecheap_client_ip: ncIp.trim(), namecheap_sandbox: ncSandbox, namecheap_enabled: ncEnabled };

    try {
      const json = await apiFetch("/admin/domains/settings", { method: "PUT", body: JSON.stringify(body) });
      if (json.success) {
        toast({ title: "✅ Saved", description: `${registrar === "porkbun" ? "Porkbun" : "Namecheap"} settings saved.` });
      } else {
        throw new Error(json.error || "Save failed");
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed", description: err.message });
    } finally {
      setSaving(null);
    }
  }

  async function testConnection(registrar) {
    setTesting(registrar);
    try {
      await save(registrar);
      const json = await apiFetch(`/admin/domains/settings/test?registrar=${registrar}`, { method: "POST" });
      if (json.success) {
        toast({ title: "✅ Connection OK", description: "Credentials are valid and working." });
      } else {
        throw new Error(json.error || "Connection failed");
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Connection Failed", description: err.message });
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Porkbun Registrar
          </CardTitle>
          <CardDescription>API credentials for Porkbun domain management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pb_key">API Key</Label>
            <Input
              id="pb_key"
              type="password"
              placeholder="••••••••"
              value={pbKey}
              onChange={(e) => setPbKey(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pb_secret">API Secret</Label>
            <div className="relative">
              <Input
                id="pb_secret"
                type={showPbSecret ? "text" : "password"}
                placeholder="••••••••"
                value={pbSecret}
                onChange={(e) => setPbSecret(e.target.value)}
                className="pr-9"
              />
              <button type="button" onClick={() => setShowPbSecret(!showPbSecret)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPbSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label className="text-sm font-normal cursor-pointer">Enable Porkbun</Label>
            <Switch checked={pbEnabled} onCheckedChange={setPbEnabled} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => testConnection("porkbun")} disabled={testing === "porkbun"}>
              {testing === "porkbun" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
            <Button onClick={() => save("porkbun")} disabled={saving === "porkbun"}>
              {saving === "porkbun" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Namecheap Registrar
          </CardTitle>
          <CardDescription>API credentials for Namecheap domain management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nc_user">API Username</Label>
            <Input
              id="nc_user"
              placeholder="your_username"
              value={ncUser}
              onChange={(e) => setNcUser(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc_key">API Key</Label>
            <div className="relative">
              <Input
                id="nc_key"
                type={showNcKey ? "text" : "password"}
                placeholder="••••••••"
                value={ncKey}
                onChange={(e) => setNcKey(e.target.value)}
                className="pr-9"
              />
              <button type="button" onClick={() => setShowNcKey(!showNcKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNcKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc_ip">Client IP</Label>
            <Input
              id="nc_ip"
              placeholder="192.0.2.1"
              value={ncIp}
              onChange={(e) => setNcIp(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label className="text-sm font-normal cursor-pointer">Sandbox Mode</Label>
            <Switch checked={ncSandbox} onCheckedChange={setNcSandbox} />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label className="text-sm font-normal cursor-pointer">Enable Namecheap</Label>
            <Switch checked={ncEnabled} onCheckedChange={setNcEnabled} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => testConnection("namecheap")} disabled={testing === "namecheap"}>
              {testing === "namecheap" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
            <Button onClick={() => save("namecheap")} disabled={saving === "namecheap"}>
              {saving === "namecheap" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
