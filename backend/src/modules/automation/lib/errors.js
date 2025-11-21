// src/modules/automation/lib/errors.js
class AutomationError extends Error {
  constructor(message, { status = 500, code = 'automation_error', meta = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AutomationError {
  constructor(message = 'Not found', meta = null) {
    super(message, { status: 404, code: 'not_found', meta });
  }
}

class ValidationError extends AutomationError {
  constructor(message = 'Validation failed', meta = null) {
    super(message, { status: 400, code: 'validation_error', meta });
  }
}

module.exports = { AutomationError, NotFoundError, ValidationError };
