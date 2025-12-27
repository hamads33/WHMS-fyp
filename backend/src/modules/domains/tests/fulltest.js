/**
 * DOMAIN MODULE – FULL INTEGRATION TEST
 * Run with: node src/modules/domains/tests/domain.full.test.js
 */
const prisma = require("../../../../prisma");
require("dotenv").config();

const {
  checkAvailability,
  registerDomain
} = require("../domain/core/domain.service");

const { adminRenewDomain } = require("../domain/core/domain.admin.service");
const { adminOverrideDomain } = require("../domain/core/domain.admin.override");
const dnsService = require("../domain/core/domain.dns.service");
const { syncDomains } = require("../jobs/domain-sync.job");

async function run() {
  console.log("\n🧪 DOMAIN MODULE TEST STARTED\n");

  // ─────────────────────────────
  // 0️⃣ Cleanup Previous Test Data
  // ─────────────────────────────
  console.log("🧹 Cleaning previous test domain...");

  await prisma.domain.deleteMany({
    where: {
      name: "available-domain-123.com"
    }
  });

  console.log("   ✔ Old test domain removed");
  console.log("🧪 TEST DATABASE:", process.env.DATABASE_URL);

  // ─────────────────────────────
  // 1️⃣ Ensure Test Client User
  // ─────────────────────────────
  console.log("\n🧑 Ensuring test client user...");

  let clientUser = await prisma.user.findUnique({
    where: { email: "testuser@example.com" }
  });

  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: {
        email: "testuser@example.com",
        passwordHash: "test-password-hash",
        emailVerified: true
      }
    });
  }

  console.log("   ✔ Client user:", clientUser.id);

  // ─────────────────────────────
  // 2️⃣ Ensure SUPERADMIN
  // ─────────────────────────────
  console.log("\n🛡️ Loading superadmin...");

  const adminUser = await prisma.user.findUnique({
    where: { email: "superadmin@example.com" }
  });

  if (!adminUser) {
    throw new Error("❌ Superadmin not found. Run prisma db seed first.");
  }

  console.log("   ✔ Superadmin:", adminUser.id);

  // ─────────────────────────────
  // 3️⃣ Availability Check
  // ─────────────────────────────
  console.log("\n1️⃣ Checking domain availability...");

  const availability = await checkAvailability({
    domain: "available-domain-123.com",
    registrar: "mock"
  });

  console.log("   ✔ Availability:", availability);

  if (!availability.available) {
    throw new Error("Test domain should be available");
  }

  // ─────────────────────────────
  // 4️⃣ Domain Registration
  // ─────────────────────────────
  console.log("\n2️⃣ Registering domain...");

  const domain = await registerDomain({
    domain: "available-domain-123.com",
    ownerId: clientUser.id,
    registrar: "mock",
    years: 1,
    currency: "USD",
    contacts: [
      {
        type: "registrant",
        name: "John Doe",
        email: "john@example.com",
        phone: "+1",
        country: "US"
      },
      {
        type: "admin",
        name: "Admin User",
        email: "admin@example.com",
        phone: "+1",
        country: "US"
      }
    ]
  });

  console.log("   ✔ Domain registered:", domain.name);

  // ─────────────────────────────
  // 5️⃣ DNS Management
  // ─────────────────────────────
  console.log("\n3️⃣ Adding DNS record...");

  const dns = await dnsService.addDNSRecord({
    domainId: domain.id,
    record: {
      type: "A",
      name: "@",
      value: "1.1.1.1",
      ttl: 300
    }
  });

  console.log("   ✔ DNS record added:", dns.id);

  // ─────────────────────────────
  // 6️⃣ Admin Manual Renewal
  // ─────────────────────────────
  console.log("\n4️⃣ Admin manual renewal...");

  const renewed = await adminRenewDomain({
    domainId: domain.id,
    adminId: adminUser.id,
    years: 1,
    callRegistrar: true,
    currency: "USD",
    priceOverride: 12
  });

  console.log("   ✔ Domain renewed. New expiry:", renewed.expiryDate);

  // ─────────────────────────────
  // 7️⃣ Admin Override
  // ─────────────────────────────
  console.log("\n5️⃣ Admin override...");

  const overridden = await adminOverrideDomain({
    domainId: domain.id,
    adminId: adminUser.id,
    changes: {
      autoRenew: false,
      status: "active"
    }
  });

  console.log("   ✔ Domain overridden. AutoRenew:", overridden.autoRenew);

  // ─────────────────────────────
  // 8️⃣ Registrar Sync Job
  // ─────────────────────────────
  console.log("\n6️⃣ Running registrar sync job...");

  await syncDomains();

  console.log("   ✔ Registrar sync completed");
  console.log("\n✅ ALL DOMAIN TESTS PASSED\n");
}

run().catch(err => {
  console.error("\n❌ DOMAIN TEST FAILED");
  console.error(err);
  process.exit(1);
});
