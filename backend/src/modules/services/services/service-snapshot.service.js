const prisma = require("../../../../prisma");

class ServiceSnapshotService {
  async createSnapshot(serviceId, planId, payload) {
    return prisma.serviceSnapshot.create({
      data: {
        serviceId,
        planId,
        snapshot: payload,
      },
    });
  }
}

module.exports = new ServiceSnapshotService();
