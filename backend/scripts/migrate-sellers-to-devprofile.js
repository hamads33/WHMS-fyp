const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("→ Starting backfill of MarketplaceSeller → DeveloperProfile");

  const sellers = await prisma.marketplaceSeller.findMany();
  console.log(`Found ${sellers.length} legacy sellers`);

  for (const s of sellers) {
    console.log(`Processing seller ${s.id}`);

    // 1) Ensure DeveloperProfile exists
    const dev = await prisma.developerProfile.upsert({
      where: { userId: s.userId },
      update: {
        storeName: s.storeName,
        stripeAccountId: s.stripeAccountId
      },
      create: {
        userId: s.userId,
        displayName: s.storeName,
        storeName: s.storeName,
        payoutsEmail: null,
        stripeAccountId: s.stripeAccountId
      }
    });

    // 2) Update products to point to DeveloperProfile
    await prisma.marketplaceProduct.updateMany({
      where: { sellerId: s.id },
      data: { sellerId: dev.id }
    });

    // 3) Update vendorId in webhook endpoints
    await prisma.marketplaceWebhookEndpoint.updateMany({
      where: { vendorId: s.id },
      data: { vendorId: dev.id }
    });
  }

  console.log("✓ Backfill complete");
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
