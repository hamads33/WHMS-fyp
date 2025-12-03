const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding FULL Marketplace Test Data...");

  ////////////////////////////////////////////////
  // 1. USER + SELLER
  ////////////////////////////////////////////////

  const user = await prisma.user.upsert({
    where: { email: "test@demo.com" },
    update: {},
    create: {
      email: "test@demo.com",
      username: "testuser",
      password: "password123",
      displayName: "Test User",
      provider: "local",
      role: "user"
    }
  });

  console.log("✔ User OK (ID:", user.id, ")");

  const seller = await prisma.marketplaceSeller.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      id: "seller-1",
      userId: user.id,
      storeName: "Demo Seller",
    }
  });

  console.log("✔ Seller OK");

  ////////////////////////////////////////////////
  // 2. CATEGORIES
  ////////////////////////////////////////////////

  await prisma.marketplaceCategory.createMany({
    data: [
      { id: "cat-tools", name: "Tools", slug: "tools", icon: "wrench" },
      { id: "cat-security", name: "Security", slug: "security", icon: "shield" },
      { id: "cat-automation", name: "Automation", slug: "automation", icon: "cog" }
    ],
    skipDuplicates: true
  });

  console.log("✔ Categories OK");

  ////////////////////////////////////////////////
  // 3. PRODUCT
  ////////////////////////////////////////////////

  const product = await prisma.marketplaceProduct.upsert({
    where: { id: "prod-1" },
    update: {},
    create: {
      id: "prod-1",
      sellerId: "seller-1",
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
      downloadCount: 54
    }
  });

  console.log("✔ Product OK");

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
      currency: "USD"
    }
  });

  console.log("✔ Version OK");

  ////////////////////////////////////////////////
  // 5. PURCHASE
  ////////////////////////////////////////////////

  const purchase = await prisma.marketplacePurchase.upsert({
    where: { id: "purchase-1" },
    update: {},
    create: {
      id: "purchase-1",
      userId: user.id,
      productId: "prod-1",
      versionId: "version-1",
      licenseKey: "TEST-LICENSE-KEY-123",
      subscribed: false,
      activationLimit: 5
    }
  });

  console.log("✔ Purchase OK");

  ////////////////////////////////////////////////
  // 6. LICENSE ACTIVATION
  ////////////////////////////////////////////////

  await prisma.marketplaceLicenseActivation.upsert({
    where: { id: "activation-1" },
    update: {},
    create: {
      id: "activation-1",
      licenseId: "purchase-1",
      userAgent: "Mozilla",
      host: "localhost",
      ip: "127.0.0.1"
    }
  });

  console.log("✔ License Activations OK");

  ////////////////////////////////////////////////
  // 7. REVIEWS
  ////////////////////////////////////////////////

  await prisma.marketplaceReview.upsert({
    where: { id: "review-1" },
    update: {},
    create: {
      id: "review-1",
      userId: user.id,
      productId: "prod-1",
      rating: 5,
      stability: 4,
      review: "Great plugin!"
    }
  });

  console.log("✔ Reviews OK");

  ////////////////////////////////////////////////
  // 8. DEPENDENCY
  ////////////////////////////////////////////////

  await prisma.marketplaceDependency.upsert({
    where: { id: "dep-1" },
    update: {},
    create: {
      id: "dep-1",
      productId: "prod-1",
      dependencyId: "external-sdk",
      versionRange: "^1.0.0"
    }
  });

  console.log("✔ Dependencies OK");

  ////////////////////////////////////////////////
  // 9. SUBMISSION
  ////////////////////////////////////////////////

  await prisma.marketplaceSubmission.upsert({
    where: { id: "sub-1" },
    update: {},
    create: {
      id: "sub-1",
      productId: "prod-1",
      versionId: "version-1",
      status: "approved",
      reviewerId: user.id,
      notes: "Auto approved for testing"
    }
  });

  console.log("✔ Submissions OK");

  ////////////////////////////////////////////////
  // 10. VERIFICATION
  ////////////////////////////////////////////////

  await prisma.marketplaceVerification.upsert({
    where: { id: "verify-1" },
    update: {},
    create: {
      id: "verify-1",
      productId: "prod-1",
      versionId: "version-1",
      passed: true,
      issues: []
    }
  });

  console.log("✔ Verification OK");

  ////////////////////////////////////////////////
  // 11. ANALYTICS
  ////////////////////////////////////////////////

  await prisma.marketplaceAnalytics.createMany({
    data: [
      { id: "event-1", productId: "prod-1", versionId: "version-1", eventType: "plugin.install" },
      { id: "event-2", productId: "prod-1", versionId: "version-1", eventType: "plugin.heartbeat" },
      { id: "event-3", productId: "prod-1", versionId: "version-1", eventType: "plugin.crash" }
    ],
    skipDuplicates: true
  });

  console.log("✔ Analytics OK");

  ////////////////////////////////////////////////
  // 12. ACTIVE INSTANCE
  ////////////////////////////////////////////////

  await prisma.marketplaceActiveInstance.upsert({
    where: { id: "active-1" },
    update: {},
    create: {
      id: "active-1",
      productId: "prod-1",
      versionId: "version-1",
      instanceId: "instance-123",
      userId: user.id,
      meta: { host: "localhost" }
    }
  });

  console.log("✔ Active Instance OK");

  ////////////////////////////////////////////////
  // 13. CRASHES
  ////////////////////////////////////////////////

  await prisma.marketplaceCrash.upsert({
    where: { id: "crash-1" },
    update: {},
    create: {
      id: "crash-1",
      productId: "prod-1",
      versionId: "version-1",
      userId: user.id,
      message: "Test crash",
      stackTrace: "line1\nline2"
    }
  });

  console.log("✔ Crash Logs OK");

  ////////////////////////////////////////////////
  // 14. PERF METRICS
  ////////////////////////////////////////////////

  await prisma.marketplacePerfMetric.upsert({
    where: { id: "perf-1" },
    update: {},
    create: {
      id: "perf-1",
      productId: "prod-1",
      versionId: "version-1",
      metric: "cpu_percent",
      value: 12.5
    }
  });

  console.log("✔ Perf Metrics OK");

  ////////////////////////////////////////////////
  // 15. AGGREGATE ANALYTICS
  ////////////////////////////////////////////////

  await prisma.marketplaceAnalyticsAggregate.upsert({
    where: { id: "agg-1" },
    update: {},
    create: {
      id: "agg-1",
      productId: "prod-1",
      date: new Date("2025-01-01T00:00:00Z"),
      installs: 10,
      active: 3,
      crashes: 1
    }
  });

  console.log("✔ Aggregates OK");

  ////////////////////////////////////////////////
  // 16. WEBHOOK ENDPOINT
  ////////////////////////////////////////////////

  await prisma.marketplaceWebhookEndpoint.upsert({
    where: { id: "wh-1" },
    update: {},
    create: {
      id: "wh-1",
      vendorId: "seller-1",
      url: "https://webhook.site/test",
      secret: "secret123",
      enabled: true
    }
  });

  console.log("✔ Webhook OK");

  ////////////////////////////////////////////////
  // 17. BUILD LOG
  ////////////////////////////////////////////////

  await prisma.marketplaceBuildLog.upsert({
    where: { id: "build-1" },
    update: {},
    create: {
      id: "build-1",
      submissionId: "sub-1",
      productId: "prod-1",
      versionId: "version-1",
      level: "info",
      message: "Build step completed",
      step: "verify"
    }
  });

  console.log("✔ Build Logs OK");

  console.log("\n🎉 FULL Marketplace Seed Completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
