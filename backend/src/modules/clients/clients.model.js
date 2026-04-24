const prisma = require('../../db/prisma');

exports.findAll = async (search) => {
  return prisma.client.findMany({
    where: search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {},
    include: { services: true },
  });
};

exports.findById = async (id) => prisma.client.findUnique({
  where: { id },
  include: { services: true },
});

exports.create = async (data) => prisma.client.create({ data });

exports.update = async (id, data) => prisma.client.update({ where: { id }, data });

exports.delete = async (id) => prisma.client.update({
  where: { id },
  data: { status: 'inactive' },
});

exports.addService = async (clientId, serviceName) =>
  prisma.clientService.create({ data: { clientId, serviceName } });

exports.removeService = async (serviceId) =>
  prisma.clientService.delete({ where: { id: serviceId } });
