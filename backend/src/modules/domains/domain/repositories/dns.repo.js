// src/modules/domains/domain/repositories/dns.repo.js
const prisma = require("../../../../../prisma");

async function listRecords(domainId) {
  return prisma.dNSRecord.findMany({
    where: { domainId }
  });
}

async function createRecord(domainId, data) {
  return prisma.dNSRecord.create({
    data: {
      domainId,
      type: data.type,
      name: data.name,
      value: data.value,
      ttl: data.ttl ?? 3600
    }
  });
}

async function updateRecord(id, data) {
  return prisma.dNSRecord.update({
    where: { id },
    data
  });
}

async function deleteRecord(id) {
  return prisma.dNSRecord.delete({
    where: { id }
  });
}

module.exports = {
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord
};
