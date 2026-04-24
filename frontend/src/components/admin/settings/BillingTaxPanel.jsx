"use client";

import { useState, useEffect } from "react";
import {
  Percent, Globe, MapPin, Tag, Pencil, Trash2, Loader2, Plus, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AdminBillingAPI } from "@/lib/api/billing";

const TAX_TYPES = ["VAT", "GST", "Sales Tax", "Service Tax", "Custom"];

function RequiredMark() {
  return <span className="text-destructive ml-0.5" aria-hidden="true">*</span>;
}

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
            <Label>Tax Rate (%) <RequiredMark /></Label>
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

export default function BillingTaxPanel() {
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
