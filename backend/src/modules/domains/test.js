const { registerDomain } = require("./domain/core/domain.service");

(async () => {
  try {
    const domain = await registerDomain({
      domain: "example.com",
      ownerId: "test-user-id-123",
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

    console.log("✅ Domain registered successfully:", domain.name);
    console.log("   ID:", domain.id);
    console.log("   Status:", domain.status);
    console.log("   Expiry:", domain.expiryDate);
  } catch (err) {
    console.error("❌ Registration failed:", err.message);
    process.exit(1);
  }
})();