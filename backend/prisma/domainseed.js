require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

/**
 * Encrypt helper (AES-256-GCM)
 */
function encrypt(text) {
  const key = process.env.SECRET_ENCRYPTION_KEY;
  if (!key) {
    console.warn("⚠️  SECRET_ENCRYPTION_KEY not configured. Storing credentials without encryption (dev mode).");
    return text;
  }

  try {
    const keyBuffer = Buffer.from(key, "hex");
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    // Store iv + tag + ciphertext together
    return Buffer.concat([iv, tag, encrypted]).toString("hex");
  } catch (err) {
    console.warn(`⚠️  Encryption failed: ${err.message}. Storing as plaintext.`);
    return text;
  }
}

async function main() {
  // Skip if no Porkbun credentials are configured
  if (!process.env.PORKBUN_API_KEY || !process.env.PORKBUN_SECRET_API_KEY) {
    console.log("ℹ️  Porkbun credentials not configured. Skipping seed.");
    console.log("    To configure Porkbun, set PORKBUN_API_KEY and PORKBUN_SECRET_API_KEY in .env");
    console.log("    For testing, use the mock registrar (registrar: 'mock').");
    return;
  }

  const encryptedKey = encrypt(process.env.PORKBUN_API_KEY);
  const encryptedSecret = encrypt(process.env.PORKBUN_SECRET_API_KEY);

  await prisma.providerConfig.upsert({
    where: { name: "porkbun" },
    update: {
      key: encryptedKey,
      secret: encryptedSecret,
      active: true
    },
    create: {
      name: "porkbun",
      key: encryptedKey,
      secret: encryptedSecret,
      active: true
    }
  });

  console.log("✅ Porkbun registrar seeded successfully");
}

main()
  .catch(e => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
