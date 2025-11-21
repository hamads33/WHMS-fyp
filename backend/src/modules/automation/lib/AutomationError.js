// src/modules/automation/lib/AutomationError.js

class AutomationError extends Error {
  constructor(message, meta = null) {
    super(message);
    this.name = "AutomationError";
    this.meta = meta;
    this.id = Math.random().toString(16).slice(2, 12); // unique short error id
  }
}

module.exports = AutomationError;
