const prisma = require('../../db/prisma');

// Placeholder provisioning logic. In real system this calls upstream host APIs:
async function provision(serviceId) {
  // simulate provisioning: set service.active = true
  const updated = await prisma.service.update({ where: { id: serviceId }, data: { status: 'active' }});
  // possibly enqueue email via emailService (require circular dependency carefully)
  return updated;
}

module.exports = { provision };
