// src/modules/automation/lib/guards.js
const AutomationError = require("./AutomationError");

function assertNumber(value, name = "value") {
  const num = Number(value);

  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
    throw new AutomationError(`${name} must be a positive integer`, { value });
  }

  return num;
}

function isPlainObject(obj) {
  return obj !== null && typeof obj === "object" && !Array.isArray(obj);
}

module.exports = {
  assertNumber,
  isPlainObject,
};
