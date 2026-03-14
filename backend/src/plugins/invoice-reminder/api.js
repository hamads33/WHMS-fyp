const { Router } = require("express");

module.exports = function buildRouter({ service, logger }) {
  const router = Router();

  /** GET /api/plugins/invoice-reminder/overdue  — list overdue invoices */
  router.get("/overdue", async (req, res) => {
    try {
      const overdue = await service.scanOverdue();
      res.json({ success: true, count: overdue.length, data: overdue });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /** GET /api/plugins/invoice-reminder/stats */
  router.get("/stats", (req, res) => {
    res.json({ success: true, data: service.getStats() });
  });

  /** GET /api/plugins/invoice-reminder/history/:invoiceId */
  router.get("/history/:invoiceId", (req, res) => {
    const history = service.getReminderHistory(req.params.invoiceId);
    res.json({ success: true, invoiceId: req.params.invoiceId, data: history });
  });

  /** POST /api/plugins/invoice-reminder/mark-paid/:invoiceId */
  router.post("/mark-paid/:invoiceId", (req, res) => {
    service.markPaid(req.params.invoiceId);
    res.json({ success: true, message: `Invoice ${req.params.invoiceId} marked as paid` });
  });

  /** GET /api/plugins/invoice-reminder/ui-data/overdue — standardised JSON for frontend renderer */
  router.get("/ui-data/overdue", async (_req, res) => {
    let overdue = [];
    try { overdue = await service.scanOverdue(); } catch (_) {}
    const stats = service.getStats();
    return res.json({
      title: "Overdue Invoices",
      stats: [
        { label: "Overdue Invoices",  value: overdue.length,           color: "red"   },
        { label: "Reminders Sent",    value: stats.totalReminders ?? 0, color: "blue"  },
        { label: "Grace Days",        value: stats.graceDays ?? 3,      color: "amber" },
      ],
      sections: [
        {
          title  : "Overdue Invoices",
          type   : "table",
          empty  : "No overdue invoices — all payments are up to date.",
          columns: ["Invoice ID", "Client", "Amount", "Days Overdue"],
          rows   : overdue.map(inv => [
            inv.id        ?? "–",
            inv.clientEmail ?? inv.client ?? "–",
            `$${(inv.amount ?? 0).toFixed(2)}`,
            `${inv.daysOverdue ?? "–"} days`,
          ]),
        },
      ],
    });
  });

  /** GET /api/plugins/invoice-reminder/ui/overdue — legacy HTML (kept as fallback) */
  router.get("/ui/overdue", async (_req, res) => {
    let overdue = [];
    try { overdue = await service.scanOverdue(); } catch (_) {}
    const stats = service.getStats();

    const rows = overdue.map(inv => `
      <tr>
        <td>${inv.id ?? "–"}</td>
        <td>${inv.clientEmail ?? inv.client ?? "–"}</td>
        <td>$${(inv.amount ?? 0).toFixed(2)}</td>
        <td>${inv.daysOverdue ?? "–"} days</td>
        <td><span class="badge badge-red">Overdue</span></td>
      </tr>`).join("");

    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Invoice Reminder</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;background:#0f0f11;color:#e2e2e7;padding:20px}
  h1{font-size:17px;font-weight:600;margin-bottom:4px}
  .sub{color:#888;font-size:12px;margin-bottom:20px}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
  .card{background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;padding:14px}
  .card .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em}
  .card .val{font-size:28px;font-weight:700;margin-top:4px}
  .card .val.amber{color:#f59e0b} .card .val.red{color:#ef4444} .card .val.blue{color:#60a5fa}
  .section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;color:#666;padding:6px 8px;border-bottom:1px solid #2a2a35;text-transform:uppercase;letter-spacing:.05em}
  td{padding:7px 8px;border-bottom:1px solid #1e1e28;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
  .badge-red{background:#450a0a;color:#ef4444}
  .empty{text-align:center;padding:32px;color:#555}
</style>
</head>
<body>
<h1>Invoice Reminder</h1>
<p class="sub">Tracks overdue invoices and automated reminder schedule</p>

<div class="cards">
  <div class="card"><div class="label">Overdue</div><div class="val red">${overdue.length}</div></div>
  <div class="card"><div class="label">Reminders Sent</div><div class="val blue">${stats.totalReminders ?? 0}</div></div>
  <div class="card"><div class="label">Grace Days</div><div class="val amber">${stats.graceDays ?? 3}</div></div>
</div>

<div class="section-title">Overdue Invoices</div>
${overdue.length ? `<table><thead><tr><th>Invoice ID</th><th>Client</th><th>Amount</th><th>Overdue</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
  : `<div class="empty">No overdue invoices found</div>`}
</body></html>`);
  });

  return router;
};
