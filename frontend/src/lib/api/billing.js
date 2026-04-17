// lib/api/billing.js
import { apiFetch } from "./client";

// ─────────────────────────────────────────────────────────────
// ADMIN — Billing & Invoicing
// ─────────────────────────────────────────────────────────────

export const AdminBillingAPI = {

  // ── Dashboard Stats ──────────────────────────────────────────

  async getRevenue() {
    return apiFetch("/admin/billing/revenue");
  },

  async getInvoiceStats() {
    return apiFetch("/admin/billing/invoices/stats");
  },

  async getPaymentStats() {
    return apiFetch("/admin/billing/payments/stats");
  },

  async getRevenueTrend(months = 6) {
    return apiFetch(`/admin/billing/revenue/trend?months=${months}`);
  },

  // ── Invoices ─────────────────────────────────────────────────

  async listInvoices(params = {}) {
    // params: { status, clientId, orderId, limit, offset }
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/admin/billing/invoices${query ? `?${query}` : ""}`);
  },

  async getOrderInvoices(orderId) {
    return apiFetch(`/admin/billing/orders/${orderId}/invoices`);
  },

  async getInvoice(invoiceId) {
    return apiFetch(`/admin/billing/invoices/${invoiceId}`);
  },

  async sendInvoice(invoiceId) {
    return apiFetch(`/admin/billing/invoices/${invoiceId}/send`, { method: "POST" });
  },

  async cancelInvoice(invoiceId) {
    return apiFetch(`/admin/billing/invoices/${invoiceId}/cancel`, { method: "POST" });
  },

  async markInvoicePaid(invoiceId) {
    return apiFetch(`/admin/billing/invoices/${invoiceId}/mark-paid`, { method: "POST" });
  },

  async applyInvoiceDiscount(invoiceId, data) {
    // data: { type, code, description, amount, isPercent }
    return apiFetch(`/admin/billing/invoices/${invoiceId}/discount`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listInvoicePayments(invoiceId) {
    return apiFetch(`/admin/billing/invoices/${invoiceId}/payments`);
  },

  async recordManualPayment(invoiceId, data) {
    // data: { amount, currency, gateway, gatewayRef }
    return apiFetch(`/admin/billing/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ── Invoice Generation ───────────────────────────────────────

  async generateOrderInvoice(orderId, data) {
    // data: { billingCycles, dueDays, status }
    return apiFetch(`/admin/billing/orders/${orderId}/invoice`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async generateRenewalInvoice(orderId, data) {
    // data: { dueDays, status }
    return apiFetch(`/admin/billing/orders/${orderId}/renewal-invoice`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async generateSuspensionInvoice(orderId, reason) {
    return apiFetch(`/admin/billing/orders/${orderId}/suspension-invoice`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async generateTerminationInvoice(orderId, reason) {
    return apiFetch(`/admin/billing/orders/${orderId}/termination-invoice`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async createManualInvoice(data) {
    // data: { clientId, currency, lineItems[], discounts[], dueDays, notes, status }
    return apiFetch("/admin/billing/invoices/manual", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ── Payments ─────────────────────────────────────────────────

  async listPayments(params = {}) {
    // params: { status, gateway, clientId, limit, offset }
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/admin/billing/payments${query ? `?${query}` : ""}`);
  },

  async getPayment(paymentId) {
    return apiFetch(`/admin/billing/payments/${paymentId}`);
  },

  // ── Refunds ──────────────────────────────────────────────────

  async processRefund(paymentId, data) {
    // data: { amount, reason, notes }
    return apiFetch(`/admin/billing/payments/${paymentId}/refund`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listRefunds(paymentId) {
    return apiFetch(`/admin/billing/payments/${paymentId}/refunds`);
  },

  // ── Tax Rules ────────────────────────────────────────────────

  async listTaxRules(activeOnly = false) {
    return apiFetch(`/admin/billing/tax-rules${activeOnly ? "?activeOnly=true" : ""}`);
  },

  async createTaxRule(data) {
    // data: { name, rate, country, region, serviceType }
    return apiFetch("/admin/billing/tax-rules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async previewTax(data) {
    // data: { clientId, subtotal, serviceType }
    return apiFetch("/admin/billing/tax-rules/preview", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getTaxRule(taxRuleId) {
    return apiFetch(`/admin/billing/tax-rules/${taxRuleId}`);
  },

  async updateTaxRule(taxRuleId, data) {
    // data: { rate, country, region, serviceType, active }
    return apiFetch(`/admin/billing/tax-rules/${taxRuleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteTaxRule(taxRuleId) {
    return apiFetch(`/admin/billing/tax-rules/${taxRuleId}`, { method: "DELETE" });
  },

  // ── Client Billing (Admin View) ──────────────────────────────

  async getClientBillingProfile(clientId) {
    return apiFetch(`/admin/billing/clients/${clientId}/profile`);
  },

  async updateClientBillingProfile(clientId, data) {
    return apiFetch(`/admin/billing/clients/${clientId}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getClientBillingSummary(clientId) {
    return apiFetch(`/admin/billing/clients/${clientId}/summary`);
  },

  async listClientInvoices(clientId, params = {}) {
    // params: { status, limit, offset }
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/admin/billing/clients/${clientId}/invoices${query ? `?${query}` : ""}`);
  },

  // ── Invoice Settings ─────────────────────────────────────────

  async getInvoiceSettings() {
    return apiFetch("/admin/billing/settings/invoice");
  },

  async updateInvoiceSettings(data) {
    return apiFetch("/admin/billing/settings/invoice", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // ── Storage Path Settings ────────────────────────────────────

  async getStoragePaths() {
    return apiFetch("/admin/settings/storage-paths");
  },

  async updateStoragePaths(data) {
    return apiFetch("/admin/settings/storage-paths", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // ── Batch Operations ─────────────────────────────────────────

  async processRenewals(daysAhead) {
    const body = daysAhead !== undefined ? { daysAhead } : {};
    return apiFetch("/admin/billing/process-renewals", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async processOverdue(autoSuspend = false) {
    return apiFetch("/admin/billing/process-overdue", {
      method: "POST",
      body: JSON.stringify({ autoSuspend }),
    });
  },
};

// ─────────────────────────────────────────────────────────────
// CLIENT — Billing
// ─────────────────────────────────────────────────────────────

export const ClientBillingAPI = {

  async getProfile() {
    return apiFetch("/client/billing/profile");
  },

  async updateProfile(data) {
    // data: { currency, billingAddress, city, country, postalCode, taxId }
    return apiFetch("/client/billing/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getSummary() {
    return apiFetch("/client/billing/summary");
  },

  async listInvoices(params = {}) {
    // params: { status, limit, offset }
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/client/billing/invoices${query ? `?${query}` : ""}`);
  },

  async getInvoice(invoiceId) {
    return apiFetch(`/client/billing/invoices/${invoiceId}`);
  },

  async payInvoice(invoiceId, gateway) {
    // gateway: "stripe" | "paypal"
    return apiFetch(`/client/billing/invoices/${invoiceId}/pay`, {
      method: "POST",
      body: JSON.stringify({ gateway }),
    });
  },

  async listPayments(params = {}) {
    // params: { status, limit, offset }
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/client/billing/payments${query ? `?${query}` : ""}`);
  },
};
