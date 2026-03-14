const { Router } = require("express");

module.exports = function buildRouter({ notifier }) {
  const router = Router();

  /** GET /api/plugins/slack-notifier/log */
  router.get("/log", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    res.json({ success: true, data: notifier.getLog(limit) });
  });

  /** GET /api/plugins/slack-notifier/stats */
  router.get("/stats", (req, res) => {
    res.json({ success: true, data: notifier.getStats() });
  });

  /** POST /api/plugins/slack-notifier/test — send a test message */
  router.post("/test", async (req, res) => {
    try {
      const entry = await notifier.send(
        "🧪 Test notification from WHMS plugin system",
        { Source: "slack-notifier plugin", Timestamp: new Date().toISOString() },
        "good"
      );
      res.json({ success: true, data: entry });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /** GET /api/plugins/slack-notifier/ui-data/dashboard — standardised JSON for frontend renderer */
  router.get("/ui-data/dashboard", (_req, res) => {
    const stats = notifier.getStats();
    const log   = notifier.getLog(15);
    return res.json({
      title: "Slack Notifications",
      stats: [
        { label: "Total Sent",    value: stats.total  ?? 0, color: "violet" },
        { label: "Delivered",     value: stats.sent   ?? 0, color: "green"  },
        { label: "Logged Only",   value: stats.logged ?? 0, color: "blue"   },
        { label: "Failed",        value: stats.failed ?? 0, color: "red"    },
      ],
      sections: [
        {
          title: "Recent Notifications",
          type : "feed",
          empty: "No notifications sent yet.",
          items: log.map(e => ({
            label : e.event ?? "notification",
            detail: e.text ?? "",
            ts    : e.sentAt,
            color : e.status === "sent" ? "green" : e.status === "logged" ? "blue" : "red",
          })),
        },
      ],
    });
  });

  /** GET /api/plugins/slack-notifier/ui/dashboard — legacy HTML (kept as fallback) */
  router.get("/ui/dashboard", (_req, res) => {
    const stats = notifier.getStats();
    const log   = notifier.getLog(20);
    const rows  = log.map(e => `
      <tr>
        <td>${new Date(e.sentAt).toLocaleTimeString()}</td>
        <td>${e.event ?? "–"}</td>
        <td><span class="badge badge-${e.status === "sent" ? "green" : e.status === "logged" ? "blue" : "red"}">${e.status}</span></td>
        <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.text ?? ""}</td>
      </tr>`).join("");

    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Slack Notifier</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;background:#0f0f11;color:#e2e2e7;padding:20px}
  h1{font-size:17px;font-weight:600;margin-bottom:4px}
  .sub{color:#888;font-size:12px;margin-bottom:20px}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
  .card{background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;padding:14px}
  .card .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em}
  .card .val{font-size:28px;font-weight:700;margin-top:4px}
  .card .val.green{color:#22c55e} .card .val.red{color:#ef4444} .card .val.blue{color:#60a5fa}
  .section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;color:#666;padding:6px 8px;border-bottom:1px solid #2a2a35;text-transform:uppercase;letter-spacing:.05em}
  td{padding:7px 8px;border-bottom:1px solid #1e1e28;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
  .badge-green{background:#14532d;color:#22c55e} .badge-blue{background:#1e3a5f;color:#60a5fa} .badge-red{background:#450a0a;color:#ef4444}
  .empty{text-align:center;padding:32px;color:#555}
</style>
</head>
<body>
<h1>Slack Notifier</h1>
<p class="sub">Real-time Slack delivery stats and notification log</p>

<div class="cards">
  <div class="card"><div class="label">Total Sent</div><div class="val blue">${stats.total ?? 0}</div></div>
  <div class="card"><div class="label">Delivered</div><div class="val green">${stats.sent ?? 0}</div></div>
  <div class="card"><div class="label">Logged Only</div><div class="val">${stats.logged ?? 0}</div></div>
</div>

<div class="section-title">Recent Notifications</div>
${log.length ? `<table><thead><tr><th>Time</th><th>Event</th><th>Status</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table>`
  : `<div class="empty">No notifications sent yet</div>`}
</body></html>`);
  });

  return router;
};
