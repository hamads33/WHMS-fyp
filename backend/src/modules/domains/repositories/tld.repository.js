const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --- REPOSITORY EXPORT ---
module.exports = {
  // Find all TLDs
  findAll: () => prisma.tld.findMany(),

  // Find TLD by name
  findByName: (name) =>
    prisma.tld.findUnique({
      where: { name },
    }),

  // REAL UPSERT (used in service)
  upsert: (data) =>
    prisma.tld.upsert({
      where: { name: data.name },
      update: {
        registerPrice: data.registerPrice,
        renewPrice: data.renewPrice,
        transferPrice: data.transferPrice,
        markupPercent: data.markupPercent,
        active: data.active,
        providerData: data.providerData,
        lastSynced: data.lastSynced,
      },
      create: {
        name: data.name,
        registerPrice: data.registerPrice ?? 0,
        renewPrice: data.renewPrice ?? 0,
        transferPrice: data.transferPrice ?? 0,
        markupPercent: data.markupPercent ?? 0,
        active: data.active ?? true,
        providerData: data.providerData ?? {},
        lastSynced: data.lastSynced ?? null,
      },
    }),

  // OPTIONAL BULK UPSERT
  upsertMany: async (rows) => {
    for (const row of rows) {
      await prisma.tld.upsert({
        where: { name: row.name },
        update: row,
        create: row,
      });
    }
  },
};
