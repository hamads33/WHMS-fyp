const crypto = require("crypto");
const webhookRepo = require("../repositories/webhook.repository");
const webhookSettings = require("./webhook-settings.service");

const VALID_EVENTS = [
  "ACCOUNT_CREATED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_TERMINATED",
  "SERVER_DOWN",
  "HIGH_CPU_USAGE",
  "SERVER_ADDED",
];

function err(msg, code = 400) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

function _sign(secret, payload) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function _deliver(hook, payload) {
  const headers = { "Content-Type": "application/json" };
  if (hook.secret) {
    headers["X-Webhook-Signature"] = _sign(hook.secret, payload);
  }
  headers["X-Webhook-Event"] = hook.events?.[0] ?? "unknown";

  const res = await fetch(hook.url, {
    method: "POST",
    headers,
    body: payload,
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${hook.url}`);
  }
}

async function emit(event, data) {
  const enabled = await webhookSettings.isEventEnabled(event);
  if (!enabled) return;

  const hooks = await webhookRepo.findByEvent(event);
  if (!hooks.length) return;

  const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });

  await Promise.allSettled(
    hooks.map((hook) =>
      _deliver(hook, payload).catch((e) => {
        console.warn(`[Webhook] Delivery failed for ${hook.url}: ${e.message}`);
      })
    )
  );
}

async function listWebhooks() {
  return webhookRepo.findAll();
}

async function getWebhook(id) {
  const hook = await webhookRepo.findById(id);
  if (!hook) throw err("Webhook not found", 404);
  return hook;
}

async function createWebhook({ url, events, secret }) {
  const invalid = events.filter((e) => !VALID_EVENTS.includes(e));
  if (invalid.length) throw err(`Invalid events: ${invalid.join(", ")}`);
  return webhookRepo.create({ url, events, secret: secret ?? null });
}

async function updateWebhook(id, data) {
  await getWebhook(id);
  if (data.events) {
    const invalid = data.events.filter((e) => !VALID_EVENTS.includes(e));
    if (invalid.length) throw err(`Invalid events: ${invalid.join(", ")}`);
  }
  return webhookRepo.update(id, data);
}

async function deleteWebhook(id) {
  await getWebhook(id);
  return webhookRepo.remove(id);
}

module.exports = {
  emit,
  listWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  VALID_EVENTS,
};
