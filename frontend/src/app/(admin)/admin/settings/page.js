"use client";

import { useState, useEffect } from "react";
import { Mail, Globe, Webhook, HardDrive, Zap, Percent, FileText, Puzzle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AuthAPI } from "@/lib/api/auth";
import { useAuth } from "@/lib/context/AuthContext";
import MarketplaceAPI from "@/lib/api/marketplace";

// Import all panel components
import SecurityPanel, { DisableMFADialog, BackupCodesPanel } from "@/components/admin/settings/SecurityPanel";
import ApiKeysPanel from "@/components/admin/settings/ApiKeysPanel";
import AppearancePanel from "@/components/admin/settings/AppearancePanel";
import EmailSettingsPanel from "@/components/admin/settings/EmailSettingsPanel";
import BillingTaxPanel from "@/components/admin/settings/BillingTaxPanel";
import InvoiceSettingsPanel from "@/components/admin/settings/InvoiceSettingsPanel";
import NotificationsPanel from "@/components/admin/settings/NotificationsPanel";
import WebhooksPanel from "@/components/admin/settings/WebhooksPanel";
import StoragePathsPanel from "@/components/admin/settings/StoragePathsPanel";
import DomainRegistrarPanel from "@/components/admin/settings/DomainRegistrarPanel";
import ProvisioningPanel from "@/components/admin/settings/ProvisioningPanel";
import PluginConfigPanel from "@/components/admin/settings/PluginConfigPanel";

export default function AdminSettingsPage() {
  const { user, loadSession } = useAuth();
  const { toast } = useToast();

  const [mfaEnabled, setMfaEnabled] = useState(null);
  const [showDisable, setShowDisable] = useState(false);
  const [pluginTabs, setPluginTabs] = useState([]);

  useEffect(() => {
    AuthAPI.me()
      .then(data => setMfaEnabled(Boolean(data?.user?.mfaEnabled)))
      .catch(() => setMfaEnabled(false));
  }, []);

  useEffect(() => {
    MarketplaceAPI.getPluginUiManifest()
      .then(res => {
        const entries = (res?.data ?? []).filter(
          e => e.configSchema?.length > 0 || e.settingsTabs?.length > 0
        );
        setPluginTabs(entries);
      })
      .catch(() => {});
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
          {pluginTabs.map(p => (
            <TabsTrigger key={`plugin-${p.plugin}`} value={`plugin-${p.plugin}`} className="gap-1.5">
              <Puzzle className="h-3.5 w-3.5" />
              {p.displayName}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and basic settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-semibold">{user?.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role(s)</p>
                <p className="text-sm font-semibold">{user?.roles?.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="text-sm font-mono text-muted-foreground text-xs">{user?.id || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          {mfaEnabled !== null && (
            <SecurityPanel
              mfaEnabled={mfaEnabled}
              onMFAEnabled={handleMFAEnabled}
              showDisableMFA={showDisable}
              onShowDisableMFA={setShowDisable}
              onMFADisabled={handleMFADisabled}
            />
          )}
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="apikeys" className="space-y-4">
          <ApiKeysPanel />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <AppearancePanel />
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <EmailSettingsPanel />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationsPanel />
        </TabsContent>

        {/* Billing & Tax Tab */}
        <TabsContent value="billing" className="space-y-4">
          <BillingTaxPanel />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <InvoiceSettingsPanel />
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          <DomainRegistrarPanel />
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <WebhooksPanel />
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <StoragePathsPanel />
        </TabsContent>

        {/* Provisioning Tab */}
        <TabsContent value="provisioning" className="space-y-4">
          <ProvisioningPanel />
        </TabsContent>

        {/* Dynamic plugin settings tabs */}
        {pluginTabs.map(p => (
          <TabsContent key={`plugin-${p.plugin}`} value={`plugin-${p.plugin}`} className="space-y-4">
            {p.configSchema?.length > 0 && (
              <PluginConfigPanel
                pluginName={p.plugin}
                displayName={p.displayName}
                configSchema={p.configSchema}
              />
            )}
            {p.settingsTabs?.map(tab => (
              <div key={tab.id} className="w-full overflow-hidden rounded-lg border bg-card" style={{ height: "60vh" }}>
                <iframe
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ?? "http://localhost:4000"}/api/plugins/${encodeURIComponent(p.plugin)}/ui/${encodeURIComponent(tab.id)}`}
                  title={`${p.displayName} — ${tab.label}`}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Disable MFA Dialog - rendered outside tabs */}
      {mfaEnabled !== null && (
        <DisableMFADialog
          open={showDisable}
          onClose={() => setShowDisable(false)}
          onDisabled={handleMFADisabled}
        />
      )}
    </div>
  );
}
