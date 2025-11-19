// Cron Controller
// Provides:
//   POST /api/automation/cron/build
//   POST /api/automation/cron/validate

const cron = require("node-cron");
const {
  buildCronFromPayload,
  validateCronExpression,
  MIN_INTERVAL_SECONDS
} = require("../utils/cron.builder");

/**
 * POST /api/automation/cron/build
 * Converts UI-friendly payload → cron expression
 */
async function buildCron(req, res, next) {
  try {
    const payload = req.body || {};
    const result = buildCronFromPayload(payload);

    // enforce minimum allowed interval
    if (
      result.approxIntervalSec !== null &&
      result.approxIntervalSec < MIN_INTERVAL_SECONDS
    ) {
      return res.status(400).json({
        ok: false,
        error: `Schedule too frequent. Minimum allowed interval is ${MIN_INTERVAL_SECONDS} seconds.`,
        approxIntervalSec: result.approxIntervalSec
      });
    }

    // final node-cron validate
    if (!cron.validate(result.cron)) {
      return res.status(400).json({
        ok: false,
        error: "Final cron expression is invalid",
        cron: result.cron
      });
    }

    // Generate simple human readable interpretation
    const pretty = toHumanFriendly(payload, result.cron);

    res.json({
      ok: true,
      cron: result.cron,
      pretty,
      approxIntervalSec: result.approxIntervalSec
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/automation/cron/validate
 * Validate an existing cron expression manually
 */
async function validateCron(req, res, next) {
  try {
    const expr = (req.body?.expression || "").trim();

    const { valid, errors, approxIntervalSec, normalized } =
      validateCronExpression(expr);

    if (!valid) {
      return res.status(400).json({
        ok: false,
        valid: false,
        errors,
        approxIntervalSec
      });
    }

    res.json({
      ok: true,
      valid: true,
      cron: normalized,
      approxIntervalSec
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Converts payload + cron → human friendly description
 */
function toHumanFriendly(payload, cronExpr) {
  try {
    switch (payload.type) {
      case "everySeconds":
        return `Every ${payload.value} seconds`;

      case "everyMinutes":
        return `Every ${payload.value} minutes`;

      case "everyHours":
        return `Every ${payload.value} hours at minute ${payload.minute}`;

      case "daily":
        return `Every day at ${payload.hour}:${String(payload.minute).padStart(2, "0")}`;

      case "weekly":
        return `Every week on ${payload.dayOfWeek} at ${payload.hour}:${payload.minute}`;

      case "monthly":
        return `Every month on day ${payload.day} at ${payload.hour}:${payload.minute}`;

      case "advanced":
        return `Advanced cron: ${cronExpr}`;

      default:
        return `Cron: ${cronExpr}`;
    }
  } catch (err) {
    return `Cron: ${cronExpr}`;
  }
}

module.exports = {
  buildCron,
  validateCron
};
