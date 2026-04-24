/**
 * 🌱 Seed VERIFIED CLIENT user for E2E tests
 *
 * Run:
 *   node prisma/seed.client.js
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

// --------------------------------------------------
// CONFIG
// --------------------------------------------------
const CLIENT_EMAIL = "client.test@example.com";
const CLIENT_PASSWORD = "ClientPass123!";
const SESSION_TTL_HOURS = 24;

async function main() {
  console.log("🌱 Seeding VERIFIED CLIENT...");

  // --------------------------------------------------
  // 1️⃣ Ensure CLIENT role exists
  // --------------------------------------------------
  const clientRole = await prisma.role.upsert({
    where: { name: "client" },
    update: {},
    create: {
      name: "client",
      description: "Client user",
    },
  });

  // --------------------------------------------------
  // 2️⃣ Ensure client permissions exist
  // --------------------------------------------------
  const CLIENT_PERMISSIONS = [
    "client.area.access",
    "billing.invoices.view",
    "billing.invoices.pay",
  ];

  for (const key of CLIENT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        description: `Client permission: ${key}`,
      },
    });
  }

  // --------------------------------------------------
  // 3️⃣ Assign permissions to CLIENT role
  // --------------------------------------------------
  const permissions = await prisma.permission.findMany({
    where: { key: { in: CLIENT_PERMISSIONS } },
  });

  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: clientRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: clientRole.id,
        permissionId: perm.id,
      },
    });
  }

  // --------------------------------------------------
  // 4️⃣ Create VERIFIED CLIENT user
  // --------------------------------------------------
  const passwordHash = await bcrypt.hash(CLIENT_PASSWORD, 12);

  const clientUser = await prisma.user.upsert({
    where: { email: CLIENT_EMAIL },
    update: {},
    create: {
      email: CLIENT_EMAIL,
      passwordHash,
      emailVerified: true,
      disabled: false,
    },
  });

  // --------------------------------------------------
  // 5️⃣ Assign CLIENT role → user
  // --------------------------------------------------
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: clientUser.id,
        roleId: clientRole.id,
      },
    },
    update: {},
    create: {
      userId: clientUser.id,
      roleId: clientRole.id,
    },
  });

  // --------------------------------------------------
  // 6️⃣ Create ClientProfile (SCHEMA-ACCURATE)
  // --------------------------------------------------
  await prisma.clientProfile.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      company: "Test Client Company",
    },
  });

  // --------------------------------------------------
  // 7️⃣ OPTIONAL: Create ACTIVE SESSION
  // --------------------------------------------------
  const token = crypto.randomBytes(48).toString("hex");

  await prisma.session.create({
    data: {
      token,
      userId: clientUser.id,
      expiresAt: new Date(
        Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000
      ),
      ip: "127.0.0.1",
      userAgent: "seed.client.js",
    },
  });

  console.log("✅ VERIFIED CLIENT READY");
  console.log("Email:    ", CLIENT_EMAIL);
  console.log("Password: ", CLIENT_PASSWORD);
  console.log("Session token (debug only):", token);
}

main()
  .catch((err) => {
    console.error("❌ Client seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
