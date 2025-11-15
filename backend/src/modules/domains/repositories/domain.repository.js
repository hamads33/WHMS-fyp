const prisma = require('../../../db/prisma');

async function findAll() {
  return prisma.domain.findMany({ orderBy: { createdAt: 'desc' } });
}

async function findById(id) {
  return prisma.domain.findUnique({ where: { id: Number(id) } });
}

async function findByName(name) {
  return prisma.domain.findUnique({ where: { name } });
}

async function create(data) {
  return prisma.domain.create({
    data: {
      name: data.name,
      provider: data.provider,
      expiryDate: data.expiryDate,
      nameservers: data.nameservers,
      status: data.status || 'active',
      metadata: data.metadata || {}
    }
  });
}

async function update(id, patch) {
  return prisma.domain.update({
    where: { id: Number(id) },
    data: {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.provider ? { provider: patch.provider } : {}),
      ...(patch.expiryDate ? { expiryDate: patch.expiryDate } : {}),
      ...(patch.nameservers ? { nameservers: patch.nameservers } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.metadata ? { metadata: patch.metadata } : {})
    }
  });
}

async function softDelete(id) {
  return prisma.domain.update({
    where: { id: Number(id) },
    data: {
      deleted: true,
      deletedAt: new Date(),
      status: "deleted"
    }
  });
}

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  softDelete   // ✅ THE FIX
};
