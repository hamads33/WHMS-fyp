const prisma = require("../../../../../prisma");

/**
 * Create WHOIS contacts for a domain
 * Enforces one contact per type (registrant/admin/tech/billing)
 */
async function createDomainContacts(domainId, contacts) {
  const data = contacts.map(c => ({
    domainId,
    type: c.type,
    name: c.name,
    email: c.email,
    phone: c.phone,
    country: c.country
  }));

  return prisma.domainContact.createMany({
    data,
    skipDuplicates: true
  });
}

module.exports = {
  createDomainContacts
};
