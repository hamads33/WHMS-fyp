"use client";

import { useState, useEffect } from "react";
import { Server, Key, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api/client";

export default function ProvisioningPanel() {
  const { toast } = useToast();

  const [cpEnabled, setCpEnabled] = useState(false);
  const [cpHost,    setCpHost]    = useState("");
  const [cpSshPort, setCpSshPort] = useState("22");
  const [cpSshUser, setCpSshUser] = useState("");
  const [cpAdminUser, setCpAdminUser] = useState("");
  const [cpPanelPort, setCpPanelPort] = useState("8883");
  const [cpSshKey,  setCpSshKey]  = useState("");
  const [cpSshPass, setCpSshPass] = useState("");
  const [cpAdminPass, setCpAdminPass] = useState("");

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showPass, setShowPass] = useState({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const json = await apiFetch("/admin/settings/provisioning");
        if (json.success) {
          const s = json.settings || {};
          setCpEnabled(s.cp_enabled === true || s.cp_enabled === "true");
          setCpHost(s.cp_host || "");
          setCpSshPort(s.cp_ssh_port || "22");
          setCpSshUser(s.cp_ssh_user || "");
          setCpAdminUser(s.cp_admin_user || "");
          setCpPanelPort(s.cp_panel_port || "8883");
          setCpSshKey(s.cp_ssh_key || "");
          setCpSshPass(s.cp_ssh_pass || "");
          setCpAdminPass(s.cp_admin_pass || "");
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    const body = {
      cp_enabled: cpEnabled,
      cp_host: cpHost.trim(),
      cp_ssh_port: cpSshPort,
      cp_ssh_user: cpSshUser.trim(),
      cp_admin_user: cpAdminUser.trim(),
      cp_panel_port: cpPanelPort,
      cp_ssh_key: cpSshKey.trim(),
      cp_ssh_pass: cpSshPass,
      cp_admin_pass: cpAdminPass,
    };

    try {
      const json = await apiFetch("/admin/settings/cyberpanel", { method: "PUT", body: JSON.stringify(body) });
      if (json.success) {
        toast({ title: "Provisioning settings saved" });
      } else {
        throw new Error(json.error || "Save failed");
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const json = await apiFetch("/admin/settings/cyberpanel/test", { method: "POST" });
      if (json.success) {
        setTestResult({ ok: true, msg: "Connection successful" });
        toast({ title: "✅ Test passed" });
      } else {
        setTestResult({ ok: false, msg: json.error || "Connection failed" });
        toast({ variant: "destructive", title: "Test failed", description: json.error });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: err.message });
      toast({ variant: "destructive", title: "Test failed", description: err.message });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" /> Auto-Provisioning
          </CardTitle>
          <CardDescription>Enable automatic account provisioning through CyberPanel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label className="text-sm font-normal cursor-pointer">Enable CyberPanel Integration</Label>
            <Switch checked={cpEnabled} onCheckedChange={setCpEnabled} />
          </div>

          {cpEnabled && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cp_host">CyberPanel Host</Label>
                <Input
                  id="cp_host"
                  placeholder="cp.example.com"
                  value={cpHost}
                  onChange={(e) => setCpHost(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cp_ssh_port">SSH Port</Label>
                  <Input
                    id="cp_ssh_port"
                    type="number"
                    placeholder="22"
                    value={cpSshPort}
                    onChange={(e) => setCpSshPort(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cp_panel_port">Panel Port</Label>
                  <Input
                    id="cp_panel_port"
                    type="number"
                    placeholder="8883"
                    value={cpPanelPort}
                    onChange={(e) => setCpPanelPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cp_ssh_user">SSH Username</Label>
                  <Input
                    id="cp_ssh_user"
                    placeholder="root"
                    value={cpSshUser}
                    onChange={(e) => setCpSshUser(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cp_admin_user">Panel Admin User</Label>
                  <Input
                    id="cp_admin_user"
                    placeholder="admin"
                    value={cpAdminUser}
                    onChange={(e) => setCpAdminUser(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cp_ssh_key">SSH Private Key (PEM)</Label>
                <Textarea
                  id="cp_ssh_key"
                  placeholder="-----BEGIN PRIVATE KEY-----..."
                  value={cpSshKey}
                  onChange={(e) => setCpSshKey(e.target.value)}
                  className="font-mono text-xs"
                  rows={4}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cp_ssh_pass">SSH Password (if no key)</Label>
                <div className="relative">
                  <Input
                    id="cp_ssh_pass"
                    type={showPass.sshPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={cpSshPass}
                    onChange={(e) => setCpSshPass(e.target.value)}
                    className="pr-9"
                  />
                  <button type="button" onClick={() => setShowPass(p => ({ ...p, sshPass: !p.sshPass }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass.sshPass ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cp_admin_pass">Panel Admin Password</Label>
                <div className="relative">
                  <Input
                    id="cp_admin_pass"
                    type={showPass.adminPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={cpAdminPass}
                    onChange={(e) => setCpAdminPass(e.target.value)}
                    className="pr-9"
                  />
                  <button type="button" onClick={() => setShowPass(p => ({ ...p, adminPass: !p.adminPass }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass.adminPass ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {testResult && (
                <Alert className={testResult.ok ? "border-green-300 bg-green-50 dark:bg-green-950/30" : "border-destructive bg-destructive/5"}>
                  {testResult.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <AlertDescription className={`text-sm ${testResult.ok ? "text-green-700 dark:text-green-300" : "text-destructive"}`}>
                    {testResult.msg}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
