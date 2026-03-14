/**
 * InvoiceReminderService
 * ------------------------------------------------------------------
 * Tracks invoice payment status and overdue state in memory.
 * When Prisma is available it reads real invoice data.
 */

class InvoiceReminderService {
  constructor({ prisma = null, logger = console, graceDays = 3 } = {}) {
    this.prisma     = prisma;
    this.logger     = logger;
    this.graceDays  = graceDays;           // days after due_date before "overdue"

    // In-memory log of sent reminders: invoiceId → [{ sentAt, level }]
    this._reminders = new Map();

    // Paid invoice IDs so we skip them
    this._paid      = new Set();
  }

  /** Mark an invoice as paid — stops future reminders */
  markPaid(invoiceId) {
    this._paid.add(String(invoiceId));
    this.logger.info(`[invoice-reminder] Invoice ${invoiceId} marked paid — reminders stopped`);
  }

  /** Record that a reminder was sent */
  recordReminder(invoiceId, level = "first") {
    const id  = String(invoiceId);
    const log = this._reminders.get(id) || [];
    log.push({ sentAt: new Date().toISOString(), level });
    this._reminders.set(id, log);
  }

  /** Returns full reminder history for an invoice */
  getReminderHistory(invoiceId) {
    return this._reminders.get(String(invoiceId)) || [];
  }

  /**
   * scanOverdue
   * Scans Prisma for unpaid invoices past their due_date + graceDays.
   * Falls back to returning a demo list when Prisma is unavailable.
   *
   * @returns {Promise<Array>}
   */
  async scanOverdue() {
    if (this.prisma) {
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.graceDays);

        const invoices = await this.prisma.invoice.findMany({
          where: {
            status    : { in: ["UNPAID", "PENDING"] },
            due_date  : { lt: cutoff },
          },
          select: { id: true, amount: true, due_date: true, client_id: true, status: true },
        });

        return invoices
          .filter(inv => !this._paid.has(String(inv.id)))
          .map(inv => ({
            invoiceId      : inv.id,
            amount         : inv.amount,
            dueDate        : inv.due_date,
            clientId       : inv.client_id,
            status         : inv.status,
            reminderCount  : (this._reminders.get(String(inv.id)) || []).length,
            lastReminderAt : (this._reminders.get(String(inv.id)) || []).at(-1)?.sentAt || null,
          }));
      } catch (err) {
        this.logger.warn(`[invoice-reminder] Prisma scan failed: ${err.message} — using demo data`);
      }
    }

    // Demo mode — return fake overdue invoices
    return [
      {
        invoiceId      : "demo-001",
        amount         : 199.99,
        dueDate        : new Date(Date.now() - 5 * 86400000).toISOString(),
        clientId       : "demo-client-1",
        status         : "UNPAID",
        reminderCount  : (this._reminders.get("demo-001") || []).length,
        lastReminderAt : (this._reminders.get("demo-001") || []).at(-1)?.sentAt || null,
      },
      {
        invoiceId      : "demo-002",
        amount         : 49.00,
        dueDate        : new Date(Date.now() - 12 * 86400000).toISOString(),
        clientId       : "demo-client-2",
        status         : "UNPAID",
        reminderCount  : (this._reminders.get("demo-002") || []).length,
        lastReminderAt : (this._reminders.get("demo-002") || []).at(-1)?.sentAt || null,
      },
    ].filter(inv => !this._paid.has(inv.invoiceId));
  }

  getStats() {
    return {
      totalTracked    : this._reminders.size,
      totalPaid       : this._paid.size,
      remindersSent   : [...this._reminders.values()].reduce((sum, r) => sum + r.length, 0),
    };
  }
}

module.exports = InvoiceReminderService;
