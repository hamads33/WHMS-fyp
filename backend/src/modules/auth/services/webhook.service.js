// src/modules/auth/services/webhook.service.js
const crypto = require("crypto");
const prisma = require("../../../../prisma");

// Max attempts before giving up
const MAX_ATTEMPTS = 5;

// Exponential backoff: 1s → 2s → 4s → 8s → 16s
const RETRY_BACKOFF_MS = attempt => 1000 * Math.pow(2, attempt);

/**
 * Generate HMAC SHA256 signature for secure webhook verification
 */
function signPayload(secret, payload) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

const WebhookService = {
  /**
   * Return all webhooks that listen to a specific event.
   */
  async getActiveForEvent(event) {
    return prisma.webhook.findMany({
      where: {
        active: true,
        events: { has: event } // Array includes event
      }
    });
  },

  /**
   * Trigger a webhook event (fire & forget, but fully logged).
   */
  async trigger(event, payload = {}) {
    const hooks = await this.getActiveForEvent(event);
    if (!hooks.length) return;

    for (const hook of hooks) {
      const logEntry = await prisma.webhookLog.create({
        data: {
          webhookId: hook.id,
          event,
          payload,       // JSON field
          status: "queued",
          attempts: 0
        }
      });

      // Deliver in the background (non-blocking for auth flow)
      this._deliver(hook, logEntry, payload).catch(err => {
        console.error("[Webhook Dispatch Error]", err.message);
      });
    }
  },

  /**
   * Internal deliver mechanism with retry + exponential backoff.
   */
  async _deliver(hook, logRecord, payload) {
    let attempts = 0;

    const body = {
      event: logRecord.event,
      payload,
      timestamp: new Date().toISOString()
    };

    const signature = signPayload(hook.secret, body);

    while (attempts < MAX_ATTEMPTS) {
      attempts++;

      try {
        const response = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": logRecord.event,
            "X-Webhook-Signature": signature
          },
          body: JSON.stringify(body)
        });

        await prisma.webhookLog.update({
          where: { id: logRecord.id },
          data: {
            attempts,
            httpStatus: response.status,
            status: response.ok ? "success" : "failed",
            lastError: response.ok ? null : `HTTP ${response.status}`
          }
        });

        if (response.ok) return; // stop retries
      } catch (err) {
        await prisma.webhookLog.update({
          where: { id: logRecord.id },
          data: {
            attempts,
            status: "failed",
            lastError: err.message
          }
        });
      }

      // Wait before retrying
      await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS(attempts)));
    }

    // Mark final failure
    await prisma.webhookLog.update({
      where: { id: logRecord.id },
      data: { status: "failed" }
    });
  }
};

module.exports = WebhookService;
