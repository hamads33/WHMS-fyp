const { registerDomain } = require("./domain/core/domain.service");

(async () => {
  try {
    const domain = await registerDomain({
      domain: "example.com",
      ownerId: "test-user-id-123",
      registrar: "mock",
      years: 1,
      nameservers: ["ns1.test.com", "ns2.test.com"]
    });

    console.log("Domain registered:", domain);
  } catch (err) {
    console.error("Registration failed:", err.message);
  }
})();
