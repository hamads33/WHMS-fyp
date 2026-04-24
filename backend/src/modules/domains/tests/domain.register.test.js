const { registerDomain } = require("../domain/core/domain.service");

(async () => {
  try {
    console.log("🧪 Testing domain registration...\n");

    const domain = await registerDomain({
      domain: "example.com",
      ownerId: "user-123",
      registrar: "mock",
      years: 1,
      // ✅ REQUIRED: Currency must be specified
      currency: "USD",
      // Optional: Admin can override pricing
      priceOverride: 12.99,
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
          name: "Admin",
          email: "admin@example.com",
          phone: "+1-555-0456",
          country: "US"
        }
      ]
    });

    console.log("✅ Domain Registration Successful!");
    console.log("\n📋 Domain Details:");
    console.log("   Name:", domain.name);
    console.log("   Owner ID:", domain.ownerId);
    console.log("   Registrar:", domain.registrar);
    console.log("   Status:", domain.status);
    console.log("   Expiry Date:", domain.expiryDate);
    console.log("   Auto Renew:", domain.autoRenew);
    console.log("   Price:", domain.registrationPrice, domain.currency);
    console.log();
  } catch (err) {
    console.error("❌ Domain Registration Failed!");
    console.error("Error:", err.message);
    process.exit(1);
  }
})();