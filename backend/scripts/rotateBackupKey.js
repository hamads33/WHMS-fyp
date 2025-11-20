/**
 * Backup Encryption Key Rotation Script
 *
 * Steps:
 * 1. Reads all stored encrypted storage configs.
 * 2. Decrypts with OLD BACKUP_CONFIG_KEY.
 * 3. Re-encrypts with NEW_BACKUP_CONFIG_KEY.
 * 4. Updates DB.
 */

const crypto = require("crypto");
const prisma = require("../src/prisma"); // adjust path
require("dotenv").config();

const oldKey = crypto.createHash("sha256").update(process.env.BACKUP_CONFIG_KEY).digest();
const newKeyRaw = process.argv[2];

if (!newKeyRaw) {
  console.error("❌ Usage: node rotateBackupKey.js <NEW_KEY>");
  process.exit(1);
}

const newKey = crypto.createHash("sha256").update(newKeyRaw).digest();

function decrypt(enc, key) {
  const iv = Buffer.from(enc.iv, "base64");
  const tag = Buffer.from(enc.tag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let out = decipher.update(enc.data, "base64", "utf8");
  out += decipher.final("utf8");
  return JSON.parse(out);
}

function encrypt(obj, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let enc = cipher.update(JSON.stringify(obj), "utf8", "base64");
  enc += cipher.final("base64");
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: enc
  };
}

(async () => {
  console.log("🔄 Rotating all encrypted backup storage configurations...");

  const items = await prisma.backupStorageConfig.findMany();

  for (const item of items) {
    try {
      const decrypted = decrypt(item.config_json, oldKey);
      const reEncrypted = encrypt(decrypted, newKey);

      await prisma.backupStorageConfig.update({
        where: { id: item.id },
        data: { config_json: reEncrypted }
      });

      console.log(`✔ Rotated config #${item.id}`);
    } catch (e) {
      console.log(`❌ Failed to rotate config #${item.id}:`, e.message);
    }
  }

  console.log("\n🎉 Done!\n");
})();
