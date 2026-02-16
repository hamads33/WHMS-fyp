/**
 * Billing Reporting Service
 * Path: src/modules/billing/services/billing-report.service.js
 * FR-15: Billing summaries, payment histories, outstanding balances, revenue metrics
 */

const prisma = require("../../../../prisma");

class BillingReportService {
  /**
   * Revenue summary (total collected, outstanding, overdue)
   */
  async getRevenueSummary(options = {}) {
    const { from, to } = options;
    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const whereDate = Object.keys(dateFilter).length
      ? { createdAt: dateFilter }
      : {};

    const [invoiceStats, paymentStats] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        _sum: { totalAmount: true, amountPaid: true, amountDue: true },
        _count: { id: true },
        where: whereDate,
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "completed", ...whereDate },
      }),
    ]);

    const summary = invoiceStats.reduce((acc, row) => {
      acc[row.status] = {
        count: row._count.id,
        totalAmount: parseFloat(row._sum.totalAmount || 0),
        amountPaid: parseFloat(row._sum.amountPaid || 0),
        amountDue: parseFloat(row._sum.amountDue || 0),
      };
      return acc;
    }, {});

    return {
      byStatus: summary,
      totalCollected: parseFloat(paymentStats._sum.amount || 0),
      period: { from: from || null, to: to || null },
    };
  }

  /**
   * Client billing summary
   */
  async getClientSummary(clientId) {
    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { clientId },
        select: {
          status: true,
          totalAmount: true,
          amountPaid: true,
          amountDue: true,
          currency: true,
          createdAt: true,
        },
      }),
      prisma.payment.findMany({
        where: { clientId, status: "completed" },
        select: { amount: true, currency: true, paidAt: true },
      }),
    ]);

    const totalBilled = invoices.reduce(
      (s, i) => s + parseFloat(i.totalAmount),
      0
    );
    const totalPaid = invoices.reduce(
      (s, i) => s + parseFloat(i.amountPaid),
      0
    );
    const totalOutstanding = invoices.reduce(
      (s, i) =>
        ["unpaid", "overdue"].includes(i.status)
          ? s + parseFloat(i.amountDue)
          : s,
      0
    );

    return {
      clientId,
      totalInvoices: invoices.length,
      totalBilled: totalBilled.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalOutstanding: totalOutstanding.toFixed(2),
      invoicesByStatus: invoices.reduce((acc, i) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
      }, {}),
      recentPayments: payments.slice(0, 5),
    };
  }

  /**
   * Outstanding balances list
   */
  async getOutstandingBalances(options = {}) {
    const { limit = 100, offset = 0 } = options;
    return prisma.invoice.findMany({
      where: { status: { in: ["unpaid", "overdue"] } },
      include: { client: { select: { id: true, email: true } } },
      orderBy: { dueDate: "asc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Payment history (admin - all clients or single client)
   */
  async getPaymentHistory(options = {}) {
    const { clientId, limit = 100, offset = 0, from, to } = options;

    const where = { status: "completed" };
    if (clientId) where.clientId = clientId;
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = new Date(from);
      if (to) where.paidAt.lte = new Date(to);
    }

    return prisma.payment.findMany({
      where,
      include: {
        invoice: { select: { invoiceNumber: true, status: true } },
        client: { select: { id: true, email: true } },
      },
      orderBy: { paidAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Revenue by month (for dashboard charts)
   */
  async getMonthlyRevenue(year = new Date().getFullYear()) {
    const from = new Date(`${year}-01-01`);
    const to = new Date(`${year}-12-31`);

    const payments = await prisma.payment.findMany({
      where: {
        status: "completed",
        paidAt: { gte: from, lte: to },
      },
      select: { amount: true, paidAt: true, currency: true },
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 0,
      count: 0,
    }));

    for (const p of payments) {
      const month = new Date(p.paidAt).getMonth(); // 0-indexed
      monthly[month].revenue += parseFloat(p.amount);
      monthly[month].count++;
    }

    return monthly.map((m) => ({
      ...m,
      revenue: m.revenue.toFixed(2),
    }));
  }

  /**
   * Audit trail for billing (FR-10)
   */
  async getTransactionLog(options = {}) {
    const { clientId, invoiceId, limit = 100, offset = 0 } = options;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (invoiceId) where.invoiceId = invoiceId;

    return prisma.billingTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }
}

module.exports = new BillingReportService();