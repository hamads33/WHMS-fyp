const { Router } = require("express");

module.exports = function buildRouter({ monitor }) {
  const router = Router();

  /** GET /api/plugins/health-monitor/summary */
  router.get("/summary", (req, res) => {
    res.json({ success: true, data: monitor.getSummary() });
  });

  /** GET /api/plugins/health-monitor/services */
  router.get("/services", (req, res) => {
    const { status } = req.query;
    const data = status ? monitor.listByStatus(status) : monitor.listAll();
    res.json({ success: true, count: data.length, data });
  });

  /** GET /api/plugins/health-monitor/services/:serviceId */
  router.get("/services/:serviceId", (req, res) => {
    const record = monitor.getService(req.params.serviceId);
    if (!record) return res.status(404).json({ success: false, message: "Service not found in monitor" });
    res.json({ success: true, data: record });
  });

  /** POST /api/plugins/health-monitor/check — trigger manual health check */
  router.post("/check", (req, res) => {
    const summary = monitor.runHealthCheck();
    res.json({ success: true, data: summary });
  });

  /** GET /api/plugins/service-health-monitor/ui-data/health — standardised JSON for frontend renderer */
  router.get("/ui-data/health", (_req, res) => {
    const summary  = monitor.getSummary();
    const services = monitor.listAll();
    return res.json({
      title: "Service Health Monitor",
      stats: [
        { label: "Total Services",    value: summary.total      ?? 0, color: "blue"   },
        { label: "Active",            value: summary.active     ?? 0, color: "green"  },
        { label: "Suspended",         value: summary.suspended  ?? 0, color: "amber"  },
        { label: "Terminated",        value: summary.terminated ?? 0, color: "red"    },
      ],
      sections: [
        {
          title  : "Service Records",
          type   : "table",
          empty  : "No services tracked yet — provision a service to start monitoring.",
          columns: ["Service ID", "Status", "Last Seen", "Events"],
          rows   : services.map(s => [
            s.serviceId,
            s.status,
            s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "–",
            String(s.events?.length ?? 0),
          ]),
          statusCol: 1,  // hint: column index to render as colored badge
        },
      ],
    });
  });

  /** GET /api/plugins/service-health-monitor/ui/health — legacy HTML (kept as fallback) */
  router.get("/ui/health", (_req, res) => {
    const summary  = monitor.getSummary();
    const services = monitor.listAll();

    const statusColor = { active: "green", suspended: "amber", terminated: "red", unknown: "gray" };
    const rows = services.map(s => `
      <tr>
        <td>${s.serviceId}</td>
        <td><span class="badge badge-${statusColor[s.status] ?? "gray"}">${s.status}</span></td>
        <td>${s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "–"}</td>
        <td>${s.events?.length ?? 0}</td>
      </tr>`).join("");

    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Service Health Monitor</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;background:#0f0f11;color:#e2e2e7;padding:20px}
  h1{font-size:17px;font-weight:600;margin-bottom:4px}
  .sub{color:#888;font-size:12px;margin-bottom:20px}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .card{background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;padding:14px}
  .card .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em}
  .card .val{font-size:28px;font-weight:700;margin-top:4px}
  .card .val.green{color:#22c55e} .card .val.amber{color:#f59e0b} .card .val.red{color:#ef4444} .card .val.blue{color:#60a5fa}
  .section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;color:#666;padding:6px 8px;border-bottom:1px solid #2a2a35;text-transform:uppercase;letter-spacing:.05em}
  td{padding:7px 8px;border-bottom:1px solid #1e1e28;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
  .badge-green{background:#14532d;color:#22c55e} .badge-amber{background:#451a03;color:#f59e0b}
  .badge-red{background:#450a0a;color:#ef4444} .badge-gray{background:#1f2937;color:#9ca3af}
  .empty{text-align:center;padding:32px;color:#555}
</style>
</head>
<body>
<h1>Service Health Monitor</h1>
<p class="sub">Live service lifecycle status tracked by provisioning hooks</p>

<div class="cards">
  <div class="card"><div class="label">Total</div><div class="val blue">${summary.total ?? 0}</div></div>
  <div class="card"><div class="label">Active</div><div class="val green">${summary.active ?? 0}</div></div>
  <div class="card"><div class="label">Suspended</div><div class="val amber">${summary.suspended ?? 0}</div></div>
  <div class="card"><div class="label">Terminated</div><div class="val red">${summary.terminated ?? 0}</div></div>
</div>

<div class="section-title">Service Records</div>
${services.length ? `<table><thead><tr><th>Service ID</th><th>Status</th><th>Last Seen</th><th>Events</th></tr></thead><tbody>${rows}</tbody></table>`
  : `<div class="empty">No services tracked yet — provision a service to start monitoring</div>`}
</body></html>`);
  });

  return router;
};
