const prisma = require("../../../../../prisma");

/**
 * Create a domain
 */
async function createDomain(data) {
  return prisma.domain.create({ data });
}

/**
 * Find domain by name
 */
async function findDomainByName(name) {
  return prisma.domain.findUnique({
    where: { name }
  });
}

/**
 * Find domain by ID
 * USED by DNS, renewals, overrides
 */
async function findDomainById(id) {
  return prisma.domain.findUnique({
    where: { id },
    include: {
      dnsRecords: true,
      contacts: true
    }
  });
}

/**
 * Update domain
 * USED by admin renewals, overrides, status changes
 */
async function updateDomain(id, data) {
  return prisma.domain.update({
    where: { id },
    data
  });
}

/**
 * List all domains
 * USED by registrar sync jobs
 */
async function listAllDomains() {
  return prisma.domain.findMany();
}

module.exports = {
  createDomain,
  findDomainByName,
  findDomainById,
  updateDomain,
  listAllDomains
};
