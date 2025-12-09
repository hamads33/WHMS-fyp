// src/modules/backup/storageConfig.service.js
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const KEY = process.env.BACKUP_CONFIG_KEY || ""; // must be set in production

function getKey() {
  if (process.env.USE_KMS === "true") {
    throw new Error("KMS mode not implemented in this helper. Use KMS helper in production.");
  }
  return crypto.createHash("sha256").update(KEY).digest();
}

function encryptConfig(obj) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let enc = cipher.update(JSON.stringify(obj), "utf8", "base64");
  enc += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), tag: tag.toString("base64"), data: enc };
}

function decryptConfig(enc) {
  try {
    const key = getKey();
    const iv = Buffer.from(enc.iv, "base64");
    const tag = Buffer.from(enc.tag, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    let out = decipher.update(enc.data, "base64", "utf8");
    out += decipher.final("utf8");
    return JSON.parse(out);
  } catch (err) {
    console.error("decrypt failed", err.message);
    return null;
  }
}

async function createStorageConfig({ name, provider, config, createdById }) {
  const encrypted = encryptConfig(config);
  return prisma.storageConfig.create({
    data: {
      name,
      provider,
      config: encrypted,
      createdById,
    },
  });
}

async function getStorageConfig(id) {
  const rec = await prisma.storageConfig.findUnique({ where: { id }});
  if (!rec) return null;
  return rec;
}

async function decryptAndReturnConfig(id) {
  const rec = await getStorageConfig(id);
  if (!rec) return null;
  const dec = decryptConfig(rec.config);
  if (!dec) throw new Error("Decryption failed");
  dec.provider = rec.provider;
  return dec;
}

module.exports = {
  encryptConfig,
  decryptConfig,
  createStorageConfig,
  getStorageConfig,
  decryptAndReturnConfig,
};
