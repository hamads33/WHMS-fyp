const prisma = require("../../../prisma");
const { registerDomain } = require("./domain/core/domain.service");

(async () => {
  try {
    console.log("🧪 Testing domain registration...\n");

    // ─────────────────────────────
    // 1️⃣ Ensure Test User Exists
    // ─────────────────────────────
    console.log("👤 Setting up test user...");

    let testUser = await prisma.user.findUnique({
      where: { email: "test-domain-user@example.com" }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: "test-domain-user@example.com",
          passwordHash: "test-password-hash-temp",
          emailVerified: true
        }
      });
      console.log("   ✔ Created new test user:", testUser.id);
    } else {
      console.log("   ✔ Using existing test user:", testUser.id);
    }

    // ─────────────────────────────
    // 2️⃣ Clean Up Previous Domain
    // ─────────────────────────────
    console.log("\n🧹 Cleaning previous test domain...");
    
    await prisma.domain.deleteMany({
      where: { name: "example.com" }
    });
    
    console.log("   ✔ Old domain removed");

    // ─────────────────────────────
    // 3️⃣ Register Domain
    // ─────────────────────────────
    console.log("\n📝 Registering domain...");

    const domain = await registerDomain({
      domain: "example.com",
      ownerId: testUser.id, // ✅ Use actual user ID from database
      registrar: "mock",
      years: 1,
      nameservers: ["ns1.test.com", "ns2.test.com"],
      // ✅ REQUIRED: Admin must select currency
      currency: "USD",
      contacts: [
        {
          type: "registrant",
          name: "John Doe",
          email: "john@example.com",
          phone: "+1-555-0123",
          country: "US"
        },
        {
          type: "admin",
          name: "Admin User",
          email: "admin@example.com",
          phone: "+1-555-0456",
          country: "US"
        }
      ]
    });

    console.log("✅ Domain registered successfully!\n");
    console.log("📋 Domain Details:");
    console.log("   ID:", domain.id);
    console.log("   Name:", domain.name);
    console.log("   Owner ID:", domain.ownerId);
    console.log("   Registrar:", domain.registrar);
    console.log("   Status:", domain.status);
    console.log("   Expiry:", domain.expiryDate);
    console.log("   Auto Renew:", domain.autoRenew);
    console.log("   Price:", domain.registrationPrice, domain.currency);
    console.log("");

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Domain Registration Failed!");
    console.error("Error:", err.message);
    console.error("\nFull Error:");
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();