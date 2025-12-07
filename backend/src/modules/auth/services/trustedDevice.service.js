const crypto = require("crypto");
const prisma = require("../../../../prisma/index");

const TTL_DAYS = 30;

const TrustedDeviceService = {
  // Generate a device token and persist device entry
  async createTrustedDevice({ userId, userAgent, ip, name }) {
    const deviceId = crypto.randomBytes(32).toString("hex"); // 64 chars
    const expiresAt = new Date(Date.now() + TTL_DAYS * 24*60*60*1000);
    await prisma.trustedDevice.create({
      data: {
        userId,
        deviceId,
        userAgent,
        ip,
        name,
        expiresAt
      }
    });
    return { deviceId, expiresAt };
  },

  async validateTrustedDevice(deviceId, userId) {
    if (!deviceId) return false;
    const td = await prisma.trustedDevice.findUnique({ where: { deviceId } });
    if (!td || td.revoked) return false;
    if (td.userId !== userId) return false;
    if (td.expiresAt < new Date()) return false;
    // update lastUsedAt
    await prisma.trustedDevice.update({ where: { id: td.id }, data: { lastUsedAt: new Date() }});
    return true;
  },

  async revokeDevice(deviceId, userId) {
    const td = await prisma.trustedDevice.findUnique({ where: { deviceId }});
    if (!td || td.userId !== userId) throw new Error("Not found");
    await prisma.trustedDevice.update({ where: { id: td.id }, data: { revoked: true }});
    return true;
  },

  async listDevices(userId) {
    return prisma.trustedDevice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }
};

module.exports = TrustedDeviceService;
