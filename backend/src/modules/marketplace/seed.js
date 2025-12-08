// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  /* -----------------------------------------------------
     ROLES (idempotent)
  ----------------------------------------------------- */
  const devRole = await prisma.role.upsert({
    where: { name: "developer" },
    update: {},
    create: { name: "developer", description: "Plugin developer" }
  });

  const clientRole = await prisma.role.upsert({
    where: { name: "client" },
    update: {},
    create: { name: "client", description: "Customer" }
  });

  console.log("✔ Roles ready.");

  /* -----------------------------------------------------
     USERS (idempotent)
  ----------------------------------------------------- */
  const developerUser = await prisma.user.upsert({
    where: { email: "dev@example.com" },
    update: {},
    create: {
      email: "dev@example.com",
      passwordHash: "hashed-dev-password",
    }
  });

  const buyerUser = await prisma.user.upsert({
    where: { email: "buyer@example.com" },
    update: {},
    create: {
      email: "buyer@example.com",
      passwordHash: "hashed-buyer-password",
    }
  });

  console.log("✔ Users ready.");

  /* -----------------------------------------------------
     ASSIGN ROLES (idempotent)
  ----------------------------------------------------- */
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: developerUser.id, roleId: devRole.id }},
    update: {},
    create: {
      userId: developerUser.id,
      roleId: devRole.id
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: buyerUser.id, roleId: clientRole.id }},
    update: {},
    create: {
      userId: buyerUser.id,
      roleId: clientRole.id
    }
  });

  console.log("✔ User roles assigned.");

  /* -----------------------------------------------------
     DEVELOPER PROFILE (required for sellerId FK)
  ----------------------------------------------------- */
  const developerProfile = await prisma.developerProfile.upsert({
    where: { userId: developerUser.id },
    update: {},
    create: {
      userId: developerUser.id,
      displayName: "Demo Developer",
      storeName: "DevTools Store",
      payoutsEmail: "payments@example.com",
      website: "https://example.dev",
      github: "https://github.com/example",
    }
  });

  console.log("✔ Developer profile ready:", developerProfile.id);

  /* -----------------------------------------------------
     CATEGORIES
  ----------------------------------------------------- */
  await prisma.marketplaceCategory.createMany({
    data: [
      { name: "Automation", slug: "automation" },
      { name: "Monitoring", slug: "monitoring" },
      { name: "Billing", slug: "billing" },
      { name: "Security", slug: "security" },
    ],
    skipDuplicates: true,
  });

  const automationCategory = await prisma.marketplaceCategory.findFirst({
    where: { slug: "automation" }
  });

  /* -----------------------------------------------------
     PRODUCTS
  ----------------------------------------------------- */
  const axiosPlugin = await prisma.marketplaceProduct.upsert({
    where: { slug: "axios-ping-plugin" },
    update: {},
    create: {
      sellerId: developerProfile.id, // IMPORTANT FIX
      title: "Axios Ping Plugin",
      slug: "axios-ping-plugin",
      shortDesc: "Simple axios ping test plugin",
      longDesc: "This plugin demonstrates HTTP calls.",
      categoryId: automationCategory.id,
      tags: ["axios", "network", "demo"],
      status: "approved",
    }
  });

  const wasmPlugin = await prisma.marketplaceProduct.upsert({
    where: { slug: "hash-wasm-plugin" },
    update: {},
    create: {
      sellerId: developerProfile.id,
      title: "Hash WASM Plugin",
      slug: "hash-wasm-plugin",
      shortDesc: "WASM hashing plugin",
      longDesc: "High-performance hashing engine.",
      categoryId: automationCategory.id,
      tags: ["wasm", "hash", "crypto"],
      status: "approved",
    }
  });

  console.log("✔ Products created.");

  /* -----------------------------------------------------
     VERSIONS
  ----------------------------------------------------- */
  await prisma.marketplaceVersion.upsert({
    where: { id: "axios-v1" },
    update: {},
    create: {
      id: "axios-v1",
      productId: axiosPlugin.id,
      version: "1.0.0",
      manifestJson: { name: "axios_ping", version: "1.0.0" },
      archivePath: "plugins/actions/axios_ping/1.0.0",
      priceCents: 1000,
    }
  });

  console.log("✔ Versions created.");

  console.log("🌱 Seed completed successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
