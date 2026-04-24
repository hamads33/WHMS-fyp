"use client";

import { useState, useEffect } from "react";
import {
  FileText, DollarSign, Hash, CreditCard, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminBillingAPI } from "@/lib/api/billing";

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

export default function InvoiceSettingsPanel() {
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
