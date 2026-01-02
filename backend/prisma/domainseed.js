const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

/**
 * Encrypt helper (AES-256-GCM)
 */
function encrypt(text) {
  const key = Buffer.from(process.env.SECRET_ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  // Store iv + tag + ciphertext together
  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

async function main() {
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
