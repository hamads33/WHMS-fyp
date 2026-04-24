const router = require("express").Router();
const prisma = require("../../../prisma");

// ─── Date Helpers ────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthsAgo(n) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d;
}

function buildMonthBuckets(n = 12) {
  const buckets = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - i);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      count: 0,
      value: 0,
    });
  }
  return buckets;
}

function buildDayBuckets(n = 30) {
  const buckets = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      success: 0,
      failed: 0,
      total: 0,
    });
  }
  return buckets;
}

function groupIntoMonthBuckets(records, dateField, valueField = null) {
  const buckets = buildMonthBuckets(12);
  for (const r of records) {
    const d = new Date(r[dateField]);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === key);
    if (b) {
      b.count++;
      if (valueField) b.value += Number(r[valueField] ?? 0);
    }
  }
  return buckets;
}

function safe(n) {
  return isNaN(n) || !isFinite(n) ? 0 : n;
}

// ─── GET /api/admin/dashboard/stats (existing — keep for backward compat) ────

router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [clientRole, invoiceByStatus, orderStats, ticketStats, recentOrders, recentTickets, serviceCount, domainCount] =
      await Promise.allSettled([
        prisma.role.findUnique({ where: { name: "client" } }),
        prisma.invoice.groupBy({ by: ["status"], _count: { id: true } }),
        prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
        prisma.ticket.groupBy({ by: ["status"], _count: { id: true } }),
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            client: { select: { email: true, clientProfile: { select: { firstName: true, lastName: true, company: true } } } },
            snapshot: { select: { serviceName: true, planName: true } },
          },
        }),
        prisma.ticket.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { client: { select: { email: true } } },
        }),
        prisma.service.count({ where: { active: true } }),
        prisma.domain.count(),
      ]);

    const role = clientRole.status === "fulfilled" ? clientRole.value : null;
    let clientStats = { total: 0, active: 0 };
    if (role) {
      const [total, active] = await Promise.all([
        prisma.userRole.count({ where: { roleId: role.id } }),
        prisma.userRole.count({ where: { roleId: role.id, user: { disabled: false } } }),
      ]);
      clientStats = { total, active };
    }

    const [paidMonthly, paidYearly, paidAllTime] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, _count: { id: true }, where: { status: "paid", paidAt: { gte: startOfMonth } } }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, _count: { id: true }, where: { status: "paid", paidAt: { gte: startOfYear } } }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, _count: { id: true }, where: { status: "paid" } }),
    ]);

    const invByStatus = invoiceByStatus.status === "fulfilled" ? invoiceByStatus.value : [];
    const orderByStatus = orderStats.status === "fulfilled" ? orderStats.value : [];
    const ordersMap = orderByStatus.reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const ticketByStatus = ticketStats.status === "fulfilled" ? ticketStats.value : [];
    const ticketsMap = ticketByStatus.reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});

    const orders = (recentOrders.status === "fulfilled" ? recentOrders.value : []).map((o) => ({
      id: o.id, status: o.status, createdAt: o.createdAt,
      clientEmail: o.client?.email ?? "—",
      clientName: o.client?.clientProfile ? [o.client.clientProfile.firstName, o.client.clientProfile.lastName].filter(Boolean).join(" ") || o.client.clientProfile.company || o.client.email : o.client?.email ?? "—",
      serviceName: o.snapshot?.serviceName ?? "Service",
      planName: o.snapshot?.planName ?? null,
    }));

    const tickets = (recentTickets.status === "fulfilled" ? recentTickets.value : []).map((t) => ({
      id: t.id, subject: t.subject, status: t.status, priority: t.priority, createdAt: t.createdAt, clientEmail: t.client?.email ?? "—",
    }));

    return res.json({
      success: true,
      data: {
        clients: clientStats,
        revenue: {
          monthly: { amount: Number(paidMonthly._sum.totalAmount ?? 0), count: paidMonthly._count.id },
          yearly:  { amount: Number(paidYearly._sum.totalAmount ?? 0),  count: paidYearly._count.id },
          allTime: { amount: Number(paidAllTime._sum.totalAmount ?? 0), count: paidAllTime._count.id },
        },
        invoices: { pending: invByStatus.find((r) => r.status === "unpaid")?._count?.id ?? 0, overdue: invByStatus.find((r) => r.status === "overdue")?._count?.id ?? 0 },
        orders: { total: Object.values(ordersMap).reduce((a, b) => a + b, 0), active: (ordersMap["active"] || 0) + (ordersMap["pending"] || 0), byStatus: ordersMap },
        tickets: { open: (ticketsMap["open"] || 0) + (ticketsMap["waiting_for_staff"] || 0), total: Object.values(ticketsMap).reduce((a, b) => a + b, 0), byStatus: ticketsMap },
        services: serviceCount.status === "fulfilled" ? serviceCount.value : 0,
        domains: domainCount.status === "fulfilled" ? domainCount.value : 0,
        recentOrders: orders,
        recentTickets: tickets,
      },
    });
  } catch (err) {
    console.error("DASHBOARD STATS ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/dashboard/summary ────────────────────────────────────────
// Enhanced KPIs with sparkline arrays, server health, automation scores

router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = daysAgo(7);
    const thirtyDaysAgo = daysAgo(30);

    const [
      clientRole,
      paidMonthly,
      invoiceCounts,
      orderStats,
      ticketStats,
      serviceCount,
      domainCount,
      serverStats,
      backupStats,
      provJobStats,
      automationRunStats,
      workflowRunStats,
      // 7-day sparkline raw records
      recentUsers,
      recentInvoicesPaid,
      recentBackups,
      recentProvJobs,
    ] = await Promise.allSettled([
      prisma.role.findUnique({ where: { name: "client" } }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, _count: { id: true }, where: { status: "paid", paidAt: { gte: startOfMonth } } }),
      prisma.invoice.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.ticket.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.service.count({ where: { active: true } }),
      prisma.domain.count(),
      // Server health breakdown
      prisma.server.groupBy({ by: ["status"], _count: { id: true } }),
      // Backup stats (last 30 days)
      prisma.backup.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Provisioning job stats (last 30 days)
      prisma.provisioningJob.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Automation run stats (last 30 days)
      prisma.automationRun.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Workflow run stats (last 30 days)
      prisma.workflowRun.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Recent 7-day user registrations (for sparkline)
      prisma.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
      // Recent 7-day paid invoices (for revenue sparkline)
      prisma.invoice.findMany({ where: { status: "paid", paidAt: { gte: sevenDaysAgo } }, select: { paidAt: true, totalAmount: true } }),
      // Recent 7-day backups (for sparkline)
      prisma.backup.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true, status: true } }),
      // Recent 7-day prov jobs (for sparkline)
      prisma.provisioningJob.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true, status: true } }),
    ]);

    // ── Clients ───────────────────────────────────────────────
    const role = clientRole.status === "fulfilled" ? clientRole.value : null;
    let totalClients = 0;
    if (role) {
      totalClients = await prisma.userRole.count({ where: { roleId: role.id } }).catch(() => 0);
    }

    // ── Revenue ───────────────────────────────────────────────
    const monthlyRevenue = paidMonthly.status === "fulfilled" ? Number(paidMonthly.value._sum.totalAmount ?? 0) : 0;
    const monthlyInvoiceCount = paidMonthly.status === "fulfilled" ? paidMonthly.value._count.id : 0;

    // ── Invoice counts ────────────────────────────────────────
    const invMap = (invoiceCounts.status === "fulfilled" ? invoiceCounts.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const pendingInvoices = (invMap["unpaid"] || 0) + (invMap["draft"] || 0);
    const overdueInvoices = invMap["overdue"] || 0;

    // ── Orders ────────────────────────────────────────────────
    const ordMap = (orderStats.status === "fulfilled" ? orderStats.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const activeOrders = (ordMap["active"] || 0) + (ordMap["pending"] || 0);
    const totalOrders = Object.values(ordMap).reduce((a, b) => a + b, 0);

    // ── Tickets ───────────────────────────────────────────────
    const tktMap = (ticketStats.status === "fulfilled" ? ticketStats.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const openTickets = (tktMap["open"] || 0) + (tktMap["waiting_for_staff"] || 0);

    // ── Server Health ─────────────────────────────────────────
    const srvMap = (serverStats.status === "fulfilled" ? serverStats.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const totalServers = Object.values(srvMap).reduce((a, b) => a + b, 0);
    const healthyServers = srvMap["active"] || 0;
    const warnServers = srvMap["maintenance"] || srvMap["warning"] || 0;
    const critServers = srvMap["offline"] || srvMap["error"] || srvMap["inactive"] || 0;

    // ── Backup Rate ───────────────────────────────────────────
    const bkpMap = (backupStats.status === "fulfilled" ? backupStats.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const totalBackups = Object.values(bkpMap).reduce((a, b) => a + b, 0);
    const successBackups = bkpMap["success"] || 0;
    const backupSuccessRate = totalBackups > 0 ? safe(Math.round((successBackups / totalBackups) * 100)) : 100;

    // ── Provisioning Rate ─────────────────────────────────────
    const provMap = (provJobStats.status === "fulfilled" ? provJobStats.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const totalProv = Object.values(provMap).reduce((a, b) => a + b, 0);
    const successProv = provMap["success"] || provMap["completed"] || 0;
    const failedProv = provMap["failed"] || 0;
    const provSuccessRate = totalProv > 0 ? safe(Math.round((successProv / totalProv) * 100)) : 100;

    // ── Automation Rate ───────────────────────────────────────
    const autoMap = (automationRunStats.status === "fulfilled" ? automationRunStats.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const wfMap = (workflowRunStats.status === "fulfilled" ? workflowRunStats.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const totalAuto = Object.values(autoMap).reduce((a, b) => a + b, 0);
    const successAuto = autoMap["success"] || 0;
    const totalWf = Object.values(wfMap).reduce((a, b) => a + b, 0);
    const successWf = wfMap["success"] || wfMap["completed"] || 0;
    const cronSuccessRate = totalAuto > 0 ? safe(Math.round((successAuto / totalAuto) * 100)) : 100;

    // ── System Health Score (0–100) ───────────────────────────
    const serverScore = totalServers > 0 ? (healthyServers / totalServers) * 100 : 100;
    const backupScore = backupSuccessRate;
    const provScore = provSuccessRate;
    const cronScore = cronSuccessRate;
    const systemHealthScore = Math.round(safe((serverScore + backupScore + provScore + cronScore) / 4));

    // ── 7-day Sparklines ──────────────────────────────────────
    function make7DaySparkline() {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { key: d.toISOString().slice(0, 10), v: 0 };
      });
    }

    // Client sparkline
    const clientSparkRaw = make7DaySparkline();
    if (recentUsers.status === "fulfilled") {
      for (const u of recentUsers.value) {
        const k = new Date(u.createdAt).toISOString().slice(0, 10);
        const b = clientSparkRaw.find((x) => x.key === k);
        if (b) b.v++;
      }
    }

    // Revenue sparkline (daily)
    const revSparkRaw = make7DaySparkline();
    if (recentInvoicesPaid.status === "fulfilled") {
      for (const inv of recentInvoicesPaid.value) {
        const k = new Date(inv.paidAt).toISOString().slice(0, 10);
        const b = revSparkRaw.find((x) => x.key === k);
        if (b) b.v += Number(inv.totalAmount ?? 0);
      }
    }

    // Backup sparkline (success count per day)
    const bkpSparkRaw = make7DaySparkline();
    if (recentBackups.status === "fulfilled") {
      for (const bk of recentBackups.value) {
        if (bk.status === "success") {
          const k = new Date(bk.createdAt).toISOString().slice(0, 10);
          const b = bkpSparkRaw.find((x) => x.key === k);
          if (b) b.v++;
        }
      }
    }

    // Provisioning sparkline (success per day)
    const provSparkRaw = make7DaySparkline();
    if (recentProvJobs.status === "fulfilled") {
      for (const pj of recentProvJobs.value) {
        if (pj.status === "success" || pj.status === "completed") {
          const k = new Date(pj.createdAt).toISOString().slice(0, 10);
          const b = provSparkRaw.find((x) => x.key === k);
          if (b) b.v++;
        }
      }
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          totalClients,
          monthlyRevenue,
          monthlyInvoiceCount,
          activeOrders,
          totalOrders,
          openTickets,
          pendingInvoices,
          overdueInvoices,
          totalServers,
          totalServices: serviceCount.status === "fulfilled" ? serviceCount.value : 0,
          totalDomains: domainCount.status === "fulfilled" ? domainCount.value : 0,
          systemHealthScore,
          backupSuccessRate,
          provSuccessRate,
          cronSuccessRate,
          failedProvisioning: failedProv,
        },
        serverHealth: {
          healthy: healthyServers,
          warning: warnServers,
          critical: critServers,
          total: totalServers,
        },
        automationHealth: {
          cronSuccessRate,
          backupSuccessRate,
          provSuccessRate,
          workflowSuccessRate: totalWf > 0 ? safe(Math.round((successWf / totalWf) * 100)) : 100,
          totalCronRuns: totalAuto,
          totalWorkflowRuns: totalWf,
        },
        sparklines: {
          clients: clientSparkRaw.map((x) => x.v),
          revenue: revSparkRaw.map((x) => Math.round(x.v)),
          backups: bkpSparkRaw.map((x) => x.v),
          provisioning: provSparkRaw.map((x) => x.v),
        },
      },
    });
  } catch (err) {
    console.error("DASHBOARD SUMMARY ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/dashboard/charts ─────────────────────────────────────────
// All chart data: revenue 12mo, clients 12mo, backups 30d, automation 30d

router.get("/charts", async (req, res) => {
  try {
    const twelveMonthsAgo = monthsAgo(12);
    const thirtyDaysAgo = daysAgo(30);

    const [paidInvoices, newUsers, clientRole, backups30d, automationRuns30d, workflowRuns30d] = await Promise.allSettled([
      prisma.invoice.findMany({
        where: { status: "paid", paidAt: { gte: twelveMonthsAgo } },
        select: { paidAt: true, totalAmount: true },
        orderBy: { paidAt: "asc" },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.role.findUnique({ where: { name: "client" } }),
      prisma.backup.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.automationRun.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.workflowRun.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // ── Revenue by month ─────────────────────────────────────
    const revBuckets = buildMonthBuckets(12);
    if (paidInvoices.status === "fulfilled") {
      for (const inv of paidInvoices.value) {
        const d = new Date(inv.paidAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = revBuckets.find((x) => x.key === key);
        if (b) { b.value += Number(inv.totalAmount ?? 0); b.count++; }
      }
    }
    const revenueChart = revBuckets.map((b) => ({ month: b.label, revenue: Math.round(b.value * 100) / 100, invoices: b.count }));

    // ── Client growth by month ────────────────────────────────
    const clientBuckets = buildMonthBuckets(12);
    if (newUsers.status === "fulfilled") {
      for (const u of newUsers.value) {
        const d = new Date(u.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = clientBuckets.find((x) => x.key === key);
        if (b) b.count++;
      }
    }
    // Cumulative total (running sum)
    let running = 0;
    if (clientRole.status === "fulfilled" && clientRole.value) {
      // Get total clients before the chart window to start cumulative count properly
      const beforeCount = await prisma.userRole.count({
        where: { roleId: clientRole.value.id, user: { createdAt: { lt: monthsAgo(12) } } },
      }).catch(() => 0);
      running = beforeCount;
    }
    const clientChart = clientBuckets.map((b) => {
      running += b.count;
      return { month: b.label, new: b.count, total: running };
    });

    // ── Backup trend (30 days, success vs failed) ─────────────
    const bkpBuckets = buildDayBuckets(30);
    if (backups30d.status === "fulfilled") {
      for (const bk of backups30d.value) {
        const key = new Date(bk.createdAt).toISOString().slice(0, 10);
        const b = bkpBuckets.find((x) => x.key === key);
        if (b) {
          b.total++;
          if (bk.status === "success") b.success++;
          else if (bk.status === "failed") b.failed++;
        }
      }
    }
    const backupChart = bkpBuckets.map((b) => ({ day: b.label, success: b.success, failed: b.failed, total: b.total }));

    // ── Automation trend (30 days) ────────────────────────────
    const autoBuckets = buildDayBuckets(30);
    if (automationRuns30d.status === "fulfilled") {
      for (const r of automationRuns30d.value) {
        const key = new Date(r.createdAt).toISOString().slice(0, 10);
        const b = autoBuckets.find((x) => x.key === key);
        if (b) {
          b.total++;
          if (r.status === "success") b.success++;
          else if (r.status === "failed") b.failed++;
        }
      }
    }
    if (workflowRuns30d.status === "fulfilled") {
      for (const r of workflowRuns30d.value) {
        const key = new Date(r.createdAt).toISOString().slice(0, 10);
        const b = autoBuckets.find((x) => x.key === key);
        if (b) {
          b.total++;
          if (r.status === "success" || r.status === "completed") b.success++;
          else if (r.status === "failed") b.failed++;
        }
      }
    }
    const automationChart = autoBuckets.map((b) => ({ day: b.label, success: b.success, failed: b.failed }));

    return res.json({
      success: true,
      data: { revenueChart, clientChart, backupChart, automationChart },
    });
  } catch (err) {
    console.error("DASHBOARD CHARTS ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/dashboard/server-insights ────────────────────────────────
// Server list with latest metrics, account counts, error counts

router.get("/server-insights", async (req, res) => {
  try {
    const [servers, accountCounts, serverLogs] = await Promise.allSettled([
      prisma.server.findMany({
        select: {
          id: true, name: true, hostname: true, ipAddress: true,
          type: true, status: true, createdAt: true,
          metricsHistory: {
            take: 1, orderBy: { recordedAt: "desc" },
            select: { cpuUsage: true, ramUsage: true, diskUsage: true, latency: true, uptime: true, recordedAt: true },
          },
          _count: { select: { accounts: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.serverManagedAccount.groupBy({ by: ["serverId"], _count: { id: true } }),
      prisma.serverLog.groupBy({
        by: ["serverId"],
        where: { createdAt: { gte: daysAgo(7) }, action: { contains: "error", mode: "insensitive" } },
        _count: { id: true },
      }),
    ]);

    const accMap = (accountCounts.status === "fulfilled" ? accountCounts.value : []).reduce((a, c) => { a[c.serverId] = c._count.id; return a; }, {});
    const errMap = (serverLogs.status === "fulfilled" ? serverLogs.value : []).reduce((a, c) => { a[c.serverId] = c._count.id; return a; }, {});

    const serverList = (servers.status === "fulfilled" ? servers.value : []).map((s) => {
      const metric = s.metricsHistory?.[0] ?? null;
      const cpuUsage = metric?.cpuUsage ?? null;
      const ramUsage = metric?.ramUsage ?? null;
      const diskUsage = metric?.diskUsage ?? null;
      const latency = metric?.latency ?? null;
      const uptimePct = metric?.uptime ?? null;

      // Derive health class
      let health = "healthy";
      if (s.status !== "active") health = "critical";
      else if (cpuUsage > 85 || ramUsage > 85 || diskUsage > 90) health = "critical";
      else if (cpuUsage > 65 || ramUsage > 65 || diskUsage > 75) health = "warning";

      return {
        id: s.id,
        name: s.name,
        hostname: s.hostname,
        ipAddress: s.ipAddress,
        type: s.type,
        status: s.status,
        health,
        cpuUsage,
        ramUsage,
        diskUsage,
        latency,
        uptimePct,
        accountCount: accMap[s.id] ?? s._count.accounts ?? 0,
        errorCount: errMap[s.id] ?? 0,
        lastMetricAt: metric?.recordedAt ?? null,
      };
    });

    return res.json({ success: true, data: { servers: serverList } });
  } catch (err) {
    console.error("SERVER INSIGHTS ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/dashboard/automation-health ───────────────────────────────

router.get("/automation-health", async (req, res) => {
  try {
    const thirtyDaysAgo = daysAgo(30);

    const [profiles, autoRuns, wfRuns, provJobs] = await Promise.allSettled([
      prisma.automationProfile.findMany({ select: { id: true, name: true, enabled: true, cron: true } }),
      prisma.automationRun.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.workflowRun.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.provisioningJob.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const autoMap = (autoRuns.status === "fulfilled" ? autoRuns.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const wfMap = (wfRuns.status === "fulfilled" ? wfRuns.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});
    const provMap = (provJobs.status === "fulfilled" ? provJobs.value : []).reduce((a, c) => { a[c.status] = c._count.id; return a; }, {});

    const totalAuto = Object.values(autoMap).reduce((a, b) => a + b, 0);
    const successAuto = autoMap["success"] || 0;
    const failedAuto = autoMap["failed"] || 0;

    const totalWf = Object.values(wfMap).reduce((a, b) => a + b, 0);
    const successWf = wfMap["success"] || wfMap["completed"] || 0;
    const failedWf = wfMap["failed"] || 0;

    const totalProv = Object.values(provMap).reduce((a, b) => a + b, 0);
    const successProv = provMap["success"] || provMap["completed"] || 0;
    const failedProv = provMap["failed"] || 0;

    const cronRate = totalAuto > 0 ? safe(Math.round((successAuto / totalAuto) * 100)) : 100;
    const wfRate = totalWf > 0 ? safe(Math.round((successWf / totalWf) * 100)) : 100;
    const provRate = totalProv > 0 ? safe(Math.round((successProv / totalProv) * 100)) : 100;
    const overallScore = Math.round(safe((cronRate + wfRate + provRate) / 3));

    const profileList = profiles.status === "fulfilled" ? profiles.value : [];

    return res.json({
      success: true,
      data: {
        overallScore,
        cronRate,
        wfRate,
        provRate,
        totals: { cron: totalAuto, successCron: successAuto, failedCron: failedAuto, wf: totalWf, successWf, failedWf, prov: totalProv, successProv, failedProv },
        profiles: profileList.map((p) => ({ id: p.id, name: p.name, enabled: p.enabled, cron: p.cron })),
      },
    });
  } catch (err) {
    console.error("AUTOMATION HEALTH ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/admin/dashboard/activity ───────────────────────────────────────
// Enriched activity feed from AuditLog

router.get("/activity", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? "20"), 50);
    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, source: true, actor: true, level: true, entity: true, entityId: true, createdAt: true, ip: true },
    });

    const feed = logs.map((log) => {
      const a = log.action?.toLowerCase() ?? "";
      let severity = "info";
      let category = "system";
      if (a.includes("delete") || a.includes("fail") || a.includes("error") || a.includes("ban") || a.includes("suspend")) severity = "danger";
      else if (a.includes("warn") || a.includes("overdue") || a.includes("retry")) severity = "warning";
      else if (a.includes("create") || a.includes("register") || a.includes("success") || a.includes("activate") || a.includes("paid")) severity = "success";
      else if (a.includes("login") || a.includes("auth") || a.includes("impersonat")) severity = "auth";

      if (a.includes("backup")) category = "backup";
      else if (a.includes("server") || a.includes("provision")) category = "infrastructure";
      else if (a.includes("invoice") || a.includes("payment") || a.includes("billing")) category = "billing";
      else if (a.includes("ticket") || a.includes("support")) category = "support";
      else if (a.includes("plugin")) category = "plugin";
      else if (a.includes("workflow") || a.includes("automation") || a.includes("cron")) category = "automation";
      else if (a.includes("user") || a.includes("client") || a.includes("login") || a.includes("auth")) category = "auth";

      return { id: log.id, action: log.action, source: log.source, actor: log.actor, level: log.level ?? "INFO", entity: log.entity, entityId: log.entityId, createdAt: log.createdAt, ip: log.ip, severity, category };
    });

    return res.json({ success: true, data: feed });
  } catch (err) {
    console.error("DASHBOARD ACTIVITY ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
