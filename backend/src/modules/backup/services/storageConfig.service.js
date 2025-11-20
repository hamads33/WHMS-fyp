const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Derive AES-256 key from BACKUP_CONFIG_KEY
function getKey() {
  const raw = process.env.BACKUP_CONFIG_KEY || "";
  return crypto.createHash("sha256").update(raw).digest();
}

/* ------------------ ENCRYPT ------------------ */
function encryptConfig(configJson) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let enc = cipher.update(JSON.stringify(configJson), "utf8", "base64");
  enc += cipher.final("base64");

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc,
  };
}

/* ------------------ DECRYPT ------------------ */
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
    console.error("❌ decryptConfig failed:", err.message);
    return null; // return null so backup.service throws readable error
  }
}

/* ------------------ DB SERVICE ------------------ */

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
  const rec = await prisma.storageConfig.findUnique({ where: { id } });
  if (!rec) return null;
  return rec;
}

async function updateStorageConfig(id, payload) {
  const encrypted = encryptConfig(payload.config);

  return prisma.storageConfig.update({
    where: { id },
    data: {
      provider: payload.provider,
      config: encrypted,
    },
  });
}

module.exports = {
  encrypt: encryptConfig,
  decrypt: decryptConfig,
  createStorageConfig,
  getStorageConfig,
  updateStorageConfig,
};
