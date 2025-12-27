const { registerDomain } = require("../domain/core/domain.service");

(async () => {
  const domain = await registerDomain({
    domain: "example.com",
    ownerId: "user-123",
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
        name: "Admin",
        email: "admin@example.com",
        phone: "+1",
        country: "US"
      }
    ]
  });

  console.log(domain);
})();
