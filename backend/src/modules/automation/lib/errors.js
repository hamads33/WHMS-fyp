class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

class ValidationError extends Error {
  constructor(message, meta) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.meta = meta;
  }
}

module.exports = { NotFoundError, ValidationError };
