const prisma = require("../../../../../prisma");

/**
 * Fetch domain with access control.
 * - Clients: restricted by ownerId
 * - Superadmin OR missing user context: unrestricted
 */
async function getDomainOrThrow({ domainId, user }) {
  if (!user) {
    throw new Error("Authentication required");
  }

  const where = { id: domainId };

  // Enforce ownership ONLY if user is not superadmin
  if (user.role !== "superadmin") {
    where.ownerId = user.id;
  }

  const domain = await prisma.domain.findFirst({ where });

  if (!domain) {
    throw new Error("Domain not found");
  }

  return domain;
}

/**
 * List DNS records
 */
async function listDNS({ domainId, user }) {
  await getDomainOrThrow({ domainId, user });

  return prisma.dNSRecord.findMany({
    where: { domainId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Create DNS record
 */
async function addDNSRecord({ domainId, record, user }) {
  await getDomainOrThrow({ domainId, user });

  return prisma.dNSRecord.create({
    data: {
      domainId,
      type: record.type,
      name: record.name,
      value: record.value,
      ttl: record.ttl ?? 3600,
    },
  });
}

/**
 * Update DNS record
 */
async function updateDNSRecord({ domainId, recordId, updates, user }) {
  await getDomainOrThrow({ domainId, user });

  return prisma.dNSRecord.update({
    where: { id: recordId },
    data: updates,
  });
}

/**
 * Delete DNS record
 */
async function deleteDNSRecord({ domainId, recordId, user }) {
  await getDomainOrThrow({ domainId, user });

  return prisma.dNSRecord.delete({
    where: { id: recordId },
  });
}

module.exports = {
  listDNS,
  addDNSRecord,
  updateDNSRecord,
  deleteDNSRecord,
};
