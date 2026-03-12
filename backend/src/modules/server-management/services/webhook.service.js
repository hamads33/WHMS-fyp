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

async function emit(event, data) {
  const enabled = await webhookSettings.isEventEnabled(event);
  if (!enabled) return;

  const hooks = await webhookRepo.findByEvent(event);
  if (!hooks.length) return;

  const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });

  await Promise.allSettled(
    hooks.map((hook) =>
      fetch(hook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(8000),
      }).catch((e) => {
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
