const prisma = require("../../../lib/prisma");

module.exports = {
  async logSystem(action, payload = {}) {
    await prisma.auditLog.create({
      data: {
        action,
        meta: payload,
      }
    });
  }
};
