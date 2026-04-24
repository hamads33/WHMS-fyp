"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign, Send, Trash2, CheckCircle2, Percent, CreditCard,
  Plus, Edit2, AlertCircle, Loader2, RefreshCw, Download,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminBillingAPI } from "@/lib/api/billing";

// ── Invoice Stats Card ─────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1.5 tabular-nums">{value ?? "—"}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Invoice Actions Dialog ─────────────────────────────────────────────────

function InvoiceActionsDialog({ invoiceId, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      switch (action) {
        case "send":
          await AdminBillingAPI.sendInvoice(invoiceId);
          break;
        case "mark-paid":
          await AdminBillingAPI.markInvoicePaid(invoiceId);
          break;
        case "cancel":
          await AdminBillingAPI.cancelInvoice(invoiceId);
          break;
        case "discount":
          await AdminBillingAPI.applyInvoiceDiscount(invoiceId, {
            type: formData.discountType || "amount",
            code: formData.discountCode || "",
            description: formData.discountDesc || "",
            amount: parseFloat(formData.discountAmount) || 0,
            isPercent: formData.discountType === "percent",
          });
          break;
        case "payment":
          await AdminBillingAPI.recordManualPayment(invoiceId, {
            amount: parseFloat(formData.paymentAmount) || 0,
            currency: formData.currency || "USD",
            gateway: formData.gateway || "manual",
            gatewayRef: formData.gatewayRef || "",
          });
          break;
        default:
          break;
      }
      onSuccess?.();
      setOpen(false);
      setAction(null);
      setFormData({});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs">Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setAction("send"); setOpen(true); }}>
            <Send className="h-3.5 w-3.5 mr-2" /> Send
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setAction("mark-paid"); setOpen(true); }}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Mark Paid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setAction("discount"); setOpen(true); }}>
            <Percent className="h-3.5 w-3.5 mr-2" /> Apply Discount
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setAction("payment"); setOpen(true); }}>
            <CreditCard className="h-3.5 w-3.5 mr-2" /> Record Payment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setAction("cancel"); setOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Cancel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
            window.open(`${base}/admin/billing/invoices/${invoiceId}/pdf`, '_blank')
          }}>
            <Download className="h-3.5 w-3.5 mr-2" /> Download PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "send" && "Send Invoice"}
            {action === "mark-paid" && "Mark as Paid"}
            {action === "discount" && "Apply Discount"}
            {action === "payment" && "Record Payment"}
            {action === "cancel" && "Cancel Invoice"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {action === "discount" && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={formData.discountType || "amount"}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="amount">Fixed Amount</option>
                <option value="percent">Percentage</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Amount / %</label>
              <Input
                type="number"
                value={formData.discountAmount || ""}
                onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Code</label>
              <Input
                value={formData.discountCode || ""}
                onChange={(e) => setFormData({ ...formData, discountCode: e.target.value })}
                placeholder="e.g., PROMO2024"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.discountDesc || ""}
                onChange={(e) => setFormData({ ...formData, discountDesc: e.target.value })}
                placeholder="Reason for discount..."
                className="text-sm"
              />
            </div>
          </div>
        )}

        {action === "payment" && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                value={formData.paymentAmount || ""}
                onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Input
                value={formData.currency || "USD"}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="USD"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Gateway</label>
              <select
                value={formData.gateway || "manual"}
                onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="manual">Manual</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Gateway Reference</label>
              <Input
                value={formData.gatewayRef || ""}
                onChange={(e) => setFormData({ ...formData, gatewayRef: e.target.value })}
                placeholder="e.g., transaction ID"
              />
            </div>
          </div>
        )}

        {(action === "send" || action === "mark-paid" || action === "cancel") && (
          <div className="rounded-lg border border-muted bg-muted/50 p-3">
            <p className="text-sm text-foreground">
              {action === "send" && "Invoice will be sent to the client."}
              {action === "mark-paid" && "Mark this invoice as paid."}
              {action === "cancel" && "This action cannot be undone."}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [tab, setTab] = useState("invoices");
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [batchLoading, setBatchLoading] = useState(null);
  const [batchResult, setBatchResult] = useState(null);

  const loadInvoices = useCallback(async () => {
    try {
      const data = await AdminBillingAPI.listInvoices(
        invoiceFilter !== "all" ? { status: invoiceFilter } : {}
      );
      setInvoices(data?.invoices ?? []);
    } catch (e) {
      console.error("Failed to load invoices:", e);
    }
  }, [invoiceFilter]);

  const loadPayments = useCallback(async () => {
    try {
      const data = await AdminBillingAPI.listPayments();
      setPayments(data?.payments ?? []);
    } catch (e) {
      console.error("Failed to load payments:", e);
    }
  }, []);

  const loadTaxRules = useCallback(async () => {
    try {
      const data = await AdminBillingAPI.listTaxRules();
      setTaxRules(data?.rules ?? []);
    } catch (e) {
      console.error("Failed to load tax rules:", e);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const [invoiceStats, paymentStats] = await Promise.all([
        AdminBillingAPI.getInvoiceStats(),
        AdminBillingAPI.getPaymentStats(),
      ]);
      setStats({ invoiceStats, paymentStats });
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadInvoices(), loadPayments(), loadTaxRules(), loadStats()])
      .finally(() => setLoading(false));
  }, [loadInvoices, loadPayments, loadTaxRules, loadStats]);

  useEffect(() => {
    loadInvoices();
  }, [invoiceFilter, loadInvoices]);

  async function handleProcessRenewals() {
    setBatchLoading("renewals");
    try {
      const result = await AdminBillingAPI.processRenewals();
      setBatchResult({ success: true, message: `Processed ${result.processed} renewal invoices`, type: "renewals" });
    } catch (e) {
      setBatchResult({ success: false, message: e.message, type: "renewals" });
    } finally {
      setBatchLoading(null);
    }
  }

  async function handleProcessOverdue() {
    setBatchLoading("overdue");
    try {
      const result = await AdminBillingAPI.processOverdue(false);
      setBatchResult({ success: true, message: `Processed ${result.markedOverdue} overdue invoices`, type: "overdue" });
    } catch (e) {
      setBatchResult({ success: false, message: e.message, type: "overdue" });
    } finally {
      setBatchLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & Invoicing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage invoices, payments, and tax rules</p>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tax">Tax Rules</TabsTrigger>
          <TabsTrigger value="batch">Batch Ops</TabsTrigger>
        </TabsList>

        {/* ── Invoices Tab ── */}
        <TabsContent value="invoices" className="space-y-4">
          {stats?.invoiceStats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Invoices"
                value={stats.invoiceStats.total}
                icon={DollarSign}
              />
              <StatsCard
                title="Pending"
                value={stats.invoiceStats.pending}
                icon={AlertCircle}
              />
              <StatsCard
                title="Paid"
                value={stats.invoiceStats.paid}
                icon={CheckCircle2}
              />
              <StatsCard
                title="Overdue"
                value={stats.invoiceStats.overdue}
                icon={AlertCircle}
              />
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2">
            {["all", "pending", "paid", "cancelled", "overdue"].map((s) => (
              <button
                key={s}
                onClick={() => setInvoiceFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                  invoiceFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {/* Invoices Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.id?.slice(-8)}</TableCell>
                        <TableCell className="text-sm">{inv.clientId || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{inv.currency} {parseFloat(inv.total || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <InvoiceActionsDialog invoiceId={inv.id} onSuccess={loadInvoices} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payments Tab ── */}
        <TabsContent value="payments" className="space-y-4">
          {stats?.paymentStats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatsCard
                title="Total Payments"
                value={Object.values(stats.paymentStats.byStatus || {}).reduce((s, v) => s + (v.count || 0), 0)}
                icon={CreditCard}
              />
              <StatsCard
                title="Success"
                value={stats.paymentStats.byStatus?.completed?.count ?? 0}
                icon={CheckCircle2}
              />
              <StatsCard
                title="Failed"
                value={stats.paymentStats.byStatus?.failed?.count ?? 0}
                icon={AlertCircle}
              />
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((pmt) => (
                      <TableRow key={pmt.id}>
                        <TableCell className="font-mono text-xs">{pmt.id?.slice(-8)}</TableCell>
                        <TableCell className="text-sm">{pmt.clientId || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{pmt.currency} {parseFloat(pmt.amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{pmt.gateway}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{pmt.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pmt.createdAt ? new Date(pmt.createdAt).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tax Rules Tab ── */}
        <TabsContent value="tax" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Tax Rule
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tax Rules</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No tax rules configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    taxRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="text-sm font-medium">{rule.name}</TableCell>
                        <TableCell className="text-sm">{(rule.rate * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rule.country || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rule.region || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rule.serviceType || "All"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{rule.active ? "Yes" : "No"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Batch Operations Tab ── */}
        <TabsContent value="batch" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Process Renewals</CardTitle>
                <CardDescription className="text-xs">Generate renewal invoices for upcoming renewals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {batchResult?.type === "renewals" && (
                  <div className={`rounded-lg border p-3 text-sm ${
                    batchResult.success
                      ? "border-accent bg-accent/10 text-accent-foreground"
                      : "border-destructive/50 bg-destructive/10 text-destructive"
                  }`}>
                    {batchResult.message}
                  </div>
                )}
                <Button
                  onClick={handleProcessRenewals}
                  disabled={batchLoading === "renewals"}
                  className="w-full"
                >
                  {batchLoading === "renewals" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Run Process
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Process Overdue</CardTitle>
                <CardDescription className="text-xs">Handle and notify overdue invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {batchResult?.type === "overdue" && (
                  <div className={`rounded-lg border p-3 text-sm ${
                    batchResult.success
                      ? "border-accent bg-accent/10 text-accent-foreground"
                      : "border-destructive/50 bg-destructive/10 text-destructive"
                  }`}>
                    {batchResult.message}
                  </div>
                )}
                <Button
                  onClick={handleProcessOverdue}
                  disabled={batchLoading === "overdue"}
                  className="w-full"
                >
                  {batchLoading === "overdue" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Run Process
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
