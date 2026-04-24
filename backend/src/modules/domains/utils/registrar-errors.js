const PORKBUN_ERROR_MAP = {
  INVALID_DOMAIN: {
    message: "The domain name is invalid.",
    statusCode: 400,
  },
  INSUFFICIENT_FUNDS: {
    message: "The Porkbun account does not have enough funds for this action.",
    statusCode: 402,
  },
  DOMAIN_NOT_FOUND: {
    message: "The requested domain was not found at Porkbun.",
    statusCode: 404,
  },
  ACCESS_DENIED: {
    message: "Porkbun rejected this request. Check account permissions.",
    statusCode: 403,
  },
  FEATURE_UNSUPPORTED: {
    message: "This registrar does not support that operation.",
    statusCode: 400,
  },
};

function createRegistrarError({ registrar, code, message, statusCode = 400, cause }) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = code;
  err.registrar = registrar;
  if (cause) err.cause = cause;
  return err;
}

function normalizeRegistrarError(err, registrar) {
  if (!err) return err;

  if (registrar === "porkbun") {
    const mapped = err.errorCode || err.code ? PORKBUN_ERROR_MAP[err.errorCode || err.code] : null;
    if (mapped) {
      return createRegistrarError({
        registrar,
        code: err.errorCode || err.code,
        message: mapped.message,
        statusCode: mapped.statusCode,
        cause: err,
      });
    }
  }

  if (!err.errorCode && err.code) {
    err.errorCode = err.code;
  }

  return err;
}

function unsupportedCapabilityError(registrar, capability) {
  return createRegistrarError({
    registrar,
    code: "FEATURE_UNSUPPORTED",
    message: `${registrar} does not support ${capability}`,
    statusCode: 400,
  });
}

module.exports = {
  PORKBUN_ERROR_MAP,
  createRegistrarError,
  normalizeRegistrarError,
  unsupportedCapabilityError,
};
