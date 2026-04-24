const prisma = require("../../../../prisma/index");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const AuditService = require("./audit.service");

const SALT_ROUNDS = 12;

const ApiKeyService = {
  ////////////////////////////////////////////////////////
  // Create API Key (hashed) + multiple scopes
  ////////////////////////////////////////////////////////
  async createKey({ userId, name, scopes = [], expiresInDays = 365 }) {
    const prefix = process.env.NODE_ENV === "production" ? "pk_live_" : "pk_test_";
    const rawKey = prefix + crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(rawKey, SALT_ROUNDS);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash: hash,
        expiresAt,
        scopes: {
          create: scopes.map(s => ({ scope: s }))
        }
      },
      include: { scopes: true }
    });

    await AuditService.safeLog({
      userId,
      action: "api_key.create",
      entity: "ApiKey",
      entityId: apiKey.id,
      data: { scopes }
    });

    return {
      rawKey, // show only ONCE
      apiKey
    };
  },

  ////////////////////////////////////////////////////////
  // List keys (safe – does not show raw key)
  ////////////////////////////////////////////////////////
  async listKeys(userId) {
    return prisma.apiKey.findMany({
      where: { userId, revoked: false },
      include: { scopes: true },
      orderBy: { createdAt: "desc" }
    });
  },

  ////////////////////////////////////////////////////////
  // Revoke key
  ////////////////////////////////////////////////////////
  async revokeKey({ userId, keyId }) {
    const key = await prisma.apiKey.findUnique({
      where: { id: keyId }
    });

    if (!key) throw new Error("API Key not found");
    if (key.userId !== userId) throw new Error("Unauthorized");

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true }
    });

    await AuditService.safeLog({
      userId,
      action: "api_key.revoke",
      entity: "ApiKey",
      entityId: keyId
    });

    return true;
  },

  ////////////////////////////////////////////////////////
  // Verify raw API key for requests
  ////////////////////////////////////////////////////////
  async verify(rawKey) {
    const keys = await prisma.apiKey.findMany({
      where: { revoked: false },
      include: { scopes: true }
    });

    for (const key of keys) {
      const isMatch = await bcrypt.compare(rawKey, key.keyHash);
      if (isMatch) {
        if (key.expiresAt && key.expiresAt < new Date()) {
          return null;
        }

        return key;
      }
    }

    return null;
  }
};

module.exports = ApiKeyService;
