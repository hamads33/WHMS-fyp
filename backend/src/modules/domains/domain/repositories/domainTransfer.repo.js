const prisma = require("../../../../../prisma");

async function createTransfer(data) {
  return prisma.domainTransfer.create({ data });
}

async function updateTransferStatus(id, status, providerResponse = null) {
  return prisma.domainTransfer.update({
    where: { id },
    data: {
      status,
      providerResponse,
      completedAt: status === "completed" ? new Date() : null
    }
  });
}

async function findActiveTransfer(domainId) {
  return prisma.domainTransfer.findFirst({
    where: {
      domainId,
      status: { in: ["pending", "approved"] }
    }
  });
}

module.exports = {
  createTransfer,
  updateTransferStatus,
  findActiveTransfer
};
