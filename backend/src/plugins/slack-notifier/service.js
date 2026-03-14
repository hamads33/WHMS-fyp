/**
 * SlackNotifierService
 * ------------------------------------------------------------------
 * Sends formatted messages to a Slack incoming webhook URL.
 * Falls back to console logging when no webhook is configured.
 */

class SlackNotifierService {
  constructor({ webhookUrl = null, channel = "#general", logger = console } = {}) {
    this.webhookUrl = webhookUrl;
    this.channel    = channel;
    this.logger     = logger;

    // Delivery log (last 100)
    this._log = [];
  }

  /**
   * send
   * Posts a Slack message. If no webhook configured, logs to console.
   *
   * @param {string} text       - Main message text
   * @param {object} [fields]   - Optional key/value fields for the attachment
   * @param {string} [color]    - Attachment color: good | warning | danger | #hex
   */
  async send(text, fields = {}, color = "good") {
    const entry = {
      text,
      color,
      fields,
      sentAt   : new Date().toISOString(),
      channel  : this.channel,
      delivered: false,
    };

    if (this.webhookUrl) {
      try {
        const https = require("https");
        const url   = new URL(this.webhookUrl);
        const body  = JSON.stringify({
          channel    : this.channel,
          attachments: [{
            color,
            text,
            fields: Object.entries(fields).map(([title, value]) => ({ title, value, short: true })),
            footer : "WHMS",
            ts     : Math.floor(Date.now() / 1000),
          }],
        });

        await new Promise((resolve, reject) => {
          const req = https.request(
            { hostname: url.hostname, path: url.pathname + url.search, method: "POST",
              headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
            res => { res.resume(); resolve(); }
          );
          req.on("error", reject);
          req.write(body);
          req.end();
        });

        entry.delivered = true;
        this.logger.info(`[slack-notifier] ✓ Sent to Slack: ${text}`);
      } catch (err) {
        this.logger.warn(`[slack-notifier] Webhook failed: ${err.message} — falling back to log`);
        this.logger.info(`[slack-notifier] 📢 ${text}`);
      }
    } else {
      // No webhook — just log (dev mode)
      this.logger.info(`[slack-notifier] 📢 [SLACK] ${text} ${JSON.stringify(fields)}`);
      entry.delivered = true; // consider logged = delivered
    }

    this._log.unshift(entry);
    if (this._log.length > 100) this._log.pop();

    return entry;
  }

  getLog(limit = 20) {
    return this._log.slice(0, limit);
  }

  getStats() {
    return {
      total    : this._log.length,
      delivered: this._log.filter(e => e.delivered).length,
      failed   : this._log.filter(e => !e.delivered).length,
      webhook  : this.webhookUrl ? "configured" : "not configured (logging only)",
    };
  }
}

module.exports = SlackNotifierService;
