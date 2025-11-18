class AppError extends Error {
  constructor(message, status = 500, code = 'APP_ERROR', meta = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}
module.exports = { AppError };
