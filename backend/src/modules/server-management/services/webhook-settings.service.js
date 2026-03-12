const prisma = require("../../../../prisma");

const VALID_EVENTS = [
  "ACCOUNT_CREATED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_TERMINATED",
  "SERVER_DOWN",
  "HIGH_CPU_USAGE",
  "SERVER_ADDED",
];

const SETTING_KEY = "webhook_settings";

// Default: all events enabled
function defaultSettings() {
  return {
    enabledEvents: Object.fromEntries(VALID_EVENTS.map(e => [e, true])),
  };
}

async function get() {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return defaultSettings();
  // Ensure any new events added to VALID_EVENTS default to true
  const base = defaultSettings();
  return { enabledEvents: { ...base.enabledEvents, ...row.value.enabledEvents } };
}

async function update(enabledEvents) {
  // Only persist known events
  const clean = Object.fromEntries(
    VALID_EVENTS.map(e => [e, enabledEvents[e] !== false])
  );
  const value = { enabledEvents: clean };
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value },
    create: { key: SETTING_KEY, value },
  });
  return { enabledEvents: clean };
}

async function isEventEnabled(event) {
  const settings = await get();
  return settings.enabledEvents[event] !== false;
}

module.exports = { get, update, isEventEnabled };
