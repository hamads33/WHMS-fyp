const { Router } = require("express");

module.exports = function buildRouter({ analytics }) {
  const router = Router();

  /** GET /api/plugins/analytics-widget/data — raw JSON stats */
  router.get("/data", (_req, res) => {
    res.json({
      success   : true,
      startedAt : analytics.getStartedAt(),
      total     : analytics.getTotal(),
      counts    : analytics.getCounts(),
      feed      : analytics.getFeed(20),
    });
  });

  /** GET /api/plugins/analytics-widget/ui-data/overview — standardised JSON for frontend renderer */
  router.get("/ui-data/overview", (_req, res) => {
    const counts = analytics.getCounts();
    const feed   = analytics.getFeed(15);
    const total  = analytics.getTotal();

    const colorMap = {
      "order.created"     : "blue",
      "invoice.paid"      : "green",
      "service.provision" : "violet",
      "service.suspend"   : "amber",
      "service.terminate" : "red",
    };
    const labelMap = {
      "order.created"     : "Orders Created",
      "invoice.paid"      : "Invoices Paid",
      "service.provision" : "Services Provisioned",
      "service.suspend"   : "Services Suspended",
      "service.terminate" : "Services Terminated",
    };

    return res.json({
      title : "Analytics Overview",
      stats : [
        { label: "Total Events",           value: total,                     color: "violet" },
        { label: "Orders Created",         value: counts["order.created"],   color: "blue"   },
        { label: "Invoices Paid",          value: counts["invoice.paid"],    color: "green"  },
        { label: "Services Provisioned",   value: counts["service.provision"],color:"violet" },
        { label: "Services Suspended",     value: counts["service.suspend"], color: "amber"  },
        { label: "Services Terminated",    value: counts["service.terminate"],color:"red"    },
      ],
      sections: [
        {
          title: "Live Activity Feed",
          type : "feed",
          empty: "No events recorded yet — trigger an order, invoice, or service action.",
          items: feed.map(e => ({
            label : labelMap[e.event] ?? e.event,
            detail: e.detail,
            ts    : e.ts,
            color : colorMap[e.event] ?? "default",
          })),
        },
      ],
    });
  });

  /** GET /api/plugins/analytics-widget/ui/overview — legacy HTML (kept as fallback) */
  router.get("/ui/overview", (_req, res) => {
    const counts    = analytics.getCounts();
    const feed      = analytics.getFeed(15);
    const total     = analytics.getTotal();
    const startedAt = analytics.getStartedAt();

    const eventMeta = {
      "order.created"     : { label: "Orders Created",      color: "#60a5fa", icon: "🛒" },
      "invoice.paid"      : { label: "Invoices Paid",       color: "#34d399", icon: "💳" },
      "service.provision" : { label: "Services Provisioned",color: "#a78bfa", icon: "⚙️" },
      "service.suspend"   : { label: "Services Suspended",  color: "#fbbf24", icon: "⏸️" },
      "service.terminate" : { label: "Services Terminated", color: "#f87171", icon: "🗑️" },
    };

    // Build stat cards
    const cards = Object.entries(counts).map(([key, val]) => {
      const m = eventMeta[key] ?? { label: key, color: "#94a3b8", icon: "📌" };
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      return `
        <div class="card">
          <div class="card-icon">${m.icon}</div>
          <div class="card-body">
            <div class="card-label">${m.label}</div>
            <div class="card-val" style="color:${m.color}">${val}</div>
            <div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${m.color}"></div></div>
          </div>
        </div>`;
    }).join("");

    // Build activity feed rows
    const feedRows = feed.length
      ? feed.map(e => {
          const m = eventMeta[e.event] ?? { label: e.event, icon: "📌", color: "#94a3b8" };
          const t = new Date(e.ts);
          const time = `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}`;
          return `<div class="feed-row">
            <span class="feed-icon">${m.icon}</span>
            <div class="feed-body">
              <span class="feed-event" style="color:${m.color}">${m.label}</span>
              ${e.detail ? `<span class="feed-detail">${e.detail}</span>` : ""}
            </div>
            <span class="feed-time">${time}</span>
          </div>`;
        }).join("")
      : `<div class="feed-empty">No events recorded yet. Trigger an order, invoice, or service action to see live data.</div>`;

    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Analytics Widget</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;
       background:#0a0a0f;color:#e2e2e7;padding:20px 24px;min-height:100vh}

  /* Header */
  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
  .header h1{font-size:18px;font-weight:700;background:linear-gradient(135deg,#a78bfa,#60a5fa);
             -webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .header-meta{font-size:11px;color:#555;text-align:right}
  .header-meta span{display:block}

  /* Total pill */
  .total-pill{display:inline-flex;align-items:center;gap:8px;background:#1a1a2e;border:1px solid #2a2a45;
              border-radius:99px;padding:6px 16px;margin-bottom:20px}
  .total-pill .num{font-size:22px;font-weight:700;color:#a78bfa}
  .total-pill .lbl{font-size:12px;color:#888}

  /* Stat cards */
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:24px}
  .card{background:#111118;border:1px solid #1e1e30;border-radius:12px;padding:14px;
        display:flex;align-items:flex-start;gap:12px;transition:border-color .2s}
  .card:hover{border-color:#3a3a55}
  .card-icon{font-size:22px;line-height:1;margin-top:2px}
  .card-body{flex:1;min-width:0}
  .card-label{font-size:11px;color:#666;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card-val{font-size:26px;font-weight:700;margin-bottom:8px;line-height:1}
  .bar-bg{height:4px;background:#1e1e30;border-radius:2px;overflow:hidden}
  .bar-fill{height:100%;border-radius:2px;transition:width .4s}

  /* Activity feed */
  .section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;
                 color:#555;margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .dot{width:6px;height:6px;border-radius:50%;background:#a78bfa;display:inline-block}
  .feed{background:#111118;border:1px solid #1e1e30;border-radius:12px;overflow:hidden}
  .feed-row{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #1a1a28}
  .feed-row:last-child{border-bottom:none}
  .feed-icon{font-size:16px;flex-shrink:0;width:24px;text-align:center}
  .feed-body{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
  .feed-event{font-size:12px;font-weight:600;white-space:nowrap}
  .feed-detail{font-size:11px;color:#555;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
  .feed-time{font-size:11px;color:#444;flex-shrink:0;font-family:monospace}
  .feed-empty{padding:28px;text-align:center;color:#444;font-size:12px;line-height:1.7}

  /* Auto-refresh notice */
  .refresh-note{font-size:11px;color:#444;text-align:center;margin-top:14px}
</style>
<script>
  // Auto-refresh the whole page every 10 seconds to show live data
  setTimeout(() => location.reload(), 10000);
</script>
</head>
<body>

<div class="header">
  <h1>📊 Analytics Widget</h1>
  <div class="header-meta">
    <span>Plugin running since</span>
    <span style="color:#888">${new Date(startedAt).toLocaleString()}</span>
  </div>
</div>

<div class="total-pill">
  <span class="num">${total}</span>
  <span class="lbl">total events tracked</span>
</div>

<div class="cards">${cards}</div>

<div class="section-title"><span class="dot"></span>Live Activity Feed</div>
<div class="feed">${feedRows}</div>

<p class="refresh-note">↻ Auto-refreshes every 10 seconds</p>

</body></html>`);
  });

  return router;
};
