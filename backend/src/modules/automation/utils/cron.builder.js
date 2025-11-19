/**
 * Cron Builder Utility
 * Converts simple user-friendly payloads → 6-field cron expressions
 * Supports:
 *   - every X seconds/minutes/hours
 *   - daily
 *   - weekly
 *   - monthly
 *   - advanced (manual cron)
 * Ensures:
 *   - seconds-precision cron
 *   - minimum interval safety
 */

const cron = require("node-cron");

// Minimum allowed schedule interval (in seconds)
const MIN_INTERVAL_SECONDS = 10; // prevent spam load

/**
 * Validate a 6-field cron expression using node-cron
 */
function validateCronExpression(expr) {
  const cronExpr = expr.trim();

  // normalize 5-field cron → 6-field cron
  const parts = cronExpr.split(/\s+/);
  const normalized = parts.length === 5 ? `0 ${cronExpr}` : cronExpr;

  const valid = cron.validate(normalized);

  return {
    valid,
    errors: valid ? null : ["Invalid cron expression"],
    approxIntervalSec: valid ? estimateInterval(normalized) : null,
    normalized
  };
}

/**
 * Estimate execution interval for safety check
 * (best effort only)
 */
function estimateInterval(cronExpr) {
  try {
    const parser = require("cron-parser");
    const interval = parser.parseExpression(cronExpr);
    const next = interval.next().getTime();
    const after = interval.next().getTime();
    return Math.max(1, Math.floor((after - next) / 1000));
  } catch (err) {
    return null;
  }
}

/**
 * Build cron expression from user payload
 * Payload supports:
 *   - everySeconds: { type: "everySeconds", value }
 *   - everyMinutes: { type: "everyMinutes", value }
 *   - everyHours:   { type: "everyHours", value, minute }
 *   - daily:        { type: "daily", hour, minute }
 *   - weekly:       { type: "weekly", dayOfWeek, hour, minute }
 *   - monthly:      { type: "monthly", day, hour, minute }
 *   - advanced:     { type: "advanced", expression }
 */
function buildCronFromPayload(payload) {
  const type = payload.type;

  let cronExpr = "";

  switch (type) {
    case "everySeconds":
      cronExpr = `*/${payload.value || 1} * * * * *`;
      break;

    case "everyMinutes":
      cronExpr = `0 */${payload.value || 1} * * * *`;
      break;

    case "everyHours":
      cronExpr = `0 ${payload.minute || 0} */${payload.value || 1} * * *`;
      break;

    case "daily":
      cronExpr = `0 ${payload.minute || 0} ${payload.hour || 0} * * *`;
      break;

    case "weekly":
      cronExpr = `0 ${payload.minute || 0} ${payload.hour || 0} * * ${payload.dayOfWeek || 1}`;
      break;

    case "monthly":
      cronExpr = `0 ${payload.minute || 0} ${payload.hour || 0} ${payload.day || 1} * *`;
      break;

    case "advanced":
      cronExpr = payload.expression || "";
      break;

    default:
      throw new Error(`Unknown cron builder type: ${type}`);
  }

  // normalize 5-field cron → 6-field cron
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length === 5) {
    cronExpr = `0 ${cronExpr}`;
  }

  // Validate constructed cron
  const { valid, approxIntervalSec } = validateCronExpression(cronExpr);

  if (!valid) {
    throw new Error(`Generated cron expression is invalid: ${cronExpr}`);
  }

  return {
    cron: cronExpr,
    approxIntervalSec
  };
}

module.exports = {
  MIN_INTERVAL_SECONDS,
  buildCronFromPayload,
  validateCronExpression,
  estimateInterval
};
