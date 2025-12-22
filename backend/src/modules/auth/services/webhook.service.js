const crypto = require("crypto");
const prisma = require("../../../../prisma");

// Max retry attempts
const MAX_ATTEMPTS = 5;

// Exponential backoff: 1s → 2s → 4s → 8s → 16s
const RETRY_BACKOFF_MS = (attempt) => 1000 * Math.pow(2, attempt);

/**
 * Generate HMAC SHA256 signature
 */
function signPayload(secret, payload) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

const WebhookService = {
  /**
   * Get all active webhooks subscribed to an event
   */
  async getActiveForEvent(event) {
    return prisma.webhook.findMany({
      where: {
        active: true,
        events: { has: event },
      },
    });
  },

  /**
   * Trigger webhook event (non-blocking)
   */
  async trigger(event, payload = {}) {
    const hooks = await this.getActiveForEvent(event);
    if (!hooks.length) return;

    for (const hook of hooks) {
      const log = await prisma.webhookLog.create({
        data: {
          webhookId: hook.id,
          event,
          payload,
          status: "queued",
          attempts: 0,
        },
      });

      // Fire in background
      this._deliver(hook, log, payload).catch((err) => {
        console.error("[Webhook Error]", err.message);
      });
    }
  },

  /**
   * Internal delivery with retry + backoff
   */
  async _deliver(hook, log, payload) {
    let attempts = 0;

    const body = {
      event: log.event,
      payload,
      timestamp: new Date().toISOString(),
    };

    const signature = signPayload(hook.secret, body);

    while (attempts < MAX_ATTEMPTS) {
      attempts++;

      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": log.event,
            "X-Webhook-Signature": signature,
          },
          body: JSON.stringify(body),
        });

        await prisma.webhookLog.update({
          where: { id: log.id },
          data: {
            attempts,
            httpStatus: res.status,
            status: res.ok ? "success" : "failed",
            lastError: res.ok ? null : `HTTP ${res.status}`,
          },
        });

        if (res.ok) return;
      } catch (err) {
        await prisma.webhookLog.update({
          where: { id: log.id },
          data: {
            attempts,
            status: "failed",
            lastError: err.message,
          },
        });
      }

      await new Promise((r) =>
        setTimeout(r, RETRY_BACKOFF_MS(attempts))
      );
    }
  },
};

module.exports = WebhookService;
