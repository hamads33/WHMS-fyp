const prisma = require("../../../../../prisma");

/**
 * Persist a domain audit log entry
 */
async function logDomainAction(domainId, action, meta = {}) {
  return prisma.domainLog.create({
    data: {
      domainId,
      action,
      meta
    }
  });
}

module.exports = { logDomainAction };
