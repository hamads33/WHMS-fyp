const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

async function main() {
  console.log("🌱 Seeding Marketplace Test Data...");

  ////////////////////////////////////////////////
  // 0. Create Roles (client, admin, reseller, developer)
  ////////////////////////////////////////////////

  const roles = ["client", "admin", "reseller", "developer"];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✔ Roles created");

  ////////////////////////////////////////////////
  // 1. USER (Developer + Marketplace Seller)
  ////////////////////////////////////////////////

  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "dev@demo.com" },
    update: {},
    create: {
      email: "dev@demo.com",
      passwordHash,
      emailVerified: true,
    },
  });

  console.log("✔ User created:", user.id);

  ////////////////////////////////////////////////
  // Assign DEVELOPER role
  ////////////////////////////////////////////////

  const developerRole = await prisma.role.findUnique({ where: { name: "developer" } });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: developerRole.id } },
    update: {},
    create: {
      userId: user.id,
      roleId: developerRole.id,
    },
  });

  console.log("✔ Developer role assigned");

  ////////////////////////////////////////////////
  // Developer Profile → required by schema
  ////////////////////////////////////////////////

  await prisma.developerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      displayName: "Demo Developer",
      website: "https://example.com",
    },
  });

  console.log("✔ Developer Profile created");

  ////////////////////////////////////////////////
  // MarketplaceSeller (developer == seller)
  ////////////////////////////////////////////////

  const seller = await prisma.marketplaceSeller.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      storeName: "Demo Seller Store",
    },
  });

  console.log("✔ Marketplace Seller created");

  ////////////////////////////////////////////////
  // 2. CATEGORIES
  ////////////////////////////////////////////////

  await prisma.marketplaceCategory.createMany({
    data: [
      { id: "cat-tools", name: "Tools", slug: "tools" },
      { id: "cat-security", name: "Security", slug: "security" },
      { id: "cat-automation", name: "Automation", slug: "automation" },
    ],
    skipDuplicates: true,
  });

  console.log("✔ Categories created");

  ////////////////////////////////////////////////
  // 3. PRODUCT
  ////////////////////////////////////////////////

  const product = await prisma.marketplaceProduct.upsert({
    where: { id: "prod-1" },
    update: {},
    create: {
      id: "prod-1",
      sellerId: seller.id,
      title: "Demo Plugin",
      slug: "demo-plugin",
      shortDesc: "A test plugin",
      longDesc: "Full demo plugin for marketplace testing",
      categoryId: "cat-tools",
      tags: ["demo", "test"],
      status: "approved",
      screenshots: ["screen1.png"],
      ratingAvg: 4.5,
      ratingCount: 3,
      installCount: 20,
      downloadCount: 54,
    },
  });

  console.log("✔ Product created");

  ////////////////////////////////////////////////
  // 4. VERSION
  ////////////////////////////////////////////////

  const version = await prisma.marketplaceVersion.upsert({
    where: { id: "version-1" },
    update: {},
    create: {
      id: "version-1",
      productId: "prod-1",
      version: "1.0.0",
      manifestJson: { name: "demo-plugin", version: "1.0.0" },
      archivePath: "/plugins/demo-plugin.zip",
      changelog: "Initial release",
      priceCents: 0,
      currency: "USD",
    },
  });

  console.log("✔ Version created");

  ////////////////////////////////////////////////
  // 5. SUBMISSION
  ////////////////////////////////////////////////

  await prisma.marketplaceSubmission.upsert({
    where: { id: "sub-1" },
    update: {},
    create: {
      id: "sub-1",
      productId: "prod-1",
      versionId: version.id,
      status: "approved",
      reviewerId: user.id,
      notes: "Auto-approved for testing",
    },
  });

  console.log("✔ Submission created");

  ////////////////////////////////////////////////
  // 6. PURCHASE + LICENSE ACTIVATION
  ////////////////////////////////////////////////

  const purchase = await prisma.marketplacePurchase.upsert({
    where: { id: "purchase-1" },
    update: {},
    create: {
      id: "purchase-1",
      userId: user.id,
      productId: "prod-1",
      versionId: version.id,
      licenseKey: "TEST-LICENSE-KEY-123",
      activationLimit: 5,
    },
  });

  console.log("✔ Purchase created");

  await prisma.marketplaceLicenseActivation.upsert({
    where: { id: "act-1" },
    update: {},
    create: {
      id: "act-1",
      licenseId: purchase.id,
      host: "localhost",
      ip: "127.0.0.1",
      userAgent: "Mozilla",
    },
  });

  console.log("✔ License Activation created");

  ////////////////////////////////////////////////
  // 7. REVIEWS + DEPENDENCIES
  ////////////////////////////////////////////////

  await prisma.marketplaceReview.upsert({
    where: { id: "rev-1" },
    update: {},
    create: {
      id: "rev-1",
      productId: "prod-1",
      userId: user.id,
      rating: 5,
      stability: 4,
      review: "Excellent plugin!",
    },
  });

  await prisma.marketplaceDependency.upsert({
    where: { id: "dep-1" },
    update: {},
    create: {
      id: "dep-1",
      productId: "prod-1",
      dependencyId: "external-sdk",
      versionRange: "^1.0.0",
    },
  });

  console.log("✔ Dependencies created");

  console.log("\n🎉 SEEDING COMPLETE!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
