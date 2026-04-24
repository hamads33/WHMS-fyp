// src/modules/auth/services/simpleWebhookEmitter.js

const axios = require("axios");

/**
 * Simple webhook emitter
 * - Reads URLs from ENV
 * - Fire-and-forget
 * - No auth logic here (clean separation)
 */

const HOOK_URLS = (process.env.AUTH_WEBHOOKS || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

async function emit(event, payload) {
  if (!HOOK_URLS.length) return;

  for (const url of HOOK_URLS) {
    axios
      .post(url, {
        event,
        payload,
        timestamp: new Date().toISOString(),
      })
      .catch((err) => {
        console.warn("[Auth Webhook Failed]", url, err.message);
      });
  }
}

module.exports = { emit };
